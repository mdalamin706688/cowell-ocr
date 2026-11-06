import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const pdfjsRoot = path.dirname(require.resolve("pdfjs-dist/package.json"));
const src = path.join(pdfjsRoot, "build", "pdf.worker.min.mjs");
const destDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const dest = path.join(destDir, "pdf.worker.min.mjs");

if (!fs.existsSync(src)) {
  console.error(`pdf.js worker not found: ${src}`);
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log(`copied pdf.worker.min.mjs → ${path.relative(process.cwd(), dest)}`);
