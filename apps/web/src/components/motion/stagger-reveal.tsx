"use client";

import { usePageReady } from "@/hooks/use-page-ready";
import { cn } from "@/lib/utils";

interface StaggerRevealProps {
  children: React.ReactNode;
  className?: string;
  placeholder?: React.ReactNode;
}

/**
 * Skeleton → content without Framer. Framer remounts caused 表示エラー on soft-nav.
 */
export function StaggerReveal({ children, className, placeholder }: StaggerRevealProps) {
  const pageReady = usePageReady();

  if (!pageReady) {
    return (
      <div className={cn("flex w-full flex-col gap-8 overflow-x-clip", className)} aria-busy>
        {placeholder}
      </div>
    );
  }

  return (
    <div className={cn("page-enter flex w-full flex-col gap-8 overflow-x-clip", className)}>
      {children}
    </div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("page-enter-item w-full shrink-0", className)}>{children}</div>;
}
