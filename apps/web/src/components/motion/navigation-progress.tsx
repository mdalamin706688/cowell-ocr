"use client";

import { useNavigation } from "@/contexts/navigation-context";
import { cn } from "@/lib/utils";

/** CSS-only top progress — no Framer (avoids DOM races → 表示エラー). */
export function NavigationProgress() {
  const { isNavigating, progress } = useNavigation();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
      aria-hidden={!isNavigating}
    >
      <div
        className={cn(
          "h-full origin-left bg-gradient-to-r from-lumen via-lumen-glow to-lumen/90 transition-[transform,opacity] duration-300 ease-out",
          isNavigating ? "opacity-100" : "opacity-0"
        )}
        style={{
          transform: `scaleX(${isNavigating ? Math.max(progress, 6) / 100 : 0})`,
          boxShadow: "0 0 16px hsl(var(--lumen-glow) / 0.5)",
        }}
      />
    </div>
  );
}
