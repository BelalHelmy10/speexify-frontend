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
const browser=await puppeteer.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const errors=[];
async function setup(width,height) {
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.setViewport({width,height,hasTouch:width<1400});await page.setContent('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="root"></div></body></html>');
 await page.evaluate(()=>window.testPdfFitMode='classroom');await page.addStyleTag({content:css});await page.addScriptTag({content:js});
 return page;
}
async function waitFit(page,whole=true) {
 await page.waitForFunction(whole=>{
  const panel=document.querySelector('.prep-pdf-main-inner'),canvas=document.querySelector('canvas');if(!panel||!canvas||!window.pdfNav?.numPages)return false;
  const s=getComputedStyle(panel), w=panel.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight)-2,h=panel.clientHeight-parseFloat(s.paddingTop)-parseFloat(s.paddingBottom)-2;
  const portrait=window.pdfSource.includes('portrait')||window.pdfNav.currentPage===2, pw=portrait?600:1200,ph=portrait?840:700;
  const scale=whole?Math.min(w/pw,h/ph):w/pw;
  return Math.abs(canvas.getBoundingClientRect().width-pw*scale)<2&&Math.abs(canvas.getBoundingClientRect().height-ph*scale)<2;
 },{},whole);
 if(whole) {
  const bounds=await page.evaluate(()=>{const a=document.querySelector('canvas').getBoundingClientRect(),b=document.querySelector('.prep-pdf-main-inner').getBoundingClientRect();return [a.left-b.left,a.top-b.top,b.right-a.right,b.bottom-a.bottom];});
  assert.ok(bounds.every(value=>value>=-1),'All four PDF corners must remain visible');
 }
}
try {
 const teacher=await setup(1440,900);await waitFit(teacher,false);
 for(const [width,height] of [[844,390],[1180,820],[1024,768],[390,844],[768,1024]]) {
  const learner=await setup(width,height);await waitFit(learner,true);
  await learner.evaluate(()=>window.pdfNav.goNextPage());await learner.waitForFunction(()=>window.pdfNav.currentPage===2);await waitFit(learner,true);
  await learner.evaluate(()=>window.selectPdf('portrait.pdf'));await learner.waitForFunction(()=>window.pdfSource==='portrait.pdf');await waitFit(learner,true);
  // A desktop teacher's deliberate zoom/pan maps into PDF coordinates.
  await teacher.evaluate(()=>{window.pdfNav.setPage(2);window.pdfNav.setZoomPercent(160);});
  await teacher.waitForFunction(()=>window.pdfNav.currentPage===2&&window.pdfNav.zoom===1.6);
  await teacher.waitForFunction(()=>parseFloat(document.querySelector('canvas').style.width)>900);
  await teacher.evaluate(()=>{const panel=document.querySelector('.prep-pdf-main-inner');panel.scrollTop=180;panel.scrollLeft=40;});
  const view=await teacher.evaluate(()=>window.pdfNav.getView());
  await learner.evaluate(view=>window.receiveView({type:'PDF_SCROLL',resourceId:'test-pdf',page:view.page,scrollNorm:0,view}),view);
  await learner.waitForFunction(()=>document.querySelector('.cpv-shared-window')?.clientWidth>0);
  await new Promise(resolve=>setTimeout(resolve,250));
  const mapped=await learner.evaluate(()=>{
   const windowRect=document.querySelector('.cpv-shared-window').getBoundingClientRect(),pageRect=document.querySelector('.cpv-page-wrapper').getBoundingClientRect(),panel=document.querySelector('.prep-pdf-main-inner').getBoundingClientRect();
   return {x:(windowRect.left-pageRect.left)/pageRect.width,y:(windowRect.top-pageRect.top)/pageRect.height,width:windowRect.width/pageRect.width,height:windowRect.height/pageRect.height,inside:windowRect.left>=panel.left-1&&windowRect.right<=panel.right+1&&windowRect.top>=panel.top-1&&windowRect.bottom<=panel.bottom+1};
  });
  for(const key of ['x','y','width','height'])assert.ok(Math.abs(mapped[key]-view.region[key])<.005,'Shared PDF region '+key+' must match');
  assert.ok(mapped.inside,'Shared region must fit the learner screen');
  await learner.evaluate(()=>window.receiveView({type:'PDF_SCROLL',resourceId:'test-pdf',page:2,scrollNorm:0,view:{page:2,manual:false,region:{x:0,y:0,width:1,height:1}}}));
  await waitFit(learner,true);
  console.log('PASS '+width+'x'+height+' entire pages, annotations frame, teacher zoom/pan region and Fit reset');
  await learner.close();
 }
 assert.deepEqual(errors,[]);
} catch(error){console.log(errors);throw error;}
finally{await browser.close();}
