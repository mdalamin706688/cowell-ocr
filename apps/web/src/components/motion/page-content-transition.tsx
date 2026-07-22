"use client";

import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { usePathname } from "next/navigation";
import { tweenPage } from "@/lib/motion";

interface PageContentTransitionProps {
  children: React.ReactNode;
  variants?: Variants;
  className?: string;
}

export function PageContentTransition({
  children,
  variants,
  className,
}: PageContentTransitionProps) {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={tweenPage}
        className={className}
        style={{ willChange: "opacity, transform, filter" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
