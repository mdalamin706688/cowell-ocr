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
    <div className="space-y-6">
      <Block className="h-4 w-28" />
      <Block className="h-8 w-72 max-w-full" />
      <Block className="h-4 w-96 max-w-full" />
      <Block className="h-52 w-full" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Block className="h-32 w-full" />
        <Block className="h-32 w-full" />
      </div>
    </div>
  );
}

export function SurveyPageSkeleton() {
  return (
    <div className="space-y-6">
      <Block className="h-4 w-24" />
      <div className="flex gap-4">
        <Block className="h-12 w-12 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Block className="h-7 w-48" />
          <Block className="h-4 w-full max-w-md" />
        </div>
      </div>
      <Block className="h-px w-full" />
      <Block className="h-10 w-full max-w-lg" />
      <Block className="h-56 w-full rounded-xl" />
      <Block className="h-36 w-full rounded-xl" />
    </div>
  );
}
