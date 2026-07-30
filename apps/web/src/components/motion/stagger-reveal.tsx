"use client";

import { usePageReady } from "@/hooks/use-page-ready";
import { cn } from "@/lib/utils";

interface StaggerRevealProps {
  children: React.ReactNode;
  className?: string;
  placeholder?: React.ReactNode;
  /** Extra gate (e.g. async data). Combined with navigation page-ready. */
  ready?: boolean;
}

/**
 * No transform / no remount animation — soft-nav stability comes from
 * WorkspacePendingSkeleton height lock. This only gates async `ready`.
 */
export function StaggerReveal({
  children,
  className,
  placeholder,
  ready: readyProp,
}: StaggerRevealProps) {
  const pageReady = usePageReady();
  const ready = (readyProp ?? true) && pageReady;

  if (!ready) {
    return (
      <div className={cn("w-full", className)} aria-busy>
        {placeholder ?? null}
      </div>
    );
  }

  return <div className={cn("flex w-full flex-col gap-8", className)}>{children}</div>;
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("w-full shrink-0", className)}>{children}</div>;
}
