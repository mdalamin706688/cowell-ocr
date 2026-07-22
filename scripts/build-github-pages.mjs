#!/usr/bin/env node
/**
 * Prepares a static export build for GitHub Pages.
 * API routes and middleware are excluded because GitHub Pages is static-only.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const web = join(root, "apps/web");
const appDir = join(web, "src/app");
const backupDir = join(web, ".pages-build-backup");

const moves = [
  { from: join(appDir, "api"), to: join(backupDir, "api") },
  { from: join(web, "src/middleware.ts"), to: join(backupDir, "middleware.ts") },
];

const pageBackups = [
  { from: join(appDir, "page.tsx"), to: join(backupDir, "page.tsx") },
  { from: join(appDir, "dashboard/page.tsx"), to: join(backupDir, "dashboard-page.tsx") },
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

  writeFileSync(
    join(appDir, "dashboard/page.tsx"),
    `"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { getBasePath, readClientSession } from "@/lib/client-auth";

export default function DashboardPage() {
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);

  useEffect(() => {
    const session = readClientSession();
    if (!session) {
      window.location.replace(\`\${getBasePath()}/login/\`);
      return;
    }
    setUser(session);
  }, []);

  if (!user) return null;

  return (
    <AppShell user={user}>
      <DashboardContent userName={user.name} />
    </AppShell>
  );
}
`
  );

  execSync("npm run build --workspace=apps/web", {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      GITHUB_PAGES: "true",
      GITHUB_REPOSITORY: process.env.GITHUB_REPOSITORY ?? "mdalamin706688/cowell-ocr",
      NEXT_PUBLIC_BASE_PATH: `/${(process.env.GITHUB_REPOSITORY ?? "mdalamin706688/cowell-ocr").split("/")[1]}`,
      NEXT_PUBLIC_STATIC_PREVIEW: "true",
      NEXT_PUBLIC_PREFILL_LOGIN: "true",
      NEXT_PUBLIC_DEV_LOGIN_EMAIL: process.env.DEMO_LOGIN_EMAIL ?? "admin@cowell.local",
      NEXT_PUBLIC_DEV_LOGIN_PASSWORD: process.env.DEMO_LOGIN_PASSWORD ?? "change-me",
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
      NEXT_PUBLIC_GOOGLE_SHEETS_FOLDER_ID: process.env.NEXT_PUBLIC_GOOGLE_SHEETS_FOLDER_ID ?? "",
    },
  });

  writeFileSync(join(web, "out", ".nojekyll"), "");
  console.log("Static export ready:", join(web, "out"));
} finally {
  restore();
}
