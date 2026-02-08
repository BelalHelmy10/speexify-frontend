import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";

const ROOT = process.cwd();
const EN_DIR = join(ROOT, "locales", "en");
const AR_DIR = join(ROOT, "locales", "ar");

const strictMode = process.argv.includes("--strict");

function readJson(path) {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw);
}

function flattenKeys(value, prefix = "") {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  const keys = [];
  for (const key of Object.keys(value)) {
    const next = prefix ? `${prefix}.${key}` : key;
    keys.push(...flattenKeys(value[key], next));
  }

  if (keys.length === 0 && prefix) {
    return [prefix];
  }

  return keys;
}

function listJsonFiles(dir) {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort();
}

function compareKeys(label, enValue, arValue) {
  const enKeys = new Set(flattenKeys(enValue));
  const arKeys = new Set(flattenKeys(arValue));

  const missingInArabic = [];
  for (const key of enKeys) {
    if (!arKeys.has(key)) missingInArabic.push(key);
  }

  const extraInArabic = [];
  for (const key of arKeys) {
    if (!enKeys.has(key)) extraInArabic.push(key);
  }

  return {
    label,
    missingInArabic,
    extraInArabic,
  };
}

function main() {
  const enFiles = listJsonFiles(EN_DIR);
  const arFiles = listJsonFiles(AR_DIR);

  const arSet = new Set(arFiles);
  const enSet = new Set(enFiles);

  const missingArabicFiles = enFiles.filter((name) => !arSet.has(name));
  const extraArabicFiles = arFiles.filter((name) => !enSet.has(name));

  const keyDiffs = [];

  for (const filename of enFiles) {
    const enPath = join(EN_DIR, filename);
    const arPath = join(AR_DIR, filename);
    if (!existsSync(arPath)) continue;

    const enJson = readJson(enPath);
    const arJson = readJson(arPath);

    const diff = compareKeys(filename, enJson, arJson);
    if (diff.missingInArabic.length || diff.extraInArabic.length) {
      keyDiffs.push(diff);
    }
  }

  if (!missingArabicFiles.length && !extraArabicFiles.length && !keyDiffs.length) {
    console.log("Locale check passed: en/ar files and keys are aligned.");
    process.exit(0);
  }

  console.log("Locale check found differences:");

  if (missingArabicFiles.length) {
    console.log("\nMissing Arabic files:");
    for (const name of missingArabicFiles) {
      console.log(`- ${name}`);
    }
  }

  if (extraArabicFiles.length) {
    console.log("\nExtra Arabic files:");
    for (const name of extraArabicFiles) {
      console.log(`- ${name}`);
    }
  }

  for (const diff of keyDiffs) {
    console.log(`\n${basename(diff.label)}:`);

    if (diff.missingInArabic.length) {
      console.log("  Missing keys in ar:");
      for (const key of diff.missingInArabic) {
        console.log(`  - ${key}`);
      }
    }

    if (diff.extraInArabic.length) {
      console.log("  Extra keys in ar:");
      for (const key of diff.extraInArabic) {
        console.log(`  - ${key}`);
      }
    }
  }

  if (strictMode) {
    process.exit(1);
  }

  process.exit(0);
}

main();
