"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useNavigation } from "@/contexts/navigation-context";
import { useSafeMotion } from "@/hooks/use-safe-motion";
import { getPageMotion, springPage, type PageMotionVariant } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface PageContentTransitionProps {
  children: React.ReactNode;
  className?: string;
  variant?: PageMotionVariant;
}

/**
 * Direction-aware route transition with exit + enter when motion is safe.
 * Falls back to static markup when browser translate is active.
 */
export function PageContentTransition({
  children,
  className,
  variant = "workspace",
}: PageContentTransitionProps) {
  const pathname = usePathname();
  const { direction } = useNavigation();
  const safeMotion = useSafeMotion();
  const pageMotion = getPageMotion(variant, direction);

  if (!safeMotion) {
    return (
      <div className={className} key={pathname}>
        {children}
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={pageMotion.initial}
          animate={pageMotion.animate}
          exit={pageMotion.exit}
          transition={springPage}
          className="w-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
