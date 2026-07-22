"use client";

import { cn } from "@/lib/utils";

interface StepPanelProps {
  children: React.ReactNode;
  className?: string;
}

/** Workflow step container — motion handled by page stagger to avoid double animation */
export function StepPanel({ children, className }: StepPanelProps) {
  return <div className={cn(className)}>{children}</div>;
}
