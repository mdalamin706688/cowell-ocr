"use client";

import { motion } from "framer-motion";
import { useSafeMotion } from "@/hooks/use-safe-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface StaggerRevealProps {
  children: React.ReactNode;
  className?: string;
  /** @deprecated Kept for call-site compatibility — never blocks content behind a skeleton. */
  placeholder?: React.ReactNode;
}

/**
 * Premium enter stagger — content renders immediately.
 * Never swaps to a skeleton on soft navigations (that causes CloudFront “jump”).
 */
export function StaggerReveal({ children, className }: StaggerRevealProps) {
  const safeMotion = useSafeMotion();

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
