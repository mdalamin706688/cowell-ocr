"use client";

import { SkeletonBlock } from "@/components/layout/skeleton-primitives";

/** First-load only — widths follow html.sidebar-collapsed CSS. */
export function ShellSkeleton() {
  return (
    <div className="min-h-screen overflow-x-clip paper-canvas">
      <aside
        className="shell-aside fixed inset-y-0 left-0 z-40 hidden border-r border-border/60 bg-card/95 lg:block"
        suppressHydrationWarning
      >
        <div className="shell-aside-inner flex h-full flex-col">
          <div className="shell-collapsed-only mb-2 flex h-32 flex-col items-center pt-4">
            <SkeletonBlock className="h-11 w-11 rounded-xl" />
            <SkeletonBlock className="mt-7 h-9 w-9 rounded-lg" />
          </div>
          <div className="shell-collapsed-only space-y-2">
            <SkeletonBlock className="mx-auto h-11 w-11 rounded-xl" />
            <SkeletonBlock className="mx-auto h-11 w-11 rounded-xl" />
          </div>

          <div className="shell-expanded-only mb-8 flex items-center justify-between gap-4">
            <SkeletonBlock className="h-10 w-44" />
            <SkeletonBlock className="h-9 w-9 rounded-lg" />
          </div>
          <SkeletonBlock className="shell-expanded-only mb-3 h-3 w-16 rounded-md" />
          <div className="shell-expanded-only space-y-1">
            <SkeletonBlock className="h-11 w-full rounded-lg" />
            <SkeletonBlock className="h-11 w-full rounded-lg" />
          </div>

          <div className="mt-auto space-y-3 border-t border-border/50 pt-5">
            <div className="shell-collapsed-only space-y-3">
              <SkeletonBlock className="mx-auto h-11 w-11 rounded-xl" />
              <SkeletonBlock className="mx-auto h-11 w-11 rounded-xl" />
              <SkeletonBlock className="mx-auto h-11 w-11 rounded-xl" />
            </div>
            <div className="shell-expanded-only space-y-3">
              <SkeletonBlock className="h-10 w-full rounded-lg" />
              <SkeletonBlock className="h-14 w-full rounded-xl" />
              <SkeletonBlock className="h-10 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/60 bg-card/90 px-4 lg:hidden">
        <SkeletonBlock className="h-8 w-28" />
        <SkeletonBlock className="h-8 w-20" />
      </header>

      <main className="shell-main" suppressHydrationWarning>
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
