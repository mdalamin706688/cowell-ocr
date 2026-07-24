#!/usr/bin/env node
/**
 * Static export for AWS S3 + CloudFront (domain root, no /cowell-ocr basePath).
 * Same UI preview mode as GitHub Pages — no server API routes.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync, copyFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const web = join(root, "apps/web");
const appDir = join(web, "src/app");
const backupDir = join(web, ".aws-build-backup");

const moves = [
  { from: join(appDir, "api"), to: join(backupDir, "api") },
  { from: join(web, "src/middleware.ts"), to: join(backupDir, "middleware.ts") },
];

const pageBackups = [
  { from: join(appDir, "page.tsx"), to: join(backupDir, "page.tsx") },
];

function restore() {
  for (const { from, to } of pageBackups) {
    if (existsSync(to)) writeFileSync(from, readFileSync(to, "utf8"));
  }
  if (!existsSync(backupDir)) return;
  for (const { from, to } of moves) {
    if (existsSync(to)) {
      if (existsSync(from)) rmSync(from, { recursive: true, force: true });
      renameSync(to, from);
    }
  }
  rmSync(backupDir, { recursive: true, force: true });
}

try {
  restore();
  mkdirSync(backupDir, { recursive: true });

  for (const { from, to } of pageBackups) {
    if (existsSync(from)) writeFileSync(to, readFileSync(from, "utf8"));
  }

  for (const { from, to } of moves) {
    if (existsSync(from)) {
      mkdirSync(dirname(to), { recursive: true });
      renameSync(from, to);
    }
  }

  writeFileSync(
    join(appDir, "page.tsx"),
    `"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    const session = document.cookie.includes("cowell_session=");
    router.replace(session ? "/dashboard/" : "/login/");
  }, [router]);
  return null;
}
`
  );

  execSync("npm run build --workspace=apps/web", {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      AWS_STATIC: "true",
      GITHUB_PAGES: "false",
      NEXT_PUBLIC_BASE_PATH: "",
      NEXT_PUBLIC_STATIC_PREVIEW: "true",
      NEXT_PUBLIC_PREFILL_LOGIN: "true",
      NEXT_PUBLIC_DEV_LOGIN_EMAIL: process.env.DEMO_LOGIN_EMAIL ?? "admin@cowell.local",
      NEXT_PUBLIC_DEV_LOGIN_PASSWORD: process.env.DEMO_LOGIN_PASSWORD ?? "change-me",
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
      NEXT_PUBLIC_GOOGLE_SHEETS_FOLDER_ID: process.env.NEXT_PUBLIC_GOOGLE_SHEETS_FOLDER_ID ?? "",
      NEXT_PUBLIC_COGNITO_REGION: process.env.NEXT_PUBLIC_COGNITO_REGION ?? "ap-south-1",
      NEXT_PUBLIC_COGNITO_USER_POOL_ID: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? "",
      NEXT_PUBLIC_COGNITO_CLIENT_ID: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "",
      NEXT_PUBLIC_OCR_API_BASE_URL:
        process.env.NEXT_PUBLIC_OCR_API_BASE_URL ??
        "https://ajewqlxzj5dzpkclaozimdr42m0jceix.lambda-url.ap-south-1.on.aws",
      NEXT_PUBLIC_APP_URL:
        process.env.NEXT_PUBLIC_APP_URL ?? "https://d1xs8fe440jh05.cloudfront.net",
    },
  });

  console.log("AWS static export ready:", join(web, "out"));

  const faviconSvg = join(web, "public/favicon.svg");
  const faviconOut = join(web, "out/favicon.ico");
  if (existsSync(faviconSvg)) {
    copyFileSync(faviconSvg, faviconOut);
  }
} finally {
  restore();
}
