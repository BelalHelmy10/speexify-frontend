// Exercise the real React annotation layer and Sass without authentication,
// production routes, or saving/broadcasting test annotations.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import ts from 'typescript';
import sass from 'sass';
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
  if (!file.includes('node_modules')) source = ts.transpileModule(source, {
    fileName:file,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}
  }).outputText;
  source = source.replace(/require\(["']([^"']+)["']\)/g, (_,name) => {
    let resolved;
    try { resolved = req.resolve(name); }
    catch { resolved = req.resolve(`${name}.jsx`); }
    return `require(${bundle(resolved)})`;
  });
  modules[id] = `function(require,module,exports){${source}\n}`;
  return id;
}
const entry = bundle(path.join(root,'scripts/fixtures/textEditorHarness.jsx'));
const js = `const process={env:{NODE_ENV:'development'}};const modules=[${modules.join(',')}];const cache={};function require(id){if(!cache[id]){const m=cache[id]={exports:{}};modules[id](require,m,m.exports)}return cache[id].exports}require(${entry});`;
const css = sass.compile(path.join(root,'styles/resources/_pdf-viewer.scss'),{logger:sass.Logger.silent}).css;
const browser = await puppeteer.launch({headless:true,executablePath:process.env.PUPPETEER_EXECUTABLE_PATH || (fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined)});
const page = await browser.newPage();
const errors = [];
page.on('pageerror',e=>errors.push(e.message));
await page.setViewport({width:1500,height:1200});
await page.setContent('<div id="root"></div>');
await page.addStyleTag({content:css});
await page.addScriptTag({content:js});
await page.waitForFunction(()=>window.configure);
const settle = () => page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));

// Locate a real rendered character in the colored text, not a synthetic
// textarea mirror used only by the test. Then click it with a real mouse.
async function character(offset, selector='.prep-text-box__rich-preview') {
  return page.evaluate(({offset,selector})=>{
    const el=document.querySelector(selector);
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
    let node;let remaining=offset;
    while((node=walker.nextNode())) {
      if(remaining<node.length) break;
      remaining-=node.length;
    }
    if(!node) throw new Error(`Missing character ${offset}`);
    const range=document.createRange();range.setStart(node,remaining);range.setEnd(node,remaining+1);
    const r=range.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};
  },{offset,selector});
}
async function configure(text, extras={}) {
  await page.evaluate(({text,extras})=>window.configure({scale:extras.scale||1,editing:extras.editing!==false,isPdf:extras.isPdf,tool:extras.tool,
    box:{id:'qa',x:0.5,y:0.5,page:1,width:extras.width||420,height:extras.height,fontSize:extras.fontSize||22,autoWidth:extras.autoWidth||false,color:'#123456',text,
      colorRuns:[{start:0,end:20,color:'#a52233'},{start:20,end:text.length,color:'#123456'}]}}),{text,extras});
  await settle();
}
async function scrollToCharacter(offset) {
  const r=await character(offset);
  await page.evaluate(r=>{const t=document.querySelector('textarea');const b=t.getBoundingClientRect();t.scrollTop+=r.top-b.top-45;t.scrollLeft+=r.left-b.left-70;},r);
  await settle();
  const sync=await page.evaluate(()=>{const t=document.querySelector('textarea'),m=document.querySelector('.prep-text-box__rich-preview');return {top:t.scrollTop-m.scrollTop,left:t.scrollLeft-m.scrollLeft,width:t.clientWidth-m.clientWidth};});
  assert.deepEqual(sync,{top:0,left:0,width:0},'Visible text must track native scrolling');
}
try {
  const long = 'Precise editing keeps every word in the right place. '.repeat(70);
  const cases=[
    ['wrapped',long,800,{}],
    ['large-font PDF',long,820,{fontSize:38,scale:1.25,width:620,isPdf:true}],
    ['zoomed-out',long,1200,{scale:0.65,width:330}],
    ['resized-height',long,1500,{height:150,width:420}],
    ['wide single-line','abcdefghij '.repeat(80),520,{autoWidth:true,width:460}],
    ['manual newlines','First line\nSecond line\n'+'Another line of text\n'.repeat(60),500,{autoWidth:true,width:470}],
    ['Arabic','ممارسة اللغة العربية مع المدرب كل يوم تساعد على التقدم. '.repeat(60),650,{width:420}],
    ['select tool',long,900,{height:200,tool:'select'}],
  ];
  for(const [name,text,offset,extra] of cases) {
    await configure(text,extra);await scrollToCharacter(offset);
    const r=await character(offset);const rtl=name==='Arabic';
    await page.mouse.click(rtl?r.right-0.3:r.left+0.3,(r.top+r.bottom)/2);
    const actual=await page.$eval('textarea',t=>t.selectionStart);
    assert.equal(actual,offset,`${name}: clicking visible character must select its actual index`);
    await page.keyboard.type('#');
    assert.equal(await page.$eval('textarea',t=>t.value),text.slice(0,offset)+'#'+text.slice(offset),`${name}: insertion location`);
    console.log(`PASS ${name}: scroll, click and insertion`);
  }
  await configure(long,{height:200});await scrollToCharacter(800);
  const a=await character(800),b=await character(812);
  await page.mouse.move(a.left+0.3,(a.top+a.bottom)/2);await page.mouse.down();
  await page.mouse.move(b.left+0.3,(b.top+b.bottom)/2,{steps:12});await page.mouse.up();
  assert.deepEqual(await page.$eval('textarea',t=>[t.selectionStart,t.selectionEnd]),[800,812]);
  await page.keyboard.press('Backspace');
  assert.equal(await page.$eval('textarea',t=>t.value),long.slice(0,800)+long.slice(812));
  console.log('PASS drag selection and deletion');
  for(const text of ['A short line','First\nSecond\n',long]) {
    await configure(text,{editing:false});
    const before=await character(5,'.prep-text-box__label');
    await page.mouse.click(before.left+0.3,(before.top+before.bottom)/2,{clickCount:2});await settle();
    const after=await character(5);
    assert.ok(Math.abs(before.left-after.left)<1 && Math.abs(before.top-after.top)<1,'Entering edit mode must not move the text');
    assert.equal(await page.$eval('textarea',t=>t.selectionStart),5,'Double-click preserves pointer position');
  }
  console.log('PASS edit-mode geometry and caret transfer');
  assert.equal(await page.evaluate(()=>window.boardMouseDowns),0,'Text selection must not start a board gesture');
  assert.deepEqual(errors,[]);
} finally {await browser.close();}
