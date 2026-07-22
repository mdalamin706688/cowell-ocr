"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePageReady } from "@/hooks/use-page-ready";
import { useSafeMotion } from "@/hooks/use-safe-motion";
import { easeOutExpo, SKELETON_FADE_MS, staggerContainer, staggerItem } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface StaggerRevealProps {
  children: React.ReactNode;
  className?: string;
  /** Placeholder while route slide finishes — no children mounted until ready */
  placeholder?: React.ReactNode;
}

/**
 * Staggered section reveal — spring fade + subtle rise, clipped per section.
 * Children mount only when ready so text never mixes with skeleton below.
 */
export function StaggerReveal({ children, className, placeholder }: StaggerRevealProps) {
  const safeMotion = useSafeMotion();
  const pageReady = usePageReady();

  if (!safeMotion) {
    return <div className={cn(className)}>{children}</div>;
  }

  return (
    <div className={cn("flex w-full flex-col gap-8 overflow-x-clip", className)}>
      <AnimatePresence mode="wait" initial={false}>
        {!pageReady ? (
          <motion.div
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: SKELETON_FADE_MS / 1000, ease: easeOutExpo }}
            aria-busy
          >
            {placeholder}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="flex w-full flex-col gap-8"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
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
