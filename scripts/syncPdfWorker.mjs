import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs");
const target = path.join(root, "public/pdf.worker.min.mjs");
const worker = readFileSync(source);
let current;
try { current = readFileSync(target); } catch { /* First install. */ }
if (!current?.equals(worker)) {
  mkdirSync(path.dirname(target), { recursive: true });
  copyFileSync(source, target);
}
const { version } = require("pdfjs-dist/package.json");
console.log(`PDF.js worker synced (${version})`);
