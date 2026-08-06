"use client";

import {
  SkeletonBlock,
  SkeletonGroup,
  SkeletonPage,
} from "@/components/layout/skeleton-primitives";

/** Premium home skeleton — mirrors dashboard greeting + hero + cards */
export function ContentSkeleton() {
  return (
    <SkeletonPage label="Loading home">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2.5">
          <SkeletonBlock className="h-3.5 w-28 rounded-md" />
          <SkeletonBlock className="h-8 w-64 max-w-full rounded-md" />
          <SkeletonBlock className="h-4 w-48 rounded-md" />
        </div>
        <SkeletonBlock className="h-11 w-40 rounded-xl" />
      </div>

      <div className="forest-hero overflow-hidden p-7 sm:p-9">
        <div className="grid gap-8 lg:grid-cols-[1fr,280px]">
          <div className="max-w-lg space-y-4">
            <SkeletonBlock className="h-3 w-24 rounded-md" />
            <SkeletonBlock className="h-8 w-full max-w-md rounded-md" />
            <SkeletonBlock className="h-8 w-full max-w-sm rounded-md" />
            <SkeletonBlock className="h-14 w-full rounded-md" />
            <SkeletonBlock className="mt-2 h-11 w-44 rounded-xl" />
          </div>
          <div className="hidden space-y-3 inset-well p-5 lg:block">
            <SkeletonBlock className="h-3 w-28 rounded-md" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-border/30 px-3 py-2.5">
                <SkeletonBlock className="h-8 w-8 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <SkeletonBlock className="h-3.5 w-24 rounded-md" />
                  <SkeletonBlock className="h-3 w-36 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-border/50 bg-card/50 p-5">
            <SkeletonBlock className="h-9 w-9 rounded-lg" />
            <SkeletonBlock className="h-4 w-28 rounded-md" />
            <SkeletonBlock className="h-10 w-full rounded-md" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}

/** Premium users skeleton — mirrors header + table + password card */
export function UsersPageSkeleton() {
  return (
    <SkeletonPage label="Loading users">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <SkeletonBlock className="h-12 w-12 shrink-0 rounded-xl" />
          <div className="space-y-2.5 pt-0.5">
            <SkeletonBlock className="h-7 w-36 rounded-md" />
            <SkeletonBlock className="h-4 w-72 max-w-full rounded-md" />
          </div>
        </div>
        <SkeletonBlock className="h-9 w-32 rounded-xl" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card/50 shadow-sm">
        <div className="border-b border-border/60 bg-muted/30 px-4 py-3">
          <div className="flex gap-10">
            <SkeletonBlock className="h-3 w-14 rounded-md" />
            <SkeletonBlock className="h-3 w-14 rounded-md" />
            <SkeletonBlock className="hidden h-3 w-16 rounded-md sm:block" />
            <SkeletonBlock className="ml-auto h-3 w-12 rounded-md" />
          </div>
        </div>
        <div className="divide-y divide-border/40">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-6 px-4 py-3.5">
              <SkeletonBlock className="h-4 w-[42%] max-w-xs rounded-md" />
              <SkeletonBlock className="h-4 w-20 rounded-md" />
              <SkeletonBlock className="hidden h-4 w-24 rounded-md sm:block" />
              <SkeletonBlock className="ml-auto h-8 w-8 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-border/60 bg-card/50 p-5 sm:p-6">
        <SkeletonBlock className="h-5 w-40 rounded-md" />
        <SkeletonBlock className="h-4 w-64 max-w-full rounded-md" />
        <div className="grid gap-3 sm:grid-cols-2">
          <SkeletonBlock className="h-10 w-full rounded-lg" />
          <SkeletonBlock className="h-10 w-full rounded-lg" />
        </div>
        <SkeletonBlock className="h-10 w-36 rounded-xl" />
      </div>
    </SkeletonPage>
  );
}

/** Premium survey skeleton — mirrors title, steps, upload, actions */
export function SurveyPageSkeleton() {
  return (
    <SkeletonPage label="Loading survey">
      <div className="flex items-start gap-4">
        <SkeletonBlock className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2.5">
          <SkeletonBlock className="h-7 w-56 max-w-full rounded-md" />
          <SkeletonBlock className="h-4 w-full max-w-lg rounded-md" />
        </div>
      </div>

      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-8 flex-1 rounded-xl" />
        ))}
      </div>

      <SkeletonGroup>
        <SkeletonBlock className="h-5 w-36 rounded-md" />
        <SkeletonBlock className="h-52 w-full rounded-xl" />
      </SkeletonGroup>

      <SkeletonGroup>
        <SkeletonBlock className="h-5 w-40 rounded-md" />
        <SkeletonBlock className="h-14 w-full rounded-lg" />
        <SkeletonBlock className="h-14 w-full rounded-lg" />
      </SkeletonGroup>

      <div className="flex justify-end gap-3">
        <SkeletonBlock className="h-11 w-28 rounded-xl" />
        <SkeletonBlock className="h-11 w-40 rounded-xl" />
      </div>
    </SkeletonPage>
  );
}

export function isSurveyRoute(path: string): boolean {
  return path.includes("/survey");
}

export function isUsersRoute(path: string): boolean {
  return path.includes("/users");
}

export function isLoginRoute(path: string): boolean {
  return path.includes("/login");
}

/** Login split-layout skeleton */
export function LoginSkeleton() {
  return (
    <div className="flex min-h-screen paper-canvas" aria-busy="true" aria-label="Loading login">
      <div className="login-hero hidden w-[48%] flex-col justify-between p-10 sm:p-12 lg:flex lg:p-14">
        <SkeletonBlock className="relative z-10 h-12 w-48 rounded-xl" />
        <div className="relative z-10 max-w-[26rem] space-y-4">
          <SkeletonBlock className="h-3 w-28 rounded-md" />
          <SkeletonBlock className="h-9 w-72 max-w-full rounded-md" />
          <SkeletonBlock className="h-9 w-56 max-w-full rounded-md" />
          <SkeletonBlock className="h-16 w-full rounded-md" />
        </div>
        <SkeletonBlock className="relative z-10 h-3 w-40 rounded-md" />
      </div>

      <div className="login-form-stage">
        <div className="w-full max-w-[360px] space-y-8">
          <SkeletonBlock className="h-8 w-28 rounded-md lg:hidden" />
          <div className="form-surface space-y-4 !p-7">
            <SkeletonBlock className="h-6 w-32 rounded-md" />
            <SkeletonBlock className="h-4 w-48 rounded-md" />
            <SkeletonBlock className="h-10 w-full rounded-lg" />
            <SkeletonBlock className="h-10 w-full rounded-lg" />
            <SkeletonBlock className="h-11 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function RouteContentSkeleton({ href }: { href: string }) {
  if (isLoginRoute(href)) return <LoginSkeleton />;
  if (isSurveyRoute(href)) return <SurveyPageSkeleton />;
  if (isUsersRoute(href)) return <UsersPageSkeleton />;
  return <ContentSkeleton />;
}
