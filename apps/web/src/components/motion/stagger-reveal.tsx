"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useNavigation } from "@/contexts/navigation-context";
import { useSafeMotion } from "@/hooks/use-safe-motion";
import { easeOutExpo, SKELETON_FADE_MS, staggerContainer, staggerItem } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface StaggerRevealProps {
  children: React.ReactNode;
  className?: string;
  placeholder?: React.ReactNode;
  ready?: boolean;
}

/**
 * Soft opacity stagger after the route skeleton crossfade.
 * No translate — keeps soft-nav jump-free while feeling finished.
 */
export function StaggerReveal({ children, className }: StaggerRevealProps) {
  const pathname = usePathname();
  const { pendingHref } = useNavigation();
  const safeMotion = useSafeMotion();
  const reveal = !pendingHref;

  if (!safeMotion) {
    return <div className={cn("flex w-full flex-col gap-8", className)}>{children}</div>;
  }

  return (
    <motion.div
      key={pathname}
      className={cn("flex w-full flex-col gap-8 overflow-x-clip", className)}
      variants={staggerContainer}
      initial={false}
      animate={reveal ? "show" : "hidden"}
      transition={{ duration: SKELETON_FADE_MS / 1000, ease: easeOutExpo }}
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
    return <div className={cn("w-full shrink-0", className)}>{children}</div>;
  }

  return (
    <motion.div className={cn("w-full shrink-0 overflow-hidden", className)} variants={staggerItem}>
      {children}
    </motion.div>
  );
}
