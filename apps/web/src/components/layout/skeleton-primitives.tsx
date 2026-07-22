"use client";

import { cn } from "@/lib/utils";

interface SkeletonBlockProps {
  className?: string;
  /** Staggered entrance delay in ms */
  delay?: number;
}

/** Soft shimmer block — slow premium pulse, no hard edges */
export function SkeletonBlock({ className, delay = 0 }: SkeletonBlockProps) {
  return (
    <div
      className={cn("skeleton-block skeleton-block-enter", className)}
      style={{ animationDelay: `${delay}ms, ${delay + 650}ms` }}
      aria-hidden
    />
  );
}

interface SkeletonGroupProps {
  children: React.ReactNode;
  className?: string;
}

/** Grouped skeleton area — soft surface without hard divider lines */
export function SkeletonGroup({ children, className }: SkeletonGroupProps) {
  return (
    <div className={cn("rounded-xl bg-muted/20 p-5 sm:p-6 space-y-4", className)}>
      {children}
    </div>
  );
}

interface SkeletonPageProps {
  children: React.ReactNode;
  label?: string;
  className?: string;
}

export function SkeletonPage({ children, label = "Loading", className }: SkeletonPageProps) {
  return (
    <div className={cn("space-y-6 sm:space-y-8", className)} aria-busy="true" aria-label={label}>
      {children}
    </div>
  );
}
