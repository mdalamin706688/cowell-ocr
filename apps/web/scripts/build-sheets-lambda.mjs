/**
 * Bundles the Sheets export Lambda handler into a single .mjs for a
 * Lambda Function URL (Node 20+ runtime).
 *
 *   npm run build:sheets-lambda
 *   → apps/web/dist/sheets-export/index.mjs
 *
 * Deploy: create a Node 20 Lambda with a public Function URL (AuthType NONE —
 * the handler verifies the Cognito access token itself when COGNITO_* env is
 * set), upload index.mjs, set env vars — see docs/GOOGLE_SHEETS.md.
 */
import { build } from "esbuild";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

await build({
  entryPoints: [join(root, "lambda/sheets-export/index.ts")],
  outfile: join(root, "dist/sheets-export/index.mjs"),
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  sourcemap: false,
  logLevel: "info",
});

console.log("✓ dist/sheets-export/index.mjs");
