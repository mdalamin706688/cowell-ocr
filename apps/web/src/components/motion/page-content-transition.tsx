"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useSafeMotion } from "@/hooks/use-safe-motion";
import { pageTransitionTween, type PageMotionVariant } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface PageContentTransitionProps {
  children: React.ReactNode;
  className?: string;
  variant?: PageMotionVariant;
}

/**
 * Opacity-only enter. Translate/scale caused the small content “jump” on route change.
 */
export function PageContentTransition({
  children,
  className,
  variant = "workspace",
}: PageContentTransitionProps) {
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
    <div className={cn("relative isolate overflow-x-clip", className)}>
      <motion.div
        key={pathname}
        initial={{ opacity: variant === "auth" ? 0.92 : 0.98 }}
        animate={{ opacity: 1 }}
        transition={pageTransitionTween}
        className="w-full overflow-x-clip"
      >
        {children}
      </motion.div>
    </div>
  );
}
