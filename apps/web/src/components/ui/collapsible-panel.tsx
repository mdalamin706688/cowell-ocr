"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CollapsiblePanelProps {
  open: boolean;
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}

/** Height-animated collapse — grid 0fr/1fr + opacity (stable header, no jump). */
export function CollapsiblePanel({
  open,
  children,
  className,
  innerClassName,
}: CollapsiblePanelProps) {
  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        className
      )}
      aria-hidden={!open}
    >
      <div className="overflow-hidden min-h-0">
        <div
          className={cn(
            "transition-opacity duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
            open ? "opacity-100" : "opacity-0",
            innerClassName
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
