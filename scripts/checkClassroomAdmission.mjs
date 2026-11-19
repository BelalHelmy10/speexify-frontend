// Exercise the real lobby hook and shell with a delayed admission response.
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { buildClassroomHarness } from '../tests/classroom/support/buildClassroomHarness.mjs';

const harness = buildClassroomHarness({ realLobby: true });
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
try {
  for (const [width, height] of [[390, 844], [1440, 900]]) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width, height });
    await page.setRequestInterception(true);
    page.on('request', request => request.url().startsWith('http://classroom.test/') ? request.respond({ contentType: 'text/html', body: '<!doctype html><html class="classroom-active"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="classroom-active"><div id="root"></div></body></html>' }) : request.continue());
    await page.goto('http://classroom.test/?role=learner');
    await page.addStyleTag({ content: harness.css });
    await page.addScriptTag({ content: harness.script });
    await page.waitForFunction(() => window.lobbyStatusChecks > 1);
    assert.equal(await page.$('iframe'), null, 'Waiting learners must not start a call');
    await page.evaluate(() => {
      window.testLobbyStatus = 'admitted';
      window.dispatchEvent(new Event('focus'));
    });
    await page.waitForFunction(() => window.calls?.length === 1);
    const attached = await page.evaluate(() => ({
      hostAttached: window.calls[0].options.parentNode.isConnected,
      iframeAttached: window.calls[0].getIFrame().isConnected,
      visibleCount: document.querySelectorAll('.cr-video-target iframe').length,
    }));
    assert.equal(attached.hostAttached, true, JSON.stringify(attached));
    assert.equal(attached.iframeAttached, true, JSON.stringify(attached));
    assert.equal(attached.visibleCount, 1, JSON.stringify(attached));
    await page.evaluate(() => {
      window.originalAdmissionIframe = document.querySelector('iframe');
      window.calls[0].emit('videoConferenceJoined');
    });
    await page.setViewport({ width: height, height: width });
    assert.equal(await page.evaluate(() => document.querySelector('iframe') === window.originalAdmissionIframe), true);
    assert.equal(await page.evaluate(() => window.calls.length), 1);
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: delayed lobby admission attaches a visible call; rotation keeps it mounted`);
    await page.close();
  }
} finally {
  await browser.close();
}
