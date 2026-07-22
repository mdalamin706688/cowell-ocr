"use client";

import { motion } from "framer-motion";
import { usePageReady } from "@/hooks/use-page-ready";
import { useSafeMotion } from "@/hooks/use-safe-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface StaggerRevealProps {
  children: React.ReactNode;
  className?: string;
}

/** Staggered section reveal — synced to finish after route slide (matches dashboard) */
export function StaggerReveal({ children, className }: StaggerRevealProps) {
  const safeMotion = useSafeMotion();
  const pageReady = usePageReady();

  if (!safeMotion || !pageReady) {
    return <div className={cn(className, "invisible")}>{children}</div>;
  }

  return (
    <motion.div
      className={cn(className)}
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
  const pageReady = usePageReady();

  if (!safeMotion || !pageReady) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  );
}
