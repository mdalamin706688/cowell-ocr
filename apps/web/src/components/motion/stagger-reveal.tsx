"use client";

import { motion } from "framer-motion";
import { useSafeMotion } from "@/hooks/use-safe-motion";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface StaggerRevealProps {
  children: React.ReactNode;
  className?: string;
  /** Unused — route skeletons are owned by loading.tsx / WorkspacePendingSkeleton. */
  placeholder?: React.ReactNode;
}

/** Premium enter stagger after the route (or its skeleton) has settled. */
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
