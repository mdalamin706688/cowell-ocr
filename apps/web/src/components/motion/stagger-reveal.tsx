"use client";

import { motion } from "framer-motion";
import { usePageReady } from "@/hooks/use-page-ready";
import { useSafeMotion } from "@/hooks/use-safe-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface StaggerRevealProps {
  children: React.ReactNode;
  className?: string;
  /** Placeholder while route slide finishes — no children mounted until ready */
  placeholder?: React.ReactNode;
}

/**
 * Staggered section reveal — opacity only (no y-shift) so sections never overlap.
 * Children mount once pageReady to avoid mixing with route skeleton below.
 */
export function StaggerReveal({ children, className, placeholder }: StaggerRevealProps) {
  const safeMotion = useSafeMotion();
  const pageReady = usePageReady();

  if (!safeMotion) {
    return <div className={cn(className)}>{children}</div>;
  }

  if (!pageReady) {
    return (
      <div className={cn("flex w-full flex-col gap-8 overflow-x-clip", className)} aria-busy>
        {placeholder}
      </div>
    );
  }

  return (
    <motion.div
      className={cn("flex w-full flex-col gap-8 overflow-x-clip", className)}
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const safeMotion = useSafeMotion();

  if (!safeMotion) {
    return <div className={cn("w-full", className)}>{children}</div>;
  }

  return (
    <motion.div className={cn("w-full shrink-0", className)} variants={staggerItem}>
      {children}
    </motion.div>
  );
}
