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
  if (rel.startsWith(shellDir) && !['ClassroomShell.jsx','ClassroomResourceWorkspace.jsx','MobileClassroomLayout.jsx','classroomHelpers.js','classroomTime.js'].includes(path.basename(file))) {
    source = 'module.exports = {__esModule:true, default: () => null};';
    if (rel.endsWith('ClassroomResourcePickerModal.jsx')) source = `const React = require('react'); module.exports = {__esModule:true, default: ({isOpen,handleChangeResourceId}) => isOpen ? React.createElement('div',{className:'test-picker'},...['a','b','c'].map(id => React.createElement('button',{key:id,onClick:()=>handleChangeResourceId(id)},'Open '+id))) : null};`;
    if (rel.endsWith('ClassroomRaiseHand.jsx')) source += 'module.exports.ClassroomRaiseHandOverlay=()=>null;module.exports.useClassroomRaiseHand = () => ({});';
    if (rel.endsWith('ClassroomCaptions.jsx')) source += 'module.exports.ClassroomCaptionsOverlay=()=>null;module.exports.useClassroomCaptions = () => ({});';
    if (rel.endsWith('ClassroomScreenShare.jsx')) source += 'module.exports.ClassroomScreenShareBanner=()=>null;module.exports.ClassroomScreenShareConfirmModal=()=>null;module.exports.useClassroomScreenShare = () => ({});';
    if (rel.endsWith('useClassroomLobby.js')) source += 'module.exports.useClassroomLobby = () => ({canJoin:true});';
  }
  if (rel === 'app/resources/prep/PrepVideoCall.jsx') source = 'module.exports={__esModule:true,default:()=>null};';
  if (rel === 'hooks/useAuth.js') source = 'module.exports={__esModule:true,default:()=>({user:{id:"test-user"}})};';
  if (rel === 'lib/api.js') source = `module.exports={__esModule:true,default:{get:async(url)=>{if(url.endsWith('/materials')) await new Promise(resolve=>setTimeout(resolve,100));return {data:url.endsWith('classroom-state') ? {state:window.testState.state} : {materials:window.testState.materials||[]}}},patch:async(url,body)=>({data:{state:body}}),put:async(url,body)=>{window.testState.saved.push(body);return {data:{}}},post:async()=>{await new Promise(resolve=>setTimeout(resolve,200));return {data:{}}}}};`;
  if (rel === 'app/resources/prep/useClassroomChannel.js') source = `const React=require('react');exports.useClassroomChannel = ()=>React.useMemo(()=>({ready:true,status:'ready',send:message=>window.testState.messages.push(message),subscribe:fn=>{window.channelSubscribers.add(fn);return ()=>window.channelSubscribers.delete(fn)}}),[]);`;
  if (rel === 'app/resources/prep/PrepShell.jsx' && !process.env.TEST_REAL_ANNOTATIONS) source = `const React=require('react');module.exports={__esModule:true,default:({resource,isActive})=>{const [comment,setComment]=React.useState('');return React.createElement('div',{'data-resource':resource._id,'data-active':isActive},React.createElement('textarea',{value:comment,'aria-label':'Comments '+resource._id,onChange:e=>setComment(e.target.value)}));}};`;

  if (['app/resources/prep/PrepBreadcrumbs.jsx','app/resources/prep/PrepInfoSidebar.jsx'].includes(rel) && process.env.TEST_REAL_ANNOTATIONS) source = 'module.exports={__esModule:true,default:()=>null};';
  if (rel === 'app/resources/prep/PrepViewerFrame.jsx' && process.env.TEST_REAL_ANNOTATIONS) source = `const React=require('react');module.exports={__esModule:true,default:({containerRef,renderAnnotationsOverlay})=>React.createElement('div',{className:'prep-viewer__canvas-container',ref:containerRef,style:{height:500,width:'100%',position:'relative'}},renderAnnotationsOverlay())};`;
  if (file.endsWith('/app/i18n.js')) source = 'exports.getDictionary = () => ({}); exports.t = (_, key) => key;';
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
const entry = bundle(path.join(root,process.env.TEST_REAL_ANNOTATIONS ? 'scripts/fixtures/classroomResourceAnnotationsHarness.jsx' : 'scripts/fixtures/classroomResourceTabsHarness.jsx'));
const js = `const process={env:{NODE_ENV:'development'}};const modules=[${modules.join(',')}];const cache={};function require(id){if(!cache[id]){const m=cache[id]={exports:{}};modules[id](require,m,m.exports)}return cache[id].exports}require(${entry});`;

const annotationCss = process.env.TEST_REAL_ANNOTATIONS ? sass.compile(path.join(root,'styles/resources.scss'),{logger:sass.Logger.silent}).css : '';
const css = annotationCss + sass.compile(path.join(root, 'styles/resources/_classroom.scss'), {logger:sass.Logger.silent}).css + sass.compile(path.join(root, 'styles/_responsive.scss'), {logger:sass.Logger.silent}).css;
const browser = await puppeteer.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page = await browser.newPage();
await page.setRequestInterception(true);
page.on('request',request=>request.respond({status:200,contentType:'text/html',body:'<div id="root"></div>'}));
const errors=[]; page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});
async function clickText(text) {
  await page.evaluate(text => { const button=[...document.querySelectorAll('button')].find(el=>el.textContent.trim()===text); if(!button) throw new Error('Missing button '+text); button.click(); },text);
}
async function open(id) {
  await page.click('[aria-label="Open resource"]'); await clickText('Open '+id);
  await page.waitForFunction(id => document.querySelector(`[data-resource="${id}"]`)?.dataset.active === 'true',{},id);
}
async function setup(width,height,role='teacher',saved=null,locale='en') {
  await page.setViewport({width,height,hasTouch:true});
  await page.goto('http://resource-tabs.test/?role='+role+'&locale='+locale);
  await page.evaluate(saved=>{sessionStorage.clear();if(saved!==null)sessionStorage.setItem('classroom_tabs_tabs-test',JSON.stringify(saved));},saved);
  await page.setContent('<html class="classroom-active"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body class="classroom-active"><div id="root"></div></body></html>');
  await page.addStyleTag({content:css});
  await page.addScriptTag({content:js});
}
try {
  if (process.env.TEST_REAL_ANNOTATIONS) {
    await page.goto('http://resource-tabs.test');
    await page.addStyleTag({content:css + '.cr-resource-workspace{height:800px}'});
    await page.addScriptTag({content:js});
    await page.waitForSelector('[role="tab"]');
    await page.click('[role="tab"][title="a"]');
    await page.keyboard.press('n');
    await page.click('.cr-resource-workspace__panel:not([hidden]) .prep-annotate-layer',{offset:{x:100,y:100}});
    await page.type('.cr-resource-workspace__panel:not([hidden]) textarea','Keep my comment');
    await page.click('[role="tab"][title="b"]');
    await page.keyboard.press('n');
    await page.click('.cr-resource-workspace__panel:not([hidden]) .prep-annotate-layer',{offset:{x:100,y:100}});
    await page.type('.cr-resource-workspace__panel:not([hidden]) textarea','Second resource');
    await page.click('[role="tab"][title="b"]');
    const modifier = await page.evaluate(()=>navigator.platform.toUpperCase().includes('MAC') ? 'Meta' : 'Control');
    await page.keyboard.down(modifier); await page.keyboard.press('z'); await page.keyboard.up(modifier);
    assert.equal(await page.$$eval('.cr-resource-workspace__panel:not([hidden]) textarea',els=>els.length),0,'Undo affects only the active resource');
    await page.click('[role="tab"][title="a"]');
    assert.equal(await page.$eval('.cr-resource-workspace__panel:not([hidden]) textarea',el=>el.value),'Keep my comment');
    await page.type('.cr-resource-workspace__panel:not([hidden]) textarea',' final edit');
    await page.click('[aria-label="Close a"]');
    const saved = await page.evaluate(()=>window.testState.saved);
    assert.ok(saved.some(body=>body.resourceId==='a' && body.payload.stickyNotes.some(note=>note.text==='Keep my comment final edit')),'Closing flushes last comment');
    await page.click('[aria-label="Open resource"]');
    await page.waitForSelector('.cr-resource-workspace__panel:not([hidden]) textarea');
    assert.equal(await page.$eval('.cr-resource-workspace__panel:not([hidden]) textarea',el=>el.value),'Keep my comment final edit','Reopening restores saved annotation');
    assert.deepEqual(errors,[]);
    console.log('PASS real PrepShell comments retained across tab switches, final edit flushed on close, saved comments restored on reopen');
    await browser.close();
    process.exit(0);
  }
  await setup(1440,900);
  await page.waitForSelector('[role="tab"]',{timeout:5000});
  await open('b'); await open('c'); await open('b');
  assert.equal(await page.$$eval('[role="tab"]',els=>els.length),3,'Opening a resource twice reuses its tab');
  await page.type('[aria-label="Comments b"]','My lesson comment');
  await page.click('[role="tab"][title="Resource A"]');
  await page.click('[role="tab"][title="Resource B"]');
  assert.equal(await page.$eval('[aria-label="Comments b"]',el=>el.value),'My lesson comment','Switching preserves per-resource comments');
  await page.click('[aria-label="Close Resource A"]');
  assert.equal(await page.$eval('[aria-selected="true"]',el=>el.title),'Resource B','Closing a background tab preserves selection');
  await page.click('[aria-label="Close Resource B"]');
  assert.equal(await page.$eval('[aria-selected="true"]',el=>el.title),'Resource C','Closing active selects neighbor');
  await page.click('[aria-label="Close Resource C"]');
  await page.waitForFunction(()=>document.querySelectorAll('[role="tab"]').length===0);
  assert.match(await page.$eval('.cr-resource-workspace',el=>el.textContent),/No resources open/);
  await new Promise(resolve=>setTimeout(resolve,250));
  assert.equal(await page.$$eval('[role="tab"]',els=>els.length),0,'Last close does not automatically reopen a resource');
  await page.evaluate(()=>document.querySelector('.cr-placeholder__action').click());
  await clickText('Open a'); await open('b');
  await page.focus('[aria-selected="true"]'); await page.keyboard.press('Home');
  assert.equal(await page.$eval('[aria-selected="true"]',el=>el.title),'Resource A','Home key selects first tab');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.$eval('[aria-selected="true"]',el=>el.title),'Resource B','Arrow key selects next tab');
  const messages = await page.evaluate(()=>window.testState.messages.filter(msg=>msg.type==='SET_RESOURCE'));
  assert.ok(messages.some(msg=>msg.resourceId===null && msg.openResourceIds.length===0),'Last close is broadcast');
  assert.equal(messages.at(-1).resourceId,'b','Quick switches broadcast latest selection immediately');
  assert.deepEqual(messages.at(-1).openResourceIds,['a','b']);
  console.log('PASS duplicate opens, retained comments, background/active/last close, reopen, keyboard, realtime tab state');
  for (const [width,height] of [[390,844],[820,1180],[844,390],[1440,900]]) {
    await page.setViewport({width,height,hasTouch:true});
    await page.waitForFunction(m=>Boolean(document.querySelector('.cr-mobile-layout'))===m,{},width<=900&&height>width);
    if (height>width && width<=900) await clickText('Content');
    const bounds = await page.$eval('.cr-resource-tabs',el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};});
    assert.ok(bounds.width>100&&bounds.height>25,'Resource tabs remain visible');
    assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1&&bounds.y+bounds.height<=height+1,'Resource tabs fit screen');
    console.log('PASS tab layout '+width+'x'+height);
  }
  await page.screenshot({path:'/tmp/classroom-resource-tabs.png'});
  await setup(1440,900,'teacher',[]);
  await page.waitForSelector('.cr-placeholder__action');
  assert.equal(await page.$$eval('[role="tab"]',els=>els.length),0,'Refreshing an empty saved workspace does not open a default resource');
  await setup(1440,900,'teacher',['a','b']);
  await page.waitForFunction(()=>document.querySelectorAll('[role="tab"]').length===2);
  await page.evaluate(()=>window.receive({type:'REQUEST_RESOURCE'}));
  await setup(1440,900,'learner');
  await page.waitForSelector('.cr-resource-workspace');
  await page.evaluate(()=>window.receive({type:'SET_RESOURCE',resourceId:'b',openResourceIds:['a','b']}));
  await page.waitForSelector('[aria-selected="true"]');
  assert.equal(await page.$eval('[aria-selected="true"]',el=>el.title),'Resource B','Learner receives teacher active resource');
  assert.equal(await page.$$eval('[role="tab"]',els=>els.length),2);
  assert.equal(await page.$$eval('.cr-resource-tabs__close',els=>els.length),0,'Shared tab closing belongs to teacher');
  await page.evaluate(()=>{
    window.testState.materials=[{_id:'upload-test',title:'Uploaded PDF',type:'pdf'}];
    window.receive({type:'SET_RESOURCE',resourceId:'b',openResourceIds:['upload-test','a','b']});
  });
  await page.waitForFunction(()=>document.querySelectorAll('[role="tab"]').length===3);
  assert.equal(await page.$eval('[aria-selected="true"]',el=>el.title),'Resource B','Loading a background upload keeps active resource');
  await page.evaluate(()=>{
    window.testState.materials.push({_id:'upload-delayed',title:'Delayed PDF',type:'pdf'});
    window.receive({type:'SET_RESOURCE',resourceId:'upload-delayed',openResourceIds:['upload-delayed','c']});
    window.receive({type:'SET_RESOURCE',resourceId:'c',openResourceIds:['upload-delayed','c']});
  });
  await page.waitForSelector('[role="tab"][title="Delayed PDF"]');
  assert.equal(await page.$eval('[aria-selected="true"]',el=>el.title),'Resource C','Delayed upload response does not undo newer selection');
  await page.evaluate(()=>window.receive({type:'SET_RESOURCE',resourceId:null,openResourceIds:[]}));
  await page.waitForFunction(()=>document.querySelectorAll('[role="tab"]').length===0);
  console.log('PASS saved workspace restoration, empty refresh and learner shared tab updates');
  await setup(390,844,'teacher',['a','b','c'],'ar');
  await page.waitForSelector('[role="tab"]');
  await clickText('Content');
  await page.waitForSelector('[aria-selected="true"]');
  assert.equal(await page.$eval('.cr-resource-workspace',el=>el.dir),'rtl');
  await page.focus('[aria-selected="true"]');
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.$eval('[aria-selected="true"]',el=>el.title),'Resource B','RTL arrow navigation follows visual direction');
  assert.ok(await page.$eval('.cr-resource-tabs__list',el=>el.scrollWidth>el.clientWidth),'Many tabs scroll horizontally on phones');
  console.log('PASS Arabic direction, RTL keyboard navigation and horizontal tab overflow');
  assert.deepEqual(errors,[]);
} finally {await browser.close();}
