import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const STYLES_DIR = path.join(ROOT, "styles");

const IGNORE_FILE_RE = [
  /\/resources-backup\.scss$/,
  /\/resources\/_tokens\.scss$/,
  /\/resources\/_mixins\.scss$/,
  /\/resources\/_animations\.scss$/,
];

function shouldIgnoreFile(filePath) {
  if (IGNORE_FILE_RE.some((re) => re.test(filePath))) {
    return true;
  }

  const base = path.basename(filePath);
  return base.startsWith("_");
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return walk(abs);
      }
      return abs;
    })
  );

  return files.flat();
}

function collectTopLevelClasses(scss) {
  const classes = new Set();
  const lines = scss.split(/\r?\n/);

  for (const line of lines) {
    // Only inspect top-level selectors that start the line (no indentation).
    if (line.startsWith(" ") || line.startsWith("\t")) {
      continue;
    }

    const m = line.match(/^\.([a-zA-Z_][a-zA-Z0-9_-]*)\b/);
    if (m) {
      classes.add(m[1]);
    }
  }

  return classes;
}

async function main() {
  const allFiles = (await walk(STYLES_DIR)).filter((f) => f.endsWith(".scss"));
  const targetFiles = allFiles.filter((f) => !shouldIgnoreFile(f));

  const classToFiles = new Map();

  for (const abs of targetFiles) {
    const raw = await fs.readFile(abs, "utf8");
    const classes = collectTopLevelClasses(raw);

    for (const cls of classes) {
      if (!classToFiles.has(cls)) {
        classToFiles.set(cls, new Set());
      }
      classToFiles.get(cls).add(abs);
    }
  }

  const duplicates = [];
  for (const [cls, files] of classToFiles.entries()) {
    if (files.size > 1) {
      duplicates.push({ cls, files: [...files].sort() });
    }
  }

  if (duplicates.length === 0) {
    console.log("Style isolation check passed: no duplicated top-level classes in scoped files.");
    return;
  }

  console.error("Style isolation check failed. Duplicated top-level classes found:\n");
  for (const item of duplicates.sort((a, b) => a.cls.localeCompare(b.cls))) {
    console.error(`.${item.cls}`);
    for (const f of item.files) {
      console.error(`  - ${path.relative(ROOT, f)}`);
    }
    console.error("");
  }

  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
