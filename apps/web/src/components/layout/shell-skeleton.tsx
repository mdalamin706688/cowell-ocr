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

export function ShellSkeleton() {
  return (
    <div className="min-h-screen paper-canvas">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] border-r border-border/60 bg-card/95 lg:block">
        <div className="flex h-full flex-col p-6">
          <Block className="h-10 w-36 mb-10" />
          <Block className="h-3 w-16 mb-3" />
          <Block className="h-9 w-full mb-1" />
          <div className="mt-auto space-y-3 border-t border-border/50 pt-5">
            <Block className="h-9 w-full" />
            <Block className="h-14 w-full" />
            <Block className="h-9 w-full" />
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/60 bg-card/90 px-4 lg:hidden">
        <Block className="h-8 w-28" />
        <Block className="h-8 w-20" />
      </header>

      <main className="lg:pl-[260px]">
        <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8 sm:py-12 space-y-6">
          <Block className="h-8 w-64" />
          <Block className="h-4 w-96 max-w-full" />
          <Block className="h-48 w-full" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Block className="h-28 w-full" />
            <Block className="h-28 w-full" />
            <Block className="h-28 w-full" />
          </div>
        </div>
      </main>
    </div>
  );
}
