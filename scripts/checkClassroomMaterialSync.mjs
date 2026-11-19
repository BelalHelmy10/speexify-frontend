import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { buildClassroomHarness } from '../tests/classroom/support/buildClassroomHarness.mjs';

// Real classroom, PrepShell, PDF viewport and receiver code; PDF rendering and
// transport are isolated so this never joins or writes to a production session.
const { script, css } = buildClassroomHarness({ realPrep: true });
const browser = await puppeteer.launch({ headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const errors = [];
const peers = new Set();
async function setup(role, width, height, initialState) {
  const page = await browser.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width, height, hasTouch: width < 1400 });
  await page.setRequestInterception(true);
  page.on('request', request => request.respond({ status: 200, contentType: 'text/html', body: '<div id="root"></div>' }));
  await page.goto(`http://classroom.test/?role=${role}`);
  await page.setContent('<html class="classroom-active"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="classroom-active"><div id="root"></div></body></html>');
  await page.addStyleTag({ content: css });
  await page.evaluate(state => {window.testInitialClassroomState=state;},initialState);
  peers.add(page);
  await page.exposeFunction('onClassroomSend', message => Promise.all([...peers].filter(peer => peer !== page).map(peer => peer.evaluate(message => window.receive?.(message), message))));
  await page.addScriptTag({ content: script });
  await page.waitForSelector('.cpv-page-canvas');
  if (width < 900 && height > width) {
    await page.evaluate(() => [...document.querySelectorAll('.cr-mobile-tabs__tab')].find(el => el.textContent.includes('Content'))?.click());
  }
  await page.waitForFunction(() => document.querySelector('.cpv-page-canvas')?.clientHeight > 10, {polling:100});
  await page.waitForSelector('.cpv-nav__zoom-slider');
  return page;
}
async function scroll(page, top) {
  await page.bringToFront();
  await page.evaluate(top => {window.testState.messages.length=0;document.querySelector('.prep-pdf-main-inner').scrollTop=top;},top);
  await page.waitForFunction(() => window.testState.messages.some(message => message.type === 'PDF_SCROLL'), {polling:100});
  return page.evaluate(() => window.testState.messages.filter(message => message.type === 'PDF_SCROLL').at(-1));
}
async function assertRegion(page, expected) {
  await page.bringToFront();
  await page.waitForFunction(region => {
    const crop=document.querySelector('.cpv-shared-window')?.getBoundingClientRect();
    const pdf=document.querySelector('.cpv-page-wrapper')?.getBoundingClientRect();
    if(!crop||!pdf||!pdf.width||!pdf.height)return false;
    const actual={x:(crop.left-pdf.left)/pdf.width,y:(crop.top-pdf.top)/pdf.height,width:crop.width/pdf.width,height:crop.height/pdf.height};
    return ['x','y','width','height'].every(key=>Math.abs(actual[key]-region[key])<.006);
  },{polling:100},expected);
}
try {
  const teacher = await setup('teacher',1440,900);
  await teacher.$eval('.cpv-nav__zoom-slider', el => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'163');
    el.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await teacher.waitForFunction(()=>document.querySelector('.cpv-page-canvas').clientHeight>1200,{polling:100});
  await teacher.click('.prep-pdf-sidebar__page-button:last-child');
  await teacher.waitForFunction(()=>document.querySelector('.cpv-nav__pages-current').textContent==='2',{polling:100});
  const published = await scroll(teacher,350);
  assert.equal(published.page,2);
  assert.ok(published.view.region.y>.05);
  // A learner joining after the scroll requests the current view, even before
  // its own PDF has finished loading. An older saved snapshot must not win.
  for(const [width,height] of [[390,844],[1180,820],[1440,900]]) {
    const learner=await setup('learner',width,height,{resourceId:'a',openResourceIds:['a'],pdfScroll:{...published,view:{...published.view,region:{...published.view.region,y:0}}}});
    await learner.waitForFunction(()=>document.querySelector('.cpv-nav__pages-current').textContent==='2',{polling:100});
    await assertRegion(learner,published.view.region);
    const next=await scroll(teacher,500);
    await assertRegion(learner,next.view.region);
    const back=await scroll(teacher,350);
    await assertRegion(learner,back.view.region);
    peers.delete(learner);await learner.close();
    console.log(`PASS ${width}x${height}: late join and live trainer scroll follow the same PDF region`);
  }
  peers.delete(teacher);await teacher.close();
  const restored=await setup('teacher',1440,900,{resourceId:'a',openResourceIds:['a','b'],pdfScroll:published});
  await restored.waitForFunction(()=>document.querySelector('.prep-pdf-main-inner').scrollTop>100,{polling:100});
  assert.equal(await restored.$eval('.cpv-nav__pages-current',el=>el.textContent),'2');
  assert.equal(await restored.$('.cpv-shared-window'),null,'Trainer restoration must keep the full page scrollable');
  const learner=await setup('learner',390,844);
  const next=await scroll(restored,500);
  await assertRegion(learner,next.view.region);
  console.log('PASS restored trainer keeps scrolling and broadcasting to the learner');
  await restored.bringToFront();
  await restored.evaluate(()=>{window.testState.messages.length=0;});
  await restored.click('.cr-resource-tabs__add');
  await restored.evaluate(()=>[...document.querySelectorAll('.test-picker button')].find(el=>el.textContent==='Open b').click());
  await learner.waitForFunction(()=>[...document.querySelectorAll('.cr-resource-tabs [role="tab"]')].some(el=>el.textContent.includes('Resource B')&&el.getAttribute('aria-selected')==='true'),{polling:100});
  await restored.evaluate(()=>[...document.querySelectorAll('.cr-resource-tabs [role="tab"]')].find(el=>el.textContent.includes('Resource A')).click());
  await assertRegion(learner,next.view.region);
  console.log('PASS reopening a material catches the learner up to the trainer');
  assert.deepEqual(errors,[]);
} finally { await browser.close(); }
