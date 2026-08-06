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
