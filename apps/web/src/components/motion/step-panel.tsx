"use client";

import { motion } from "framer-motion";
import { useSafeMotion } from "@/hooks/use-safe-motion";
import { springSoft } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface StepPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function StepPanel({ children, className }: StepPanelProps) {
  const safeMotion = useSafeMotion();

  if (!safeMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSoft}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
