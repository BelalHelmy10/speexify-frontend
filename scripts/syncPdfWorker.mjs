import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export function syncPdfWorker() {
  const source = require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs");
  const { version } = require("pdfjs-dist/package.json");
  const worker = readFileSync(source);
  const targets = ["pdf.worker.min.mjs", `pdf.worker.${version}.min.mjs`];
  for (const name of targets) {
    const target = path.join(root, "public", name);
    let current;
    try { current = readFileSync(target); } catch { /* First install. */ }
    if (!current?.equals(worker)) {
      mkdirSync(path.dirname(target), { recursive: true });
      copyFileSync(source, target);
    }
  }
  console.log(`PDF.js worker synced (${version})`);
  return version;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) syncPdfWorker();
