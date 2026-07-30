"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  isLoginRoute,
  RouteContentSkeleton,
} from "@/components/layout/content-skeleton";
import { useNavigation } from "@/contexts/navigation-context";
import { SKELETON_FADE_MS } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Phase = "idle" | "skeleton" | "crossfade";

/**
 * Soft-nav: height-locked skeleton overlay, then opacity crossfade into content.
 * No layout jump — only fade handoff.
 */
export function WorkspacePendingSkeleton({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { pendingHref } = useNavigation();
  const wrapRef = useRef<HTMLDivElement>(null);
  const lockedRef = useRef<number | null>(null);
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);
  const [overlayHref, setOverlayHref] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  const pendingActive =
    Boolean(pendingHref) &&
    !isLoginRoute(pathname) &&
    !isLoginRoute(pendingHref!);

  // Enter / stay on skeleton while destination is pending.
  useEffect(() => {
    if (!pendingActive || !pendingHref) return;
    setOverlayHref(pendingHref);
    setPhase("skeleton");
  }, [pendingActive, pendingHref]);

  // Destination ready → crossfade skeleton out / content in.
  useEffect(() => {
    if (pendingActive) return;
    if (phase !== "skeleton" || !overlayHref) return;

    setPhase("crossfade");
    const timer = window.setTimeout(() => {
      setPhase("idle");
      setOverlayHref(null);
    }, SKELETON_FADE_MS);

    return () => window.clearTimeout(timer);
  }, [pendingActive, phase, overlayHref]);

  const showOverlay = phase === "skeleton" || phase === "crossfade";
  const contentOpaque = phase === "idle" || phase === "crossfade";

  useLayoutEffect(() => {
    const node = wrapRef.current;
    if (!node) return;

    if (showOverlay) {
      if (lockedRef.current == null) {
        const h = Math.max(node.getBoundingClientRect().height, 560);
        lockedRef.current = h;
        setLockedHeight(h);
      }
      return;
    }

    if (lockedRef.current != null) {
      lockedRef.current = null;
      setLockedHeight(null);
    }
  }, [showOverlay]);

  const fadeMs = SKELETON_FADE_MS;
  const fadeEase = "cubic-bezier(0.22, 1, 0.36, 1)";

  return (
    <div
      ref={wrapRef}
      className="relative w-full min-h-[560px]"
      style={
        lockedHeight != null
          ? { height: lockedHeight, overflow: "hidden" }
          : undefined
      }
    >
      <div
        className={cn(!contentOpaque && "pointer-events-none select-none")}
        aria-hidden={!contentOpaque}
        style={{
          opacity: contentOpaque ? 1 : 0,
          transition: phase === "idle" && !showOverlay
            ? undefined
            : `opacity ${fadeMs}ms ${fadeEase}`,
        }}
      >
        {children}
      </div>

      {showOverlay && overlayHref ? (
        <div
          className="absolute inset-0 z-10 overflow-hidden paper-canvas"
          aria-busy={phase === "skeleton"}
          aria-live="polite"
          style={{
            opacity: phase === "crossfade" ? 0 : 1,
            transition: `opacity ${fadeMs}ms ${fadeEase}`,
            pointerEvents: phase === "crossfade" ? "none" : "auto",
          }}
        >
          <RouteContentSkeleton href={overlayHref} />
        </div>
      ) : null}
    </div>
  );
}
