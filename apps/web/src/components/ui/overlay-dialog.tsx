"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useSafeMotion } from "@/hooks/use-safe-motion";
import { easeOutExpo } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface OverlayDialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Accessible name when no labelled-by id */
  label?: string;
  labelledBy?: string;
  className?: string;
  /** Panel max width — default sm for confirm, none for media */
  panelClassName?: string;
  /** Darker backdrop for media preview */
  tone?: "default" | "media";
}

const overlayTransition = { duration: 0.24, ease: easeOutExpo };
const panelTransition = { duration: 0.3, ease: easeOutExpo };

/**
 * Production overlay — portal + AnimatePresence enter/exit,
 * body scroll lock, Escape, outside click. Respects reduced motion.
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
  const safeMotion = useSafeMotion();

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

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="overlay-root"
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6",
            className
          )}
          role="presentation"
          initial={safeMotion ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          exit={safeMotion ? { opacity: 0 } : undefined}
          transition={overlayTransition}
        >
          <button
            type="button"
            aria-label="閉じる"
            className={cn(
              "absolute inset-0 border-0",
              tone === "media" ? "bg-black/72" : "bg-black/55",
              "backdrop-blur-[3px]"
            )}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            aria-labelledby={labelledBy}
            className={cn(
              "relative z-10 w-full overflow-hidden rounded-2xl border bg-card shadow-[0_24px_64px_-12px_rgba(0,0,0,0.35)]",
              tone === "media"
                ? "border-white/10 max-w-[min(92vw,56rem)]"
                : "border-border/70 max-w-sm",
              panelClassName
            )}
            initial={safeMotion ? { opacity: 0, y: 14, scale: 0.96 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={safeMotion ? { opacity: 0, y: 10, scale: 0.97 } : undefined}
            transition={panelTransition}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
