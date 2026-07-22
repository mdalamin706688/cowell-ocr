"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useNavigation } from "@/contexts/navigation-context";
import { easeOutExpo, PAGE_TRANSITION_MS } from "@/lib/motion";

export function NavigationProgress() {
  const { isNavigating, progress } = useNavigation();
  const reduced = useReducedMotion();

  if (reduced) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
      aria-hidden={!isNavigating}
    >
      <motion.div
        className="h-full w-full origin-left bg-gradient-to-r from-lumen via-lumen-glow to-lumen/90"
        initial={false}
        animate={{
          scaleX: isNavigating ? Math.max(progress, 6) / 100 : 0,
          opacity: isNavigating ? 1 : 0,
        }}
        transition={{
          scaleX: { duration: PAGE_TRANSITION_MS / 1000, ease: easeOutExpo },
          opacity: { duration: 0.3, ease: "easeOut" },
        }}
        style={{ boxShadow: "0 0 16px hsl(var(--lumen-glow) / 0.5)" }}
      />
    </div>
  );
}
