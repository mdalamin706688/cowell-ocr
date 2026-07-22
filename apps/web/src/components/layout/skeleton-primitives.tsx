"use client";

import { cn } from "@/lib/utils";

interface SkeletonBlockProps {
  className?: string;
}

/** Soft shimmer block — no borders, production-grade loading placeholder */
export function SkeletonBlock({ className }: SkeletonBlockProps) {
  return <div className={cn("skeleton-block", className)} aria-hidden />;
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
