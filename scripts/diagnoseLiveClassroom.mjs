// Opt-in diagnostic: isolated room, synthetic camera/microphone, no customer session.
// Run: node scripts/diagnoseLiveClassroom.mjs [p2p|bridge|relay]
import fs from 'node:fs/promises';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import puppeteer from 'puppeteer';

const mode = process.argv[2] || 'p2p';
if (!['p2p', 'bridge', 'relay'].includes(mode)) throw new Error('Unknown diagnostic mode');
const configSource = await fs.readFile(new URL('../lib/jitsiConfig.js', import.meta.url), 'utf8');
const { JITSI_DOMAIN, buildJitsiOptions } = await import(`data:text/javascript;base64,${Buffer.from(configSource).toString('base64')}`);
const monitorSource = await fs.readFile(new URL('../lib/classroomConnectionMonitor.mjs', import.meta.url), 'utf8');
const roomId = `diagnostic-${randomUUID()}`;
const server = http.createServer((_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.end('<!doctype html><html><body style="margin:0"><div id="call" style="width:900px;height:700px"></div></body></html>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
  });
  const pages = [];
  for (let index = 0; index < 2; index++) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width: 1000, height: 800 });
    await page.evaluateOnNewDocument(({ forceRelay, tlsOnly }) => {
      const Original = window.RTCPeerConnection;
      window.diagnosticPeers = [];
      window.RTCPeerConnection = class extends Original {
        constructor(config, ...args) {
          const selected = tlsOnly ? {
            ...config,
            iceServers: (config?.iceServers || []).flatMap(server => {
              const urls = [server.urls].flat().filter(url => String(url).startsWith('turns:'));
              return urls.length ? [{ ...server, urls }] : [];
            }),
          } : config;
          super(forceRelay ? { ...selected, iceTransportPolicy: 'relay' } : selected, ...args);
          window.diagnosticPeers.push(this);
        }
      };
    }, { forceRelay: mode === 'relay', tlsOnly: process.env.DIAGNOSTIC_TURN_TLS_ONLY === '1' });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.addScriptTag({ url: `https://${JITSI_DOMAIN}/external_api.js` });
    await page.addScriptTag({ content: monitorSource.replace('export function', 'function') });
    const options = buildJitsiOptions({ roomId, userName: `Synthetic diagnostic ${index + 1}`, isTeacher: index === 0, startWithAudioMuted: false });
    if (mode !== 'p2p') options.configOverwrite.p2p = { enabled: false };
    await page.evaluate(({ domain, options }) => {
      window.diagnosticEvents = [];
      window.diagnosticApi = new window.JitsiMeetExternalAPI(domain, { ...options, parentNode: document.getElementById('call') });
      window.diagnosticStates = [];
      window.diagnosticFailures = [];
      window.stopDiagnosticMonitor = window.monitorClassroomConnection(window.diagnosticApi, {
        onStateChange: state => window.diagnosticStates.push(state),
        onTransportReady: () => {},
        onUnavailable: failure => window.diagnosticFailures.push(failure),
      });
      window.diagnosticApi.addListener('videoConferenceJoined', () => {
        setTimeout(() => window.diagnosticApi.executeCommand('setTileView', true), 900);
      });
      for (const name of ['videoConferenceJoined', 'participantJoined', 'participantLeft', 'errorOccurred', 'peerConnectionFailure', 'cameraError', 'micError', 'dataChannelOpened', 'dataChannelClosed', 'p2pStatusChanged']) {
        window.diagnosticApi.addListener(name, event => window.diagnosticEvents.push({ name, at: Date.now(), event }));
      }
    }, { domain: JITSI_DOMAIN, options });
    pages.push(page);
  }
  console.log(JSON.stringify({ mode, roomId, started: new Date().toISOString() }));
  let finalClients = [];
  for (let tick = 0; tick < 6; tick++) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    const clients = [];
    for (const page of pages) {
      const events = await page.evaluate(() => window.diagnosticEvents);
      const monitoring = await page.evaluate(() => ({ states: window.diagnosticStates, failures: window.diagnosticFailures }));
      const frame = page.frames().find(frame => frame.url().startsWith(`https://${JITSI_DOMAIN}/`));
      const media = frame ? await frame.evaluate(async () => {
        const peers = [];
        for (const pc of window.diagnosticPeers || []) {
          const stats = await pc.getStats();
          const inbound = [];
          const pairs = [];
          for (const stat of stats.values()) {
            if (stat.type === 'inbound-rtp') inbound.push({ kind: stat.kind, bytesReceived: stat.bytesReceived, packetsReceived: stat.packetsReceived, framesDecoded: stat.framesDecoded });
            if (stat.type === 'candidate-pair' && stat.nominated) {
              const local = stats.get(stat.localCandidateId);
              const remote = stats.get(stat.remoteCandidateId);
              pairs.push({ state: stat.state, local: local?.candidateType, remote: remote?.candidateType, protocol: local?.protocol, relayProtocol: local?.relayProtocol });
            }
          }
          peers.push({ connection: pc.connectionState, ice: pc.iceConnectionState, servers: pc.getConfiguration().iceServers?.map(({ urls }) => urls), inbound, pairs });
        }
        return { peers, videos: [...document.querySelectorAll('video')].map(video => {
          const bounds = video.getBoundingClientRect();
          return { id: video.id, width: video.videoWidth, height: video.videoHeight, time: video.currentTime, paused: video.paused, readyState: video.readyState, renderedWidth: bounds.width, renderedHeight: bounds.height };
        }), text: document.body.innerText.slice(-1500) };
      }).catch(error => ({ error: error.message })) : null;
      clients.push({ events, monitoring, media });
    }
    console.log(JSON.stringify({ mode, seconds: (tick + 1) * 5, clients }));
    finalClients = clients;
  }
  const mediaReceived = finalClients.every(client =>
    client.media?.peers?.some(peer => peer.inbound.some(stat => stat.kind === 'video' && stat.framesDecoded > 0)) &&
    client.media?.peers?.some(peer => peer.inbound.some(stat => stat.kind === 'audio' && stat.bytesReceived > 0)));
  const relayUsed = finalClients.every(client => client.media?.peers?.some(peer => peer.pairs.some(pair => pair.local === 'relay')));
  const passed = mediaReceived && (mode !== 'relay' || relayUsed);
  console.log(JSON.stringify({ result: { mode, passed, mediaReceived, relayUsed, monitors: finalClients.map(client => client.monitoring) } }));
  if (!passed) process.exitCode = 1;
} finally {
  if (browser) {
    // Dispose calls before closing Chromium so pending conference teardown
    // cannot leave synthetic participants or a browser process behind.
    const pages = await browser.pages();
    await Promise.allSettled(pages.map(page => page.evaluate(() => {
      window.stopDiagnosticMonitor?.();
      window.diagnosticApi?.dispose();
    })));
    await Promise.allSettled(pages.map(page => page.close()));
    await browser.close();
  }
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
