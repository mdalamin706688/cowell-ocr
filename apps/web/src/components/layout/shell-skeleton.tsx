"use client";

import { useEffect, useState } from "react";
import { SkeletonBlock } from "@/components/layout/skeleton-primitives";
import { cn } from "@/lib/utils";

const SIDEBAR_KEY = "cowell_sidebar_collapsed";

export function ShellSkeleton() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1");
    } catch {
      // ignore storage
    }
  }, []);

  return (
    <div className="min-h-screen overflow-x-clip paper-canvas">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-border/60 bg-card/95 lg:block",
          collapsed ? "w-[88px]" : "w-[300px]"
        )}
      >
        <div className={cn("flex h-full flex-col", collapsed ? "px-3 pt-0 pb-4" : "p-6")}>
          {collapsed ? (
            <>
              <div className="mb-2 flex h-32 flex-col items-center pt-4">
                <SkeletonBlock className="h-11 w-11 rounded-xl" />
                <SkeletonBlock className="mt-7 h-9 w-9 rounded-lg" />
              </div>
              <div className="space-y-2">
                <SkeletonBlock className="mx-auto h-11 w-11 rounded-xl" />
                <SkeletonBlock className="mx-auto h-11 w-11 rounded-xl" />
              </div>
            </>
          ) : (
            <>
              <div className="mb-8 flex items-center justify-between gap-4">
                <SkeletonBlock className="h-10 w-44" />
                <SkeletonBlock className="h-9 w-9 rounded-lg" />
              </div>
              <SkeletonBlock className="mb-3 h-3 w-16 rounded-md" />
              <div className="space-y-1">
                <SkeletonBlock className="h-11 w-full rounded-lg" />
                <SkeletonBlock className="h-11 w-full rounded-lg" />
              </div>
            </>
          )}

          <div className="mt-auto space-y-3 border-t border-border/50 pt-5">
            {collapsed ? (
              <>
                <SkeletonBlock className="mx-auto h-11 w-11 rounded-xl" />
                <SkeletonBlock className="mx-auto h-11 w-11 rounded-xl" />
                <SkeletonBlock className="mx-auto h-11 w-11 rounded-xl" />
              </>
            ) : (
              <>
                <SkeletonBlock className="h-10 w-full rounded-lg" />
                <SkeletonBlock className="h-14 w-full rounded-xl" />
                <SkeletonBlock className="h-10 w-full rounded-lg" />
              </>
            )}
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/60 bg-card/90 px-4 lg:hidden">
        <SkeletonBlock className="h-8 w-28" />
        <SkeletonBlock className="h-8 w-20" />
      </header>

      <main className={cn(collapsed ? "lg:pl-[88px]" : "lg:pl-[300px]")}>
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
