"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy";

const LOGO_PATH = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/cowell-logo.png`;
const LOGO_ASPECT = 249 / 61;

interface LogoProps {
  size?: "sm" | "md" | "lg";
  /** Login / marketing panel — logo on white chip */
  variant?: "light" | "dark";
  className?: string;
}

/**
 * Premium "C" monogram — inline SVG for crisp rendering at any size.
 * Cream rounded square + navy C arc with rounded line caps.
 * Server-safe (no next/image, no client-only APIs).
 */
export function CMonogram({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="COWELL"
      role="img"
    >
      <rect width="64" height="64" rx="14" fill="#FFFBF8" />
      <path
        d="M44 20a16 16 0 1 0 0 24"
        fill="none"
        stroke="#1F2677"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LogoMark({
  height = 22,
  className,
  chip = false,
}: {
  height?: number;
  className?: string;
  chip?: boolean;
}) {
  const w = Math.round(height * LOGO_ASPECT);
  const img = (
    <Image
      src={LOGO_PATH}
      alt="COWELL"
      width={w}
      height={height}
      className="h-auto w-auto shrink-0"
      style={{ width: w, height }}
      priority
    />
  );
  if (!chip) return <span className={cn("inline-flex", className)}>{img}</span>;
  return <span className={cn("brand-logo-mark inline-flex !px-2 !py-1.5", className)}>{img}</span>;
}

export function Logo({ size = "md", variant = "dark", className }: LogoProps) {
  const heights = { sm: 28, md: 32, lg: 38 } as const;
  const h = heights[size];
  const w = Math.round(h * LOGO_ASPECT);
  const onBrandPanel = variant === "light";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className={cn(onBrandPanel && "brand-logo-mark", onBrandPanel && "px-3.5 py-2.5")}>
        <Image
          src={LOGO_PATH}
          alt="COWELL"
          width={w}
          height={h}
          className="h-auto w-auto shrink-0"
          style={{ width: w, height: h }}
          priority
        />
      </div>
      {size !== "sm" && (
        <p
          className={cn(
            "font-medium tracking-[0.04em] whitespace-nowrap text-muted-foreground",
            size === "lg" ? "text-[11px]" : "text-[10px]"
          )}
        >
          {copy.app.tagline}
        </p>
      )}
    </div>
  );
}
