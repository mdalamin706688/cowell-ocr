"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useNavigation } from "@/contexts/navigation-context";
import { useSafeMotion } from "@/hooks/use-safe-motion";
import { getPageMotion, pageTransitionTween, type PageMotionVariant } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface PageContentTransitionProps {
  children: React.ReactNode;
  className?: string;
  variant?: PageMotionVariant;
}

/**
 * Enter-only page motion. Exit AnimatePresence (mode="wait") remounts DOM and
 * triggers removeChild races → 表示エラー on CloudFront / Chrome translate.
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
    <div className={cn("relative isolate overflow-x-clip", className)}>
      <motion.div
        key={pathname}
        initial={pageMotion.initial}
        animate={pageMotion.animate}
        transition={pageTransitionTween}
        className="w-full overflow-x-clip"
      >
        {children}
      </motion.div>
    </div>
  );
}
