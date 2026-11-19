// Opt-in live media test: actual classroom shell and lobby, isolated room,
// synthetic camera/microphone. No production account or customer session.
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { buildClassroomHarness } from '../tests/classroom/support/buildClassroomHarness.mjs';

const harness = buildClassroomHarness({ realLobby: true, liveVideo: true });
const roomName = `speexify-admission-diagnostic-${randomUUID()}`;
const server = http.createServer((_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.end('<!doctype html><html class="classroom-active"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="classroom-active"><div id="root"></div></body></html>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const pages = [];
  for (const role of ['teacher', 'learner']) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport(role === 'learner' ? { width: 390, height: 844 } : { width: 1440, height: 900 });
    await page.evaluateOnNewDocument(() => {
      const Original = window.RTCPeerConnection;
      window.admissionPeers = [];
      window.RTCPeerConnection = class extends Original {
        constructor(...args) { super(...args); window.admissionPeers.push(this); }
      };
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/?role=${role}`);
    await page.addScriptTag({ url: 'https://meet.speexify.com/external_api.js' });
    await page.evaluate(room => {
      const ActualAPI = window.JitsiMeetExternalAPI;
      window.liveEvents = [];
      window.LiveJitsiAPI = class extends ActualAPI {
        constructor(domain, options) {
          super(domain, { ...options, roomName: room });
          this.options = options;
          window.calls.push(this);
          for (const name of ['videoConferenceJoined', 'participantJoined', 'dataChannelOpened', 'errorOccurred', 'cameraError', 'micError']) this.addListener(name, event => window.liveEvents.push({ name, event }));
        }
      };
    }, roomName);
    await page.addStyleTag({ content: harness.css });
    await page.addScriptTag({ content: harness.script });
    if (role === 'learner') {
      await page.waitForFunction(() => window.lobbyStatusChecks > 1);
      assert.equal(await page.$('iframe'), null);
      await page.evaluate(() => { window.testLobbyStatus = 'admitted'; window.dispatchEvent(new Event('focus')); });
    }
    await page.waitForFunction(() => document.querySelector('.cr-video-target iframe')?.isConnected);
    await page.waitForFunction(() => window.liveEvents.some(event => event.name === 'videoConferenceJoined'), { timeout: 45000 });
    // Production starts muted; deliberately unmute the synthetic input to
    // verify received audio as well as decoded remote video.
    await page.evaluate(async () => { if (await window.calls[0].isAudioMuted()) window.calls[0].executeCommand('toggleAudio'); });
    pages.push(page);
  }
  let lastResult;
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    lastResult = [];
    for (const page of pages) {
      const frame = page.frames().find(frame => frame.url().startsWith('https://meet.speexify.com/'));
      const media = frame ? await frame.evaluate(async () => {
        const inbound = [];
        for (const peer of window.admissionPeers || []) for (const stat of (await peer.getStats()).values()) {
          if (stat.type === 'inbound-rtp') inbound.push({ kind: stat.kind, bytes: stat.bytesReceived, frames: stat.framesDecoded });
        }
        return { inbound, videos: [...document.querySelectorAll('video')].map(video => ({ width: video.videoWidth, height: video.videoHeight, playing: !video.paused })) };
      }) : null;
      lastResult.push({ ...(await page.evaluate(() => ({ events: window.liveEvents, attached: document.querySelector('iframe')?.isConnected, state: document.querySelector('.cr-header__pill-signal')?.getAttribute('aria-label') }))), media });
    }
    if (lastResult.every(result => result.attached && result.media?.inbound.some(stat => stat.kind === 'audio' && stat.bytes > 0) && result.media?.inbound.some(stat => stat.kind === 'video' && stat.frames > 0))) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log(JSON.stringify({ roomName, clients: lastResult }, null, 2));
  assert.ok(lastResult.every(result => result.attached && result.media?.inbound.some(stat => stat.kind === 'audio' && stat.bytes > 0) && result.media?.inbound.some(stat => stat.kind === 'video' && stat.frames > 0)), 'Both admitted classroom clients must receive real audio and video');
  console.log('PASS actual classroom shell: desktop teacher and phone-sized learner exchange audio/video after lobby admission');
} finally {
  if (browser) {
    const pages = await browser.pages();
    await Promise.allSettled(pages.map(page => page.evaluate(() => window.calls?.forEach(call => call.dispose()))));
    await Promise.allSettled(pages.map(page => page.close()));
    await browser.close();
  }
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
