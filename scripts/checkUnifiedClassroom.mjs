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
  const rel = path.relative(root, file);
  const shellDir = 'app/classroom/[sessionId]/';
  if (rel.startsWith(shellDir) && !['ClassroomShell.jsx','ClassroomResourceWorkspace.jsx','MobileClassroomLayout.jsx','classroomHelpers.js','classroomTime.js','ClassroomControlBar.jsx','ClassroomHeaderBar.jsx','ClassroomHostMenu.jsx'].includes(path.basename(file))) {
    source = 'module.exports = {__esModule:true, default: () => null};';
    if (rel.endsWith('ClassroomResourcePickerModal.jsx')) source = `const React = require('react'); module.exports = {__esModule:true, default: ({isOpen,handleChangeResourceId}) => isOpen ? React.createElement('div',{className:'test-picker'},...['a','b','c'].map(id => React.createElement('button',{key:id,onClick:()=>handleChangeResourceId(id)},'Open '+id))) : null};`;
    if (rel.endsWith('ClassroomRaiseHand.jsx')) source += 'module.exports.ClassroomRaiseHandButton=()=>null;module.exports.ClassroomRaiseHandOverlay=()=>null;module.exports.useClassroomRaiseHand = () => ({});';
    if (rel.endsWith('ClassroomCaptions.jsx')) source += 'module.exports.ClassroomCaptionsButton=()=>null;module.exports.ClassroomCaptionsOverlay=()=>null;module.exports.useClassroomCaptions = () => ({});';
    if (rel.endsWith('ClassroomScreenShare.jsx')) source += 'module.exports.ClassroomScreenShareButton=()=>null;module.exports.ClassroomScreenShareBanner=()=>null;module.exports.ClassroomScreenShareConfirmModal=()=>null;module.exports.useClassroomScreenShare = () => ({});';
    if (rel.endsWith('useClassroomLobby.js')) source += 'module.exports.useClassroomLobby = () => ({canJoin:true});';
  }

  if (rel === 'hooks/useAuth.js') source = 'module.exports={__esModule:true,default:()=>({user:{id:"test-user"}})};';
  if (rel === 'lib/api.js') source = `module.exports={__esModule:true,default:{get:async(url)=>{if(url.endsWith('/materials')) await new Promise(resolve=>setTimeout(resolve,100));return {data:url.endsWith('classroom-state') ? {state:window.testState.state} : {materials:window.testState.materials||[]}}},patch:async(url,body)=>({data:{state:body.state}}),put:async(url,body)=>{window.testState.saved.push(body);return {data:{}}},post:async()=>{await new Promise(resolve=>setTimeout(resolve,200));return {data:{}}}}};`;
  if (rel === 'app/resources/prep/useClassroomChannel.js') source = `const React=require('react');exports.useClassroomChannel = ()=>React.useMemo(()=>({ready:true,status:'ready',send:message=>window.testState.messages.push(message),subscribe:fn=>{window.channelSubscribers.add(fn);return ()=>window.channelSubscribers.delete(fn)}}),[]);`;
  if (rel === 'app/resources/prep/PrepShell.jsx' && !process.env.TEST_CLASSROOM_PDF) source = `const React=require('react');module.exports={__esModule:true,default:({resource,isActive})=>{const [comment,setComment]=React.useState('');return React.createElement('div',{'data-resource':resource._id,'data-active':isActive},React.createElement('textarea',{value:comment,'aria-label':'Comments '+resource._id,onChange:e=>setComment(e.target.value)}));}};`;

  if (['app/resources/prep/PrepBreadcrumbs.jsx','app/resources/prep/PrepInfoSidebar.jsx'].includes(rel) && (process.env.TEST_REAL_ANNOTATIONS || process.env.TEST_CLASSROOM_PDF)) source = 'module.exports={__esModule:true,default:()=>null};';
  if (rel === 'app/resources/prep/PrepViewerFrame.jsx' && process.env.TEST_REAL_ANNOTATIONS && !process.env.TEST_CLASSROOM_PDF) source = `const React=require('react');module.exports={__esModule:true,default:({containerRef,renderAnnotationsOverlay})=>React.createElement('div',{className:'prep-viewer__canvas-container',ref:containerRef,style:{height:500,width:'100%',position:'relative'}},renderAnnotationsOverlay())};`;
  if (file.endsWith('/legacy/build/pdf.min.mjs')) source = `
exports.GlobalWorkerOptions={};exports.version='test';exports.getDocument=()=>({destroy:async()=>{},promise:Promise.resolve({numPages:2,destroy:async()=>{},getPage:async(number)=>({getViewport:({scale})=>({width:600*scale,height:840*scale}),render:()=>({promise:Promise.resolve(),cancel:()=>{}})})})});`;
  if (file.endsWith('/app/i18n.js')) source = 'const dict={};exports.getDictionary = () => dict; exports.t = (_, key) => key;';
  if (file.endsWith('.json')) source = 'module.exports = ' + source;

  if (!file.includes('node_modules')) source = ts.transpileModule(source, {
    fileName:file.endsWith('.mjs') ? file.replace(/\.mjs$/,'.js') : file,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}
  }).outputText;
  source = source.replace(/require\(["']([^"']+)["']\)/g, (_,name) => {
    let resolved;
    if (name.startsWith('@/')) {
      resolved = path.join(root, name.slice(2));
      if (!fs.existsSync(resolved)) resolved = ['.js','.jsx','.mjs'].map(ext=>resolved+ext).find(candidate=>fs.existsSync(candidate));
      return `require(${bundle(resolved)})`;
    }
    try { resolved = req.resolve(name); }
    catch { resolved = req.resolve(`${name}.jsx`); }
    return `require(${bundle(resolved)})`;
  });
  modules[id] = `function(require,module,exports){${source}\n}`;
  return id;
}
const entry=bundle(path.join(root,'scripts/fixtures/unifiedClassroomHarness.jsx'));
const js=`const process={env:{NODE_ENV:'development'}};const modules=[${modules.join(',')}];const cache={};function require(id){if(!cache[id]){const m=cache[id]={exports:{}};modules[id](require,m,m.exports)}return cache[id].exports}require(${entry});`;
const css=sass.compile(path.join(root,'styles/resources.scss'),{logger:sass.Logger.silent}).css;
const browser=await puppeteer.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.setRequestInterception(true);
page.on('request',r=>r.respond({status:200,contentType:'text/html',body:'<div id="root"></div>'}));
try {
 for(const role of ['teacher','learner']) {
  await page.setViewport({width:844,height:390,hasTouch:true});
  await page.goto('http://classroom.test/?role='+role);
  await page.setContent('<html class="classroom-active"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="classroom-active"><div id="root"></div></body></html>');
  await page.addStyleTag({content:css});await page.addScriptTag({content:js});
  await page.waitForSelector('iframe');
  await page.evaluate(()=>window.calls.at(-1).emit('videoConferenceJoined'));
  const count=await page.evaluate(()=>window.calls.length);
  await page.evaluate(()=>{window.originalIframe=document.querySelector('iframe');window.originalIframe.contentWindow.connectionMarker='connected';});
  for(const [width,height] of [[844,390],[390,844],[820,1180],[1180,820],[1024,768],[1440,900]]) {
   await page.setViewport({width,height,hasTouch:true});
   await page.waitForFunction(portrait=>Boolean(document.querySelector('.cr-main--portrait'))===portrait,{},width<=900&&height>width);
   if(width<=900&&height>width) {
    await page.evaluate(()=>[...document.querySelectorAll('.cr-mobile-tabs__tab')].find(b=>b.textContent.includes('Content'))?.click());
   }
   await new Promise(r=>setTimeout(r,220));
   const layout=await page.evaluate(()=>{
    const iframe=document.querySelector('iframe'), left=document.querySelector('.cr-panel--left').getBoundingClientRect(),right=document.querySelector('.cr-panel--right').getBoundingClientRect(),call=iframe.getBoundingClientRect();
    return {same:iframe===window.originalIframe,marker:iframe.contentWindow.connectionMarker,calls:window.calls.length,call:{w:call.width,h:call.height},split:right.left>=left.right-2,overflow:document.documentElement.scrollWidth>innerWidth+1};
   });
   assert.equal(layout.same,true,'Rotation must preserve the actual iframe');
   assert.equal(layout.marker,'connected','Rotation must preserve the iframe browsing context');
   assert.equal(layout.calls,count,'Rotation must not reconnect the call');
   assert.ok(layout.call.w>40&&layout.call.h>40,'Video must have visible dimensions');
   assert.equal(layout.overflow,false,'Classroom must fit the screen');
   if(height<width)assert.equal(layout.split,true,'Landscape keeps video left and lesson right');
   if(process.env.TEST_CLASSROOM_PDF && width<1400) {
    await page.waitForFunction(()=>{
      const c=document.querySelector('.cpv-page-canvas')?.getBoundingClientRect(),p=document.querySelector('.prep-pdf-main-inner')?.getBoundingClientRect();
      return c&&p&&c.width>30&&c.height>30&&c.left>=p.left-1&&c.right<=p.right+1&&c.top>=p.top-1&&c.bottom<=p.bottom+1;
    });
    if(height>width) {
     const overlap=await page.evaluate(()=>{const c=document.querySelector('.cpv-page-canvas').getBoundingClientRect(),v=document.querySelector('.cr-panel--left').getBoundingClientRect();return c.bottom>v.top&&c.right>v.left&&c.top<v.bottom&&c.left<v.right;});
     assert.equal(overlap,false,'Portrait video preview must not cover the PDF');
    }
    await page.click('.prep-toolbar-dropdown__trigger.prep-toolbar-dropdown__trigger--more');
    const menu=await page.$eval('.prep-toolbar-dropdown__menu--more',el=>{const r=el.getBoundingClientRect();return {bottom:r.bottom,right:r.right,height:r.height,scroll:el.scrollHeight>el.clientHeight};});
    assert.ok(menu.bottom<=height+1&&menu.right<=width+1,'Annotation tools must remain inside the screen');
    await page.click('.prep-toolbar-dropdown__trigger.prep-toolbar-dropdown__trigger--more');
   }
   console.log('PASS '+role+' '+width+'x'+height+' stable call and layout');
  }
 }
 assert.deepEqual(errors,[]);
 await page.screenshot({path:'/tmp/speexify-unified-classroom-qa.png'});
} catch(e){console.log(await page.evaluate(()=>({canvas:document.querySelector('.cpv-page-canvas')?.getBoundingClientRect().toJSON(),panel:document.querySelector('.prep-pdf-main-inner')?.getBoundingClientRect().toJSON()})));await page.screenshot({path:'/tmp/speexify-unified-classroom-failure.png'});console.log(errors);throw e;}
finally{await browser.close();}
