"use client";

import {
  SkeletonBlock,
  SkeletonGroup,
  SkeletonPage,
} from "@/components/layout/skeleton-primitives";

/** Skeleton matching the dashboard / home layout */
export function ContentSkeleton() {
  return (
    <SkeletonPage label="Loading home">
      <SkeletonBlock className="h-3.5 w-28 rounded-md" />
      <SkeletonBlock className="h-8 w-72 max-w-full" />
      <SkeletonBlock className="h-4 w-full max-w-md" />
      <SkeletonBlock className="h-52 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        <SkeletonBlock className="h-32 w-full rounded-xl" />
        <SkeletonBlock className="h-32 w-full rounded-xl" />
      </div>
    </SkeletonPage>
  );
}

/** Skeleton matching the users admin page (header + table card) */
export function UsersPageSkeleton() {
  return (
    <SkeletonPage label="Loading users">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <SkeletonBlock className="h-12 w-12 shrink-0 rounded-xl" />
          <div className="space-y-2 pt-0.5">
            <SkeletonBlock className="h-7 w-40 rounded-md" />
            <SkeletonBlock className="h-4 w-64 max-w-full rounded-md" />
          </div>
        </div>
        <SkeletonBlock className="h-9 w-32 rounded-lg" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
        <div className="border-b border-border/60 bg-muted/30 px-4 py-3">
          <div className="flex gap-8">
            <SkeletonBlock className="h-3 w-16 rounded-md" />
            <SkeletonBlock className="h-3 w-14 rounded-md" />
            <SkeletonBlock className="h-3 w-16 rounded-md hidden sm:block" />
          </div>
        </div>
        <div className="space-y-0 divide-y divide-border/40">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-6 px-4 py-3.5">
              <SkeletonBlock className="h-4 w-44 max-w-[40%] rounded-md" />
              <SkeletonBlock className="h-4 w-20 rounded-md" />
              <SkeletonBlock className="h-4 w-24 rounded-md hidden sm:block" />
              <SkeletonBlock className="ml-auto h-7 w-7 rounded-md" />
            </div>
          ))}
        </div>
      </div>
      <SkeletonBlock className="h-40 w-full rounded-xl" />
    </SkeletonPage>
  );
}

/** Skeleton matching the new survey page */
export function SurveyPageSkeleton() {
  return (
    <SkeletonPage label="Loading survey">
      <div className="flex items-start gap-4">
        <SkeletonBlock className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2.5">
          <SkeletonBlock className="h-7 w-56 max-w-full" />
          <SkeletonBlock className="h-4 w-full max-w-lg" />
        </div>
      </div>

      {/* Calmer, premium loading bar instead of multiple tiny shimmering dots */}
      <SkeletonBlock className="h-8 w-full rounded-xl" />

      <SkeletonGroup>
        <SkeletonBlock className="h-5 w-36 rounded-md" />
        <SkeletonBlock className="h-52 w-full rounded-xl" />
      </SkeletonGroup>

      <SkeletonGroup>
        <SkeletonBlock className="h-5 w-40 rounded-md" />
        <SkeletonBlock className="h-14 w-full rounded-lg" />
      </SkeletonGroup>

      <div className="flex justify-end">
        <SkeletonBlock className="h-11 w-44 rounded-lg" />
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

/** Skeleton matching the login page split layout */
export function LoginSkeleton() {
  return (
    <div className="flex min-h-screen paper-canvas" aria-busy="true" aria-label="Loading login">
      <div className="hidden w-[48%] flex-col justify-between p-10 sm:p-12 lg:flex">
        <SkeletonBlock className="h-10 w-36" />
        <div className="max-w-md space-y-4">
          <SkeletonBlock className="h-3 w-24 rounded-md" />
          <SkeletonBlock className="h-8 w-64" />
          <SkeletonBlock className="h-8 w-56" />
          <SkeletonBlock className="h-14 w-full" />
        </div>
        <SkeletonBlock className="h-3 w-32 rounded-md" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[360px] space-y-8">
          <SkeletonBlock className="h-8 w-28 rounded-md lg:hidden" />
          <div className="space-y-4 rounded-xl bg-muted/20 p-7">
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
