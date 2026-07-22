"use client";

import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
  className?: string;
}

export function Logo({ size = "md", variant = "dark", className }: LogoProps) {
  const sizes = {
    sm: { box: "h-8 w-8", icon: "h-3.5 w-3.5", title: "text-sm", sub: "hidden" },
    md: { box: "h-9 w-9", icon: "h-4 w-4", title: "text-[15px]", sub: "text-[10px]" },
    lg: { box: "h-10 w-10", icon: "h-4 w-4", title: "text-lg", sub: "text-[11px]" },
  };
  const s = sizes[size];
  const isLight = variant === "light";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("relative flex shrink-0 items-center justify-center rounded-[10px] forest-panel", s.box)}>
        <div className="absolute inset-0 rounded-[10px] ring-1 ring-lumen-glow/25 ring-inset" />
        <svg viewBox="0 0 24 24" fill="none" className={cn(s.icon, "relative text-lumen-glow")} aria-hidden>
          <path d="M12 2.5L7.5 10.5H11v9h2v-9h3.5L12 2.5z" fill="currentColor" />
          <ellipse cx="12" cy="20.5" rx="4.5" ry="1.2" fill="currentColor" opacity="0.35" />
        </svg>
      </div>
      <div>
        <p className={cn("font-display font-bold leading-none tracking-tight", s.title, isLight ? "text-white" : "text-foreground")}>
          Cowell<span className={isLight ? "text-lumen-glow" : "text-lumen"}> OCR</span>
        </p>
        {s.sub !== "hidden" && (
          <p className={cn("mt-1 font-medium tracking-wide", s.sub, isLight ? "text-white/45" : "text-muted-foreground")}>
            {copy.app.tagline}
          </p>
        )}
      </div>
    </div>
  );
}
