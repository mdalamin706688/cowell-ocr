"use client";

import { motion } from "framer-motion";

function Block({ className }: { className: string }) {
  return (
    <motion.div
      className={`rounded-lg bg-muted/50 ${className}`}
      animate={{ opacity: [0.45, 0.85, 0.45] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/** Skeleton placeholder matching the dashboard / home layout */
export function ContentSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Block className="h-3.5 w-28" />
          <Block className="h-8 w-72 max-w-full" />
        </div>
        <Block className="h-10 w-36 rounded-lg" />
      </div>
      <Block className="h-52 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Block className="h-32 w-full rounded-xl" />
        <Block className="h-32 w-full rounded-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Block className="h-28 w-full rounded-xl" />
        <Block className="h-28 w-full rounded-xl" />
        <Block className="h-28 w-full rounded-xl" />
      </div>
    </div>
  );
}

/** Skeleton placeholder matching the new survey page layout */
export function SurveyPageSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading survey">
      <Block className="h-4 w-28" />

      <div className="flex items-start gap-4">
        <Block className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Block className="h-7 w-56 max-w-full" />
          <Block className="h-4 w-full max-w-lg" />
        </div>
      </div>

      <div className="h-px w-full bg-border/70" />

      <div className="timeline-track">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center text-center"
            style={{ width: "20%" }}
          >
            <Block className="h-7 w-7 rounded-full" />
            <Block className="mt-2 hidden h-3 w-14 sm:block" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card/50">
        <div className="border-b border-border/60 px-6 py-4">
          <Block className="h-5 w-36" />
        </div>
        <div className="p-6">
          <Block className="h-44 w-full rounded-xl border border-dashed border-border/80" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card/50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="space-y-1.5">
            <Block className="h-5 w-40" />
            <Block className="h-3 w-52 max-w-full" />
          </div>
          <Block className="h-4 w-4 rounded-sm" />
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <Block className="h-11 w-44 rounded-lg" />
      </div>
    </div>
  );
}

export function isSurveyRoute(path: string): boolean {
  return path.includes("/survey");
}

export function RouteContentSkeleton({ href }: { href: string }) {
  return isSurveyRoute(href) ? <SurveyPageSkeleton /> : <ContentSkeleton />;
}
