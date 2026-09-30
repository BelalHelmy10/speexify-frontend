import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";

const root = process.cwd();
const asset = (name) => path.join(root, name);
const outfit = await readFile(asset("assets/fonts/Outfit-latin.woff2"));
const inter = await readFile(asset("assets/fonts/Inter-latin.woff2"));
const hero = await readFile(asset("public/images/home-hero-clean.webp"));
const output = asset("public/speexify-share-coral-v2.png");
const macChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><style>
@font-face { font-family: Outfit; src: url(data:font/woff2;base64,${outfit.toString("base64")}); font-weight: 100 900; }
@font-face { font-family: Inter; src: url(data:font/woff2;base64,${inter.toString("base64")}); font-weight: 100 900; }
* { box-sizing: border-box; }
html, body { width: 1200px; height: 630px; margin: 0; overflow: hidden; }
.card { position: relative; width: 1200px; height: 630px; overflow: hidden; background: #fefcfa; color: #0d1b2a;
  background-image: radial-gradient(ellipse 75% 75% at 0% 47%, rgba(242,92,46,.10), transparent 56%),
    linear-gradient(180deg, #f5f0ea 0%, #fefcfa 100%); }
.grid { position: absolute; inset: 0; opacity: .9; background-image:
  repeating-linear-gradient(0deg, transparent 0 48px, rgba(13,27,42,.04) 49px 50px),
  repeating-linear-gradient(90deg, transparent 0 48px, rgba(13,27,42,.04) 49px 50px);
  mask-image: linear-gradient(to bottom, black, transparent 90%); }
.badge { position: absolute; top: 53px; left: 70px; height: 41px; padding: 0 19px; display: flex; align-items: center;
  border: 1px solid rgba(242,92,46,.28); border-radius: 24px; background: #fdf0eb;
  color: #d94b1f; font: 700 18px Inter, sans-serif; letter-spacing: -.01em; }
.headline { position: absolute; left: 70px; top: 159px; margin: 0; font-family: Outfit, sans-serif;
  font-weight: 900; letter-spacing: -.045em; line-height: .97; }
.headline .navy { display: block; font-size: 100px; white-space: nowrap; }
.headline .coral { display: block; width: max-content; margin-top: 7px; font-size: 79px; color: #f25c2e;
  white-space: nowrap; border-bottom: 5px solid #f25c2e; padding-bottom: 9px; }
.sub { position: absolute; left: 73px; top: 423px; width: 625px; margin: 0; color: #46586a;
  font: 500 27px/1.42 Inter, sans-serif; letter-spacing: -.018em; }
.brand { position: absolute; left: 70px; bottom: 43px; display: flex; align-items: center; gap: 12px;
  color: #0d1b2a; font: 800 27px Outfit, sans-serif; }
.mark { width: 44px; height: 44px; border-radius: 9px; overflow: hidden; }
.photo { position: absolute; left: 753px; top: 105px; width: 408px; height: 455px; border-radius: 28px;
  object-fit: cover; object-position: 48% 48%; box-shadow: 0 21px 45px rgba(13,27,42,.13); }
.photo-badge { position: absolute; left: 773px; top: 126px; padding: 12px 20px; border-radius: 30px;
  background: #fff; box-shadow: 0 8px 24px rgba(13,27,42,.08); color: #0d1b2a;
  font: 700 18px Outfit, sans-serif; }
</style></head><body><main class="card">
  <div class="grid"></div>
  <div class="badge">A practice ground. Not a course.</div>
  <h1 class="headline"><span class="navy">Speak it.</span><span class="coral">Don't study it.</span></h1>
  <p class="sub">Live English speaking coaching.<br/>Real conversations, with a coach.</p>
  <div class="brand"><svg class="mark" viewBox="0 0 512 512" aria-hidden="true"><rect width="512" height="512" rx="100" fill="#0d1b2a"/><path d="M256 80 C440 80,440 256,256 256 C72 256,72 432,256 432" stroke="#f25c2e" stroke-width="90" stroke-linecap="round" fill="none"/></svg>Speexify</div>
  <img class="photo" src="data:image/webp;base64,${hero.toString("base64")}" alt=""/>
  <div class="photo-badge">Live, with a coach</div>
</main></body></html>`;

const browser = await puppeteer.launch({
  headless: true,
  ...(process.env.CHROME_PATH || existsSync(macChrome)
    ? { executablePath: process.env.CHROME_PATH || macChrome }
    : {}),
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await document.querySelector(".photo").decode();
  });
  await writeFile(output, await page.screenshot({ type: "png" }));
  console.log(`Wrote ${output}`);
} finally {
  await browser.close();
}
