import assert from 'node:assert/strict';
import fs from 'node:fs';
import puppeteer from 'puppeteer';

// Isolated browser with mocked API: never creates users or submissions in the live database.
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'], executablePath: fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined });
const page = await browser.newPage();
const base = process.env.ASSESSMENT_QA_BASE_URL || 'http://localhost:3000';
let saved = null;
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.setRequestInterception(true);
page.on('request', async request => {
  const url = new URL(request.url());
  if (!url.pathname.startsWith('/api/')) return request.continue();
  let body = {};
  if (url.pathname.endsWith('/auth/me')) body = { user: { id: 987654321, name: 'Placement QA', role: 'learner', email: 'qa@example.test' } };
  if (url.pathname.endsWith('/csrf-token')) body = { csrfToken: 'qa-only' };
  if (url.pathname.endsWith('/me/assessment')) {
    if (request.method() === 'POST') {
      const payload = JSON.parse(request.postData());
      assert.equal(payload.score, undefined);
      assert.equal(payload.cefr, undefined);
      saved = { id: 999, status: 'awaiting_review', ...payload, reviewMeta: { ...payload.reviewMeta, placementResult: { status: 'awaiting_review', band: null, sectionScores: {language: 50, reading: 50, listening: 50} } } };
      body = {ok: true, submission: saved};
    } else body = saved;
  }
  await request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
const button = async (text) => {
  await page.waitForFunction(label => [...document.querySelectorAll('button')].some(el => el.textContent.trim() === label), { timeout: 30000 }, text);
  const buttons = await page.$$('button');
  for (const item of buttons) if ((await item.evaluate(el => el.textContent)).trim() === text) { await item.click(); return; }
  throw new Error('Missing button: ' + text);
};
const stage = async (index) => {
  const selector = `.placement-stepper button:nth-child(${index + 1})`;
  await page.waitForFunction(s => { const el = document.querySelector(s); return el && !el.disabled; }, {}, selector);
  await page.click(selector);
  await page.waitForFunction(s => document.querySelector(s)?.getAttribute('aria-current') === 'step', {}, selector);
};
const reload = async () => { await page.goto(base + '/assessment', { waitUntil: 'networkidle2' }); };
try {
  await page.setCookie({name:'speexify.sid',value:'isolated-qa-cookie',url:base});
  await reload();
  await page.waitForSelector('.placement-gate--welcome', {timeout:60000});
  await button('Begin assessment');
  assert.equal(await page.$$eval('.placement-question', a => a.length), 4);
  await page.click('input[name="c1"][value="1"]');
  await button('Next questions');
  assert.ok(await page.$('input[name="c5"]'));
  await stage(3);
  await button('Record response');
  await page.waitForFunction(() => document.querySelector('.placement-timer strong')?.textContent === '0:02');
  await button('Stop recording');
  await page.waitForSelector('.placement-recording-preview audio');
  await page.waitForFunction(() => !document.querySelector('.placement-timer .placement-secondary-button')?.disabled);
  await button('Save and exit');
  await reload();
  await button('Continue my assessment');
  await page.waitForSelector('.placement-recording-preview audio');
  assert.equal(await page.$eval('.placement-recording-preview audio', el => el.src.startsWith('blob:')), true);
  await button('Record again');
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(el => el.textContent === 'Stop recording'));
  await page.waitForFunction(() => document.querySelector('.placement-timer strong')?.textContent === '0:02');
  await button('Reset');
  await page.waitForFunction(() => !document.querySelector('.placement-recording-preview'));
  await page.click('.placement-live-option input');
  await stage(2);
  await page.click('.placement-audio-button');
  await page.waitForFunction(() => document.querySelector('.placement-audio-button')?.textContent.includes('Pause'));
  await page.waitForFunction(() => document.querySelector('.placement-listening audio')?.currentTime > 1);
  await page.click('.placement-audio-button');
  assert.ok((await page.$eval('.placement-audio-button', e => e.textContent)).includes('Resume'));
  await button('Save and exit');
  await reload();
  await button('Continue my assessment');
  assert.ok((await page.$eval('.placement-audio-button', e => e.textContent)).includes('Resume'));
  // Seed complete answers to exercise final submission, without solving or publishing a test.
  const seed = await page.evaluateOnNewDocument(() => {
    const key='speexifyPlacementDraft_v1:987654321';
    const draft=JSON.parse(localStorage.getItem(key));
    draft.coreAnswers=Object.fromEntries(Array.from({length:24},(_,i)=>['c'+(i+1),0]));
    draft.readingAnswers=Object.fromEntries([1,2,3].flatMap(p=>[1,2,3,4].map(q=>[`r${p}q${q}`,0])));
    draft.listeningAnswers=Object.fromEntries([1,2,3].flatMap(p=>[1,2,3].map(q=>[`l${p}q${q}`,0])));
    draft.writing=Array(150).fill('practice').join(' ');
    draft.speakingMode='live'; draft.activeSection=4;
    localStorage.setItem(key, JSON.stringify(draft));
  });
  await reload(); await page.removeScriptToEvaluateOnNewDocument(seed.identifier); await button('Continue my assessment');
  assert.equal(await page.$eval('[role="progressbar"]', e=>e.getAttribute('aria-valuenow')), '100');
  for (const width of [390, 768, 1440]) {
    await page.setViewport({width,height:950});
    for (let i=0;i<5;i++) {
      await stage(i);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth + 2), `overflow at ${width} stage ${i}`);
    }
  }
  await page.screenshot({path:'/tmp/speexify-assessment-writing.png',fullPage:true});
  await page.setViewport({width:390,height:844});
  await stage(0);
  await page.screenshot({path:'/tmp/speexify-assessment-mobile.png',fullPage:true});
  await page.setViewport({width:1440,height:950});
  await stage(3);
  await button('Record response');
  await page.waitForFunction(() => document.querySelector('.placement-timer strong')?.textContent === '0:31', {timeout:40000});
  await button('Stop recording');
  await page.waitForFunction(() => !document.querySelector('.placement-timer .placement-secondary-button')?.disabled);
  await stage(4);
  await button('Submit for coach review');
  await page.waitForSelector('.placement-result--final');
  assert.equal(saved.reviewMeta.speaking.mode, 'recording');
  assert.ok(saved.reviewMeta.speaking.audioDataUrl.startsWith('data:audio/'));
  assert.ok(saved.reviewMeta.speaking.seconds >= 30);
  assert.equal(await page.evaluate(()=>localStorage.getItem('speexifyPlacementDraft_v1:987654321')), null);
  saved.status='reviewed'; saved.cefr='B1'; saved.feedback='Clear organization. Practise explaining your reasons.';
  await reload();
  await page.waitForSelector('.placement-result--final');
  assert.equal(await page.$eval('.placement-result strong',el=>el.textContent),'B1');
  assert.deepEqual(errors, []);
  console.log('Assessment QA passed: pagination, recording/re-record/reset, audio draft reload, listening pause/resume, progress, 3 viewport widths, submission and coach-reviewed result. API mocked; no production data written.');
} catch (error) {
  await page.screenshot({path:'/tmp/speexify-assessment-failure.png',fullPage:true});
  console.error((await page.$eval('body', e=>e.innerText)).slice(-3000));
  throw error;
} finally { await browser.close(); }
