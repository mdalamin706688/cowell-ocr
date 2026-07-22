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

/** Skeleton matching the new survey page */
export function SurveyPageSkeleton() {
  return (
    <SkeletonPage label="Loading survey">
      <SkeletonBlock className="h-4 w-28 rounded-md" />

      <div className="flex items-start gap-4">
        <SkeletonBlock className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2.5">
          <SkeletonBlock className="h-7 w-56 max-w-full" />
          <SkeletonBlock className="h-4 w-full max-w-lg" />
        </div>
      </div>

      <div className="flex justify-between gap-2 px-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <SkeletonBlock className="h-7 w-7 rounded-full" />
            <SkeletonBlock className="hidden h-2.5 w-12 sm:block rounded-md" />
          </div>
        ))}
      </div>

      <SkeletonGroup>
        <SkeletonBlock className="h-5 w-36 rounded-md" />
        <SkeletonBlock className="h-44 w-full rounded-xl" />
      </SkeletonGroup>

      <SkeletonGroup>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-5 w-40 rounded-md" />
            <SkeletonBlock className="h-3.5 w-52 max-w-full rounded-md" />
          </div>
          <SkeletonBlock className="h-4 w-4 shrink-0 rounded-sm" />
        </div>
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

export function RouteContentSkeleton({ href }: { href: string }) {
  return isSurveyRoute(href) ? <SurveyPageSkeleton /> : <ContentSkeleton />;
}
