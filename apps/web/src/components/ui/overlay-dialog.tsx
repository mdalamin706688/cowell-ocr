"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface OverlayDialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label?: string;
  labelledBy?: string;
  className?: string;
  panelClassName?: string;
  tone?: "default" | "media";
}

/**
 * Portal overlay without Framer AnimatePresence — exit unmounts caused
 * removeChild races → 表示エラー on CloudFront.
 */
export function OverlayDialog({
  open,
  onClose,
  children,
  label,
  labelledBy,
  className,
  panelClassName,
  tone = "default",
}: OverlayDialogProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (typeof document === "undefined" || !open) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))] sm:pt-[max(1.5rem,env(safe-area-inset-top))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]",
        className
      )}
      role="presentation"
    >
      <button
        type="button"
        aria-label="閉じる"
        className={cn(
          "absolute inset-0 border-0 backdrop-blur-md",
          tone === "media" ? "bg-[hsl(28_12%_11%/0.42)]" : "bg-[hsl(28_12%_11%/0.48)]"
        )}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-labelledby={labelledBy}
        className={cn(
          "relative z-10 w-full overflow-hidden rounded-2xl border border-border/70 bg-card",
          "shadow-[0_24px_64px_-18px_rgba(40,28,12,0.35)]",
          tone === "media" ? "max-w-[min(94vw,56rem)]" : "max-w-md",
          panelClassName
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
