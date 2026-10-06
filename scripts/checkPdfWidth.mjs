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
  if (file.endsWith('/legacy/build/pdf.min.mjs')) source = `
exports.GlobalWorkerOptions = {}; exports.version = 'test';
exports.getDocument = ({url}) => ({destroy:async()=>{},promise:Promise.resolve({
  numPages:2,destroy:async()=>{},getPage:async(number)=>({
    getViewport:({scale})=>{const dims=url.includes('portrait')?[600,840]:number===1?[1200,700]:[600,840];return {width:dims[0]*scale,height:dims[1]*scale};},
    render:()=>({promise:Promise.resolve(),cancel:()=>{}})
  })
})});`;
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
const entry = bundle(path.join(root,'scripts/fixtures/pdfWidthHarness.jsx'));
const js = `const process={env:{NODE_ENV:'development'}};const modules=[${modules.join(',')}];const cache={};function require(id){if(!cache[id]){const m=cache[id]={exports:{}};modules[id](require,m,m.exports)}return cache[id].exports}require(${entry});`;
const css = sass.compile(path.join(root,'styles/resources.scss'),{logger:sass.Logger.silent}).css;
const browser = await puppeteer.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page = await browser.newPage();
const errors=[]; page.on('pageerror',error=>errors.push(error.message));
async function fitted() {
  await page.waitForFunction(()=>{
    const panel=document.querySelector('.prep-pdf-main-inner'),canvas=document.querySelector('.cpv-page-canvas');
    if(!panel||!canvas)return false;
    const s=getComputedStyle(panel);
    const rect=canvas.getBoundingClientRect();
    const ratio=window.pdfSource.includes('portrait')||window.pdfNav?.currentPage===2 ? 840/600 : 700/1200;
    return Math.abs(rect.width-(panel.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight)-2))<2 && Math.abs(rect.height-rect.width*ratio)<2;
  });
  const bounds=await page.evaluate(()=>{
    const panel=document.querySelector('.prep-pdf-main-inner'),canvas=document.querySelector('.cpv-page-canvas'),overlay=document.querySelector('.prep-pdf-overlay'),marker=document.querySelector('[data-test-annotation]');
    return {canvas:canvas.getBoundingClientRect().width,overlay:overlay.getBoundingClientRect().width,marker:marker.getBoundingClientRect().width,overflow:panel.scrollWidth-panel.clientWidth};
  });
  assert.ok(bounds.overflow<=1,'Fitted PDF must not overflow horizontally');
  assert.ok(Math.abs(bounds.canvas-bounds.overlay)<1,'Annotations must share the PDF width');
  assert.ok(Math.abs(bounds.marker-bounds.canvas*.05)<1,'Annotation coordinates must stay proportional');
}
try {
  for(const [width,height] of [[1440,900],[820,1180],[844,390],[390,844]]) {
    await page.setViewport({width,height});
    await page.goto('about:blank');
    await page.setContent('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="root"></div></body></html>');
    await page.addStyleTag({content:css}); await page.addScriptTag({content:js});
    await fitted();
    await page.evaluate(()=>window.pdfNav.goNextPage()); await fitted();
    await page.waitForFunction(()=>window.pdfNav.currentPage===2);
    await page.evaluate(()=>window.selectPdf('portrait.pdf'));
    // Let the file-change reset commit before checking the replacement canvas.
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await fitted();
    await page.setViewport({width:Math.max(320,width-100),height}); await fitted();
    await page.evaluate(()=>window.pdfNav.setZoomPercent(50));
    await page.waitForFunction(()=>window.pdfNav.zoom===.5);
    await page.evaluate(()=>window.pdfNav.zoomFit()); await fitted();
    console.log(`PASS fit width, mixed page dimensions, resource switch, resize, annotation alignment and manual Fit at ${width}x${height}`);
  }
  assert.deepEqual(errors,[]);
} catch (error) {
  console.log(await page.evaluate(()=>({source:window.pdfSource,zoom:window.pdfNav?.zoom,panel:document.querySelector('.prep-pdf-main-inner')?.clientWidth,canvas:document.querySelector('canvas')?.style.cssText})));
  await page.screenshot({path:'/tmp/speexify-pdf-width-failure.png'});
  throw error;
} finally {await browser.close();}
