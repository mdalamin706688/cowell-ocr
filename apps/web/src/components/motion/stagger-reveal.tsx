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

/** Staggered section reveal — one smooth pass after route slide (loading.tsx handles skeleton) */
export function StaggerReveal({ children, className }: StaggerRevealProps) {
  const safeMotion = useSafeMotion();
  const pageReady = usePageReady();

  if (!safeMotion) {
    return <div className={cn(className)}>{children}</div>;
  }

  return (
    <motion.div
      className={cn(className, "overflow-x-clip")}
      variants={staggerContainer}
      initial="hidden"
      animate={pageReady ? "show" : "hidden"}
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
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  );
}
