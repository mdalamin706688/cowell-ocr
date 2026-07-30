"use client";

import { cn } from "@/lib/utils";

interface StaggerRevealProps {
  children: React.ReactNode;
  className?: string;
  placeholder?: React.ReactNode;
  /** Kept for API compat — content always stays mounted (avoids CloudFront remount crashes). */
  ready?: boolean;
}

/**
 * Always keep children mounted. Soft-nav overlay handles loading UI;
 * unmounting pages mid-nav caused intermittent CloudFront errors.
 */
export function StaggerReveal({ children, className }: StaggerRevealProps) {
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
