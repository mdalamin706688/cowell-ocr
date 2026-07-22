"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useSafeMotion } from "@/hooks/use-safe-motion";
import { tweenFast } from "@/lib/motion";

interface PageContentTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Enter-only route transition. Avoids AnimatePresence exit animations that crash
 * when browser translation has rewritten the DOM (removeChild errors).
 */
export function PageContentTransition({ children, className }: PageContentTransitionProps) {
  const pathname = usePathname();
  const safeMotion = useSafeMotion();

  if (!safeMotion) {
    return (
      <div className={className} key={pathname}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={tweenFast}
      className={className}
    >
      {children}
    </motion.div>
  );
}
