// Run against the isolated local QA API/database only. Never target production.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";
const base = process.env.TRIAL_QA_ORIGIN || "http://127.0.0.1:3095";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
const output = process.env.TRIAL_QA_OUTPUT || "/tmp/speexify-trial-qa/screenshots";
fs.mkdirSync(output, { recursive: true });
const browser = await puppeteer.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
try {
  const page = await browser.newPage(); const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on("request", (req) => { const url = req.url(); if (url.startsWith(base) || url.startsWith("data:") || url.startsWith("blob:")) req.continue(); else req.abort(); });
  for (const locale of ["en", "ar"]) {
    await page.goto(`${base}${locale === "ar" ? "/ar" : ""}/trial-booking`, { waitUntil: "networkidle2" });
    await page.waitForSelector(".trial-time-group button");
    assert.equal(await page.$eval(".trial-page", (el) => el.dir), locale === "ar" ? "rtl" : "ltr");
    await page.select(".trial-timezone select", "Africa/Cairo");
    await page.click(".trial-time-group button"); await page.waitForSelector("#trial-name");
    for (const width of [360, 768, 1440]) {
      await page.setViewport({ width, height: 1100 });
      await page.evaluate(() => window.scrollTo(0, 0));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      if (overflow) { await page.screenshot({ path: path.join(output, `overflow-${locale}-${width}.png`), fullPage: true }); console.log(await page.evaluate(() => [...document.querySelectorAll("body *")].filter(el => el.getBoundingClientRect().right > innerWidth + 1 && el.getBoundingClientRect().width > 0).map(el => ({tag:el.tagName, cls:el.className, width:el.getBoundingClientRect().width, right:el.getBoundingClientRect().right})).slice(0,30))); }
      assert.equal(overflow, false, `${locale} overflows at ${width}`);
      await page.screenshot({ path: path.join(output, `trial-${locale}-${width}.png`), fullPage: true });
    }
  }
  await page.goto(`${base}/trial-booking`, { waitUntil: "networkidle2" }); await page.waitForSelector(".trial-time-group button");
  await page.click(".trial-time-group button");
  await page.type("#trial-name", "Browser QA learner"); await page.type("#trial-phone", `+1999${Date.now().toString().slice(-8)}`);
  await page.click('.trial-fields + button[type="submit"]');
  await page.waitForSelector(".trial-success", { timeout: 20000 });
  const management = page.url(); assert.match(management, /#manage=[a-f0-9]{64}$/);
  await page.reload({ waitUntil: "networkidle2" }); await page.waitForSelector(".trial-success");
  await page.click(".trial-manage button:first-child"); await page.waitForSelector(".trial-time-group button");
  const timeButtons = await page.$$(".trial-time-group button"); await timeButtons[1].click(); await page.click('form button[type="submit"]');
  await page.waitForSelector(".trial-success");
  await page.click(".trial-manage button:last-child"); await page.click(".trial-danger");
  await page.waitForFunction(() => document.querySelector(".trial-success h2")?.textContent.includes("cancelled"));
  await page.goto(`${base}/api/qa-login`);
  await page.goto(`${base}/admin/free-sessions`, { waitUntil: "networkidle2" }); await page.waitForSelector(".ta-booking", { timeout: 30000 });
  await page.click(".ta-booking button[aria-expanded]"); await page.waitForSelector(".ta-editor");
  await page.screenshot({ path: path.join(output, "trial-admin-bookings.png"), fullPage: true });
  await page.click(".ta-tabs button:nth-child(2)"); await page.waitForSelector(".ta-availability-grid");
  for (const width of [360, 1440]) {
    await page.setViewport({ width, height: 1100 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `admin overflow ${width}`);
    await page.screenshot({ path: path.join(output, `trial-admin-availability-${width}.png`), fullPage: false });
  }
  const date = new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10);
  await page.$eval('.ta-availability-grid form input[type="date"]', (el, value) => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; setter.call(el, value); el.dispatchEvent(new Event("input", { bubbles: true })); }, date);
  await page.$eval('.ta-availability-grid form input[type="time"]', (el) => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; setter.call(el, "21:15"); el.dispatchEvent(new Event("input", { bubbles: true })); });
  await page.$$eval('.ta-availability-grid form input[type="time"]', (els) => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; setter.call(els[1], "22:15"); els[1].dispatchEvent(new Event("input", { bubbles: true })); });
  await page.click('.ta-availability-grid form button[type="submit"]');
  await page.waitForSelector(".ta-notice");
  assert.equal(await page.$eval(".ta-notice", (el) => el.textContent), "Availability updated.");
  await page.click('.ta-slot button[aria-expanded]'); await page.waitForSelector('.ta-slot-wrap .ta-editor');
  const moveDate = new Date(Date.now() + 13 * 86400000).toISOString().slice(0, 10);
  const setInput = async (selector, value) => page.$eval(selector, (el, next) => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; setter.call(el, next); el.dispatchEvent(new Event("input", { bubbles: true })); }, value);
  await setInput('.ta-slot-wrap .ta-editor input[type="date"]', moveDate);
  await setInput('.ta-slot-wrap .ta-editor input[type="time"]', "06:15");
  await setInput('.ta-slot-wrap .ta-editor input[type="number"]', "45");
  const acknowledgment = await page.$('.ta-slot-wrap .ta-checkbox input'); if (acknowledgment) await acknowledgment.click();
  await page.click('.ta-slot-wrap .ta-editor button[type="submit"]');
  await page.waitForFunction(() => !document.querySelector('.ta-slot-wrap .ta-editor'));
  assert.ok(await page.$$eval('.ta-slot small', (els) => els.some((el) => el.textContent.includes('45 minutes'))));
  await page.goto(`${base}/ar/admin/free-sessions?tab=availability`, { waitUntil: "networkidle2" }); await page.waitForSelector(".ta-availability-grid");
  assert.equal(await page.$eval(".trial-admin", (el) => el.dir), "rtl");
  await page.setViewport({ width: 360, height: 1100 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  await page.screenshot({ path: path.join(output, "trial-admin-ar-360.png"), fullPage: false });
  assert.deepEqual(errors, []);
  console.log("PASS: English/Arabic layouts at 360/768/1440px, guest booking, reload recovery, reschedule, cancel, admin access, add times, slot day/time/duration editing, and Arabic admin.");
} finally { await browser.close(); }
