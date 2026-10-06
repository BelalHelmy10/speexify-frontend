// Exercise the real React annotation layer and Sass without authentication,
// production routes, or saving/broadcasting test annotations.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import ts from 'typescript';
import puppeteer from 'puppeteer';

const root = path.resolve(import.meta.dirname, '..');
const modules = [];
const ids = new Map();
function bundle(file) {
  if (ids.has(file)) return ids.get(file);
  const id = modules.length;
  ids.set(file,id); modules.push('');
  const req = createRequire(file);
  let source = fs.readFileSync(file,'utf8');
  if (file.endsWith('/app/i18n.js')) source = 'exports.getDictionary = () => ({}); exports.t = (_, key) => key;';
  if (file.endsWith('.json')) source = 'module.exports = ' + source;

  if (!file.includes('node_modules')) source = ts.transpileModule(source, {
    fileName:file.endsWith('.mjs') ? file.replace(/\.mjs$/,'.js') : file,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}
  }).outputText;
  source = source.replace(/require\(["']([^"']+)["']\)/g, (_,name) => {
    let resolved;
    if (name.startsWith('@/')) {
      resolved = path.join(root, name.slice(2));
      if (!fs.existsSync(resolved)) resolved += '.js';
      return `require(${bundle(resolved)})`;
    }
    try { resolved = req.resolve(name); }
    catch { resolved = req.resolve(`${name}.jsx`); }
    return `require(${bundle(resolved)})`;
  });
  modules[id] = `function(require,module,exports){${source}\n}`;
  return id;
}
const entry = bundle(path.join(root,'scripts/fixtures/classroomCallHarness.jsx'));
const js = `const process={env:{NODE_ENV:'development'}};const modules=[${modules.join(',')}];const cache={};function require(id){if(!cache[id]){const m=cache[id]={exports:{}};modules[id](require,m,m.exports)}return cache[id].exports}require(${entry});`;

const browser = await puppeteer.launch({headless:true,executablePath:process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.setContent('<div id="root"></div><div id="portrait"></div><div id="split"></div>');
  await page.addStyleTag({content: '.cr-video{height:300px;width:400px}.cr-video__loading,.cr-video__error{position:absolute;z-index:10}iframe{height:100%;width:100%}'});
  await page.addScriptTag({content:js});
  await page.waitForFunction(() => window.calls?.length === 1);
  assert.ok(await page.$('.cr-video__loading'), 'Loading stays visible before conference join');
  assert.match(await page.$eval('.cr-header__pill-signal', e => e.getAttribute('aria-label')), /connecting/);
  await page.evaluate(() => window.calls.at(-1).emit('videoConferenceJoined'));
  await page.waitForFunction(() => !document.querySelector('.cr-video__loading'));
  assert.match(await page.$eval('.cr-header__pill-signal', e => e.getAttribute('aria-label')), /connected/);
  console.log('PASS join confirmation controls loading and header status');

  await page.evaluate(() => window.calls.at(-1).emit('peerConnectionFailure'));
  await page.waitForSelector('.cr-video__error');
  assert.match(await page.$eval('.cr-header__pill-signal', e => e.getAttribute('aria-label')), /failed/);
  await page.click('.cr-video__retry');
  await page.waitForFunction(() => window.calls.length === 2);
  assert.equal(await page.evaluate(() => window.calls[0].disposed), true);
  await page.evaluate(() => window.calls.at(-1).emit('videoConferenceJoined'));
  await page.waitForFunction(() => !document.querySelector('.cr-video__error'));
  console.log('PASS connection failure, disposal and retry without page reload');

  await page.evaluate(() => window.rotate());
  await page.waitForFunction(() => window.calls.length === 3);
  assert.equal(await page.evaluate(() => window.calls[1].disposed), true);
  assert.equal(await page.evaluate(() => window.calls[2].iframe.isConnected), true);
  await page.evaluate(() => window.calls.at(-1).emit('videoConferenceJoined'));
  await page.waitForFunction(() => !document.querySelector('.cr-video__loading'));
  console.log('PASS layout rotation creates a fresh call in the attached host');

  await page.evaluate(() => {
    const original = window.setTimeout;
    window.setTimeout = (fn, ms, ...args) => original(fn, ms === 30000 || ms === 15000 ? 150 : ms, ...args);
    window.calls.at(-1).emit('videoConferenceLeft');
  });
  await page.waitForSelector('.cr-video__retry');
  await page.click('.cr-video__retry');
  await page.waitForFunction(() => document.querySelector('.cr-video__error')?.textContent.includes('classroom_video_error_timeout'));
  assert.equal(await page.evaluate(() => window.calls.at(-1).disposed), true);
  await page.evaluate(() => window.calls.at(-1).emit('videoConferenceJoined'));
  assert.ok(await page.$('.cr-video__error'), 'Late join must not erase timeout failure');
  console.log('PASS stalled join times out and ignores late join events');

  await page.setRequestInterception(true);
  let failScript = true;
  page.on('request', req => {
    if (!req.url().includes('external_api.js')) return req.continue();
    return failScript ? req.abort() : req.respond({contentType:'application/javascript', body:'window.JitsiMeetExternalAPI = window.MockCall;'});
  });
  await page.evaluate(() => { delete window.JitsiMeetExternalAPI; });
  await page.click('.cr-video__retry');
  await page.waitForFunction(() => document.querySelector('.cr-video__error')?.textContent.includes('classroom_video_error_generic'));
  assert.equal(await page.$('#jitsi-external-api'), null, 'Failed script is removed for retry');
  failScript = false;
  const count = await page.evaluate(() => window.calls.length);
  await page.click('.cr-video__retry');
  await page.waitForFunction(n => window.calls.length === n + 1, {}, count);
  await page.evaluate(() => window.calls.at(-1).emit('videoConferenceJoined'));
  await page.waitForFunction(() => !document.querySelector('.cr-video__error') && !document.querySelector('.cr-video__loading'));
  console.log('PASS script loading failure can recover through Retry');
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
