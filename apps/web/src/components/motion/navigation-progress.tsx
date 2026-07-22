"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useNavigation } from "@/contexts/navigation-context";
import { easeOutExpo } from "@/lib/motion";

export function NavigationProgress() {
  const { isNavigating, progress } = useNavigation();
  const reduced = useReducedMotion();

  if (reduced) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px]"
      aria-hidden={!isNavigating}
    >
      <motion.div
        className="h-full w-full origin-left bg-gradient-to-r from-lumen/80 via-lumen-glow to-lumen"
        initial={false}
        animate={{
          scaleX: isNavigating ? Math.max(progress, 8) / 100 : 0,
          opacity: isNavigating ? 1 : 0,
        }}
        transition={{
          scaleX: { duration: 0.35, ease: easeOutExpo },
          opacity: { duration: 0.25, ease: "easeOut" },
        }}
        style={{ boxShadow: "0 0 12px hsl(var(--lumen-glow) / 0.45)" }}
      />
    </div>
  );
}
