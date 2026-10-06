// Exercise the real React annotation layer and Sass without authentication,
// production routes, or saving/broadcasting test annotations.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import ts from 'typescript';
import * as sass from 'sass';
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
const entry = bundle(path.join(root,'scripts/fixtures/classroomResponsiveHarness.jsx'));
const js = `const process={env:{NODE_ENV:'development'}};const modules=[${modules.join(',')}];const cache={};function require(id){if(!cache[id]){const m=cache[id]={exports:{}};modules[id](require,m,m.exports)}return cache[id].exports}require(${entry});`;

const css = sass.compile(path.join(root, 'styles/resources/_classroom.scss'), {logger:sass.Logger.silent}).css + sass.compile(path.join(root, 'styles/_responsive.scss'), {logger:sass.Logger.silent}).css;
const browser = await puppeteer.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page = await browser.newPage();
const errors = [];page.on('pageerror', e => errors.push(e.message));
try {
  await page.setContent('<html class="classroom-active"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body class="classroom-active"><div id="root"></div></body></html>');
  await page.addStyleTag({content:css});
  const moveResult = await page.evaluate(async () => {
    const before = document.createElement('div'), after = document.createElement('div');
    const host = document.createElement('div'), iframe = document.createElement('iframe');
    document.body.append(before, after); before.appendChild(host);
    iframe.srcdoc = '<body>Call frame</body>';
    let loads = 0; iframe.addEventListener('load', () => loads++);
    await new Promise(resolve => { iframe.addEventListener('load', resolve, {once:true}); host.appendChild(iframe); });
    iframe.contentWindow.connectionMarker = 'connected';
    await new Promise(resolve => { iframe.addEventListener('load', resolve, {once:true}); after.appendChild(host); });
    const result = {loads, lostConnectionState: iframe.contentWindow.connectionMarker !== 'connected'};
    before.remove(); after.remove(); return result;
  });
  assert.equal(moveResult.loads, 2);
  assert.equal(moveResult.lostConnectionState, true);
  console.log('PASS reproduced original failure mechanism: moving live iframe reloads it and loses connection state');
  await page.addScriptTag({content:js});
  for (const [width,height,mobile] of [[1440,900,false],[1024,768,false],[1180,820,false],[900,650,false],[820,1180,true],[768,1024,true],[900,1200,true],[901,1200,false],[844,390,false],[390,844,true]]) {
    await page.setUserAgent(width >= 1200
      ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
      : 'Mozilla/5.0 (Linux; Android 14; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36');
    await page.setViewport({width,height,isMobile:width < 1200,hasTouch:width < 1200});
    // Changing desktop/mobile emulation reloads Chromium's page.
    if (!await page.evaluate(() => Boolean(window.calls))) {
      await page.setContent('<html class="classroom-active"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body class="classroom-active"><div id="root"></div></body></html>');
      await page.addStyleTag({content:css});
      await page.addScriptTag({content:js});
    }
    await page.waitForFunction(m => Boolean(document.querySelector('.cr-mobile-layout')) === m, {}, mobile);
    await page.waitForFunction(() => document.querySelector('iframe')?.isConnected);
    await page.evaluate(() => window.calls.at(-1).emit('videoConferenceJoined'));
    const result = await page.evaluate(() => {
      const iframe = document.querySelector('iframe'), r = iframe.getBoundingClientRect();
      return {width:r.width,height:r.height,x:r.x,y:r.y,display:getComputedStyle(iframe).display};
    });
    console.log(`${width}x${height}: ${JSON.stringify(result)}`);
    assert.ok(result.width > 80 && result.height > 80, 'Call frame must have visible dimensions');
    assert.ok(result.x >= 0 && result.y >= 0 && result.y + result.height <= height + 1, 'Call frame must be in viewport');
    if (mobile) {
      for (const tab of ['content','chat','video']) {
        const count = await page.evaluate(() => window.calls.length);
        await page.evaluate(t => window.setTab(t), tab);
        await page.waitForFunction(t => document.querySelector(`[aria-current="page"]`)?.textContent.toLowerCase().includes(t), {}, tab);
        const pip = await page.$eval('iframe', el => { const r=el.getBoundingClientRect();return {width:r.width,height:r.height}; });
        assert.ok(pip.width > 80 && pip.height > 80, `${tab} keeps video visible`);
        assert.equal(await page.evaluate(() => window.calls.length), count, 'Tab switch must preserve call');
      }
    }
  }
  assert.deepEqual(errors, []);
  console.log('PASS tablet/phone/desktop sizes, rotation, exact breakpoint and all portrait tabs');
} finally { await browser.close(); }
