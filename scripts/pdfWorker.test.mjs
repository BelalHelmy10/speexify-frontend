import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import nextConfig from "../next.config.mjs";
import { PHASE_PRODUCTION_BUILD } from "next/constants.js";

const require = createRequire(import.meta.url);
const workerUrl = new URL("../public/pdf.worker.min.mjs", import.meta.url);
const { version } = require("pdfjs-dist/package.json");

test("direct Next production builds generate the versioned worker", () => {
  nextConfig(PHASE_PRODUCTION_BUILD);
  assert.deepEqual(readFileSync(new URL(`../public/pdf.worker.${version}.min.mjs`, import.meta.url)),
    readFileSync(require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs")));
});

test("public PDF worker matches the installed PDF.js package", () => {
  assert.deepEqual(readFileSync(workerUrl), readFileSync(require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs")));
});

test("PDF.js loads a page using the worker served by the app", async () => {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(`../public/pdf.worker.${version}.min.mjs`, import.meta.url).href;
  const content = "0.9 g\n0 0 200 200 re f\n";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>",
    `<< /Length ${content.length} >>\nstream\n${content}endstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 5\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const task = pdfjs.getDocument({ data: new Uint8Array(Buffer.from(pdf)) });
  try {
    const document = await task.promise;
    assert.equal(document.numPages, 1);
    const page = await document.getPage(1);
    assert.ok((await page.getOperatorList()).fnArray.length > 0);
  } finally {
    await task.destroy();
  }
});
