"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePageReady } from "@/hooks/use-page-ready";
import { useSafeMotion } from "@/hooks/use-safe-motion";
import { easeOutExpo, SKELETON_FADE_MS, staggerContainer, staggerItem } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface StaggerRevealProps {
  children: React.ReactNode;
  className?: string;
  placeholder?: React.ReactNode;
  /** Extra gate (e.g. async data). Combined with navigation page-ready. */
  ready?: boolean;
}

/**
 * Premium skeleton → content handoff.
 * Children stay mounted (hooks/data keep running) under an opacity crossfade skeleton.
 * Shared min-height prevents layout jump on local + CloudFront.
 */
export function StaggerReveal({
  children,
  className,
  placeholder,
  ready: readyProp,
}: StaggerRevealProps) {
  const safeMotion = useSafeMotion();
  const pageReady = usePageReady();
  const ready = (readyProp ?? true) && pageReady;
  const showSkeleton = Boolean(placeholder) && !ready;

  if (!safeMotion) {
    return (
      <div className={cn("relative w-full min-h-[560px]", className)}>
        {showSkeleton ? placeholder : <div className="flex w-full flex-col gap-8">{children}</div>}
      </div>
    );
  }

  return (
    <div className={cn("relative w-full min-h-[560px] overflow-x-clip", className)}>
      <motion.div
        className={cn(
          "flex w-full flex-col gap-8",
          showSkeleton && "invisible pointer-events-none absolute inset-x-0 top-0"
        )}
        variants={staggerContainer}
        initial={false}
        animate={ready ? "show" : "hidden"}
        aria-hidden={showSkeleton}
      >
        {children}
      </motion.div>

      <AnimatePresence initial={false}>
        {showSkeleton ? (
          <motion.div
            key="route-skeleton"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: SKELETON_FADE_MS / 1000, ease: easeOutExpo }}
            className="relative z-10 w-full"
            aria-busy
            aria-live="polite"
          >
            {placeholder}
          </motion.div>
        ) : null}
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
    <motion.div className={cn("w-full shrink-0 overflow-hidden", className)} variants={staggerItem}>
      {children}
    </motion.div>
  );
}
