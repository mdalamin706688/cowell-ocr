"use client";

import { SkeletonBlock } from "@/components/layout/skeleton-primitives";

export function ShellSkeleton() {
  return (
    <div className="min-h-screen overflow-x-clip paper-canvas">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] border-r border-border/60 bg-card/95 lg:block">
        <div className="flex h-full flex-col p-6">
          <SkeletonBlock className="mb-10 h-10 w-36" />
          <SkeletonBlock className="mb-3 h-3 w-16 rounded-md" />
          <SkeletonBlock className="mb-1 h-9 w-full" />
          <div className="mt-auto space-y-3 border-t border-border/50 pt-5">
            <SkeletonBlock className="h-9 w-full" />
            <SkeletonBlock className="h-14 w-full" />
            <SkeletonBlock className="h-9 w-full" />
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/60 bg-card/90 px-4 lg:hidden">
        <SkeletonBlock className="h-8 w-28" />
        <SkeletonBlock className="h-8 w-20" />
      </header>

      <main className="lg:pl-[260px]">
        <div className="mx-auto max-w-6xl space-y-6 px-6 py-10 sm:px-8 sm:py-12">
          <SkeletonBlock className="h-8 w-64" />
          <SkeletonBlock className="h-4 w-96 max-w-full" />
          <SkeletonBlock className="h-48 w-full rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-3">
            <SkeletonBlock className="h-28 w-full rounded-xl" />
            <SkeletonBlock className="h-28 w-full rounded-xl" />
            <SkeletonBlock className="h-28 w-full rounded-xl" />
          </div>
        </div>
      </main>
    </div>
  );
}
