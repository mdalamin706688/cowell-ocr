"use client";

import { motion } from "framer-motion";
import { easeOutExpo, SKELETON_FADE_MS } from "@/lib/motion";

const skeletonFade = {
  duration: SKELETON_FADE_MS / 1000,
  ease: easeOutExpo,
};

/** Smooth fade wrapper for route skeleton placeholders */
export function SkeletonShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={skeletonFade}
    >
      {children}
    </motion.div>
  );
}
