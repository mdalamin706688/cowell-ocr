"use client";

import { motion } from "framer-motion";
import { usePageReady } from "@/hooks/use-page-ready";
import { useSafeMotion } from "@/hooks/use-safe-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface StaggerRevealProps {
  children: React.ReactNode;
  className?: string;
  placeholder?: React.ReactNode;
}

/**
 * Skeleton → content handoff without AnimatePresence exit (avoids removeChild
 * races that surface as 表示エラー on CloudFront).
 */
export function StaggerReveal({ children, className, placeholder }: StaggerRevealProps) {
  const safeMotion = useSafeMotion();
  const pageReady = usePageReady();

  if (!pageReady) {
    return (
      <div className={cn("flex w-full flex-col gap-8 overflow-x-clip", className)} aria-busy>
        {placeholder}
      </div>
    );
  }

  if (!safeMotion) {
    return <div className={cn("flex w-full flex-col gap-8", className)}>{children}</div>;
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
    <motion.div
      className={cn("w-full shrink-0 overflow-hidden", className)}
      variants={staggerItem}
    >
      {children}
    </motion.div>
  );
}
