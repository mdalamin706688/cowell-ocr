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
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

function readSession() {
  const match = document.cookie.match(/cowell_session=([^;]+)/);
  if (!match) return null;
  try {
    return JSON.parse(atob(match[1])) as { email: string; name: string };
  } catch {
    return null;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login/");
      return;
    }
    setUser(session);
  }, [router]);

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
    env: { ...process.env, GITHUB_PAGES: "true" },
  });

  writeFileSync(join(web, "out", ".nojekyll"), "");
  console.log("Static export ready:", join(web, "out"));
} finally {
  restore();
}
