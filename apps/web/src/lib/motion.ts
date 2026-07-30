/** Shared motion tokens — premium easing, consistent across the app */
export const easeOutExpo = [0.22, 1, 0.36, 1] as const;

/** Top progress bar duration */
export const PAGE_TRANSITION_MS = 360;

/** Brief pause after slide before stagger reveal */
export const PAGE_REVEAL_DELAY_MS = 40;

/**
 * Tiny debounce before content skeleton (1 frame).
 * Long enough to skip aborted clicks; short enough to feel instant on CloudFront.
 */
export const SKELETON_SHOW_DELAY_MS = 32;

/** Soft minimum shimmer once a skeleton is shown (avoids 1-frame flicker) */
export const MIN_SKELETON_MS = 180;

/** Skeleton fade-out when handing off to content */
export const SKELETON_FADE_MS = 200;

export const springSnappy = {
  type: "spring" as const,
  stiffness: 380,
  damping: 34,
  mass: 0.85,
};

export const springPage = {
  type: "spring" as const,
  stiffness: 220,
  damping: 28,
  mass: 0.95,
};

export const springSoft = {
  type: "spring" as const,
  stiffness: 260,
  damping: 28,
  mass: 0.9,
};

export const pageTransitionTween = {
  duration: 0.32,
  ease: easeOutExpo,
};

export const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};

export const staggerItem = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: springSoft,
  },
};

export type PageMotionVariant = "workspace" | "auth";

export function getPageMotion(
  variant: PageMotionVariant,
  _direction: number
): {
  initial: { opacity: number; x: number; scale: number };
  animate: { opacity: number; x: number; scale: number };
  exit: { opacity: number; x: number; scale: number };
} {
  const auth = variant === "auth";
  return {
    initial: { opacity: auth ? 0.92 : 0.98, x: 0, scale: 1 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 1, x: 0, scale: 1 },
  };
}
