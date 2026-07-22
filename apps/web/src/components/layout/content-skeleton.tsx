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
    <div className="space-y-8" aria-busy="true" aria-label="Loading">
      <Block className="h-4 w-24" />
      <div className="flex gap-4">
        <Block className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Block className="h-7 w-48" />
          <Block className="h-4 w-full max-w-md" />
        </div>
      </div>
      <Block className="h-px w-full" />
      <div className="flex flex-wrap gap-2">
        <Block className="h-9 w-24 rounded-full" />
        <Block className="h-9 w-24 rounded-full" />
        <Block className="h-9 w-24 rounded-full" />
        <Block className="h-9 w-24 rounded-full" />
      </div>
      <Block className="h-56 w-full rounded-xl" />
      <Block className="h-36 w-full rounded-xl" />
    </div>
  );
}
