/** Shared motion tokens — premium, stable (no layout jump) */
export const easeOutExpo = [0.22, 1, 0.36, 1] as const;

/** Top progress bar — short; content unlock is independent */
export const PAGE_TRANSITION_MS = 280;

export const PAGE_REVEAL_DELAY_MS = 40;

/** Skeleton beat from click — overlaps CloudFront chunk fetch */
export const MIN_SKELETON_MS = 280;

/** Crossfade skeleton → content */
export const SKELETON_FADE_MS = 200;

/** @deprecated — pending skeleton shows immediately */
export const SKELETON_SHOW_DELAY_MS = 0;

export const springSnappy = {
  type: "spring" as const,
  stiffness: 380,
  damping: 34,
  mass: 0.85,
};

export const springPage = {
  type: "spring" as const,
  stiffness: 200,
  damping: 28,
  mass: 0.95,
};

export const springSoft = {
  type: "spring" as const,
  stiffness: 240,
  damping: 28,
  mass: 0.9,
};

export const pageTransitionTween = {
  duration: 0.36,
  ease: easeOutExpo,
};

export const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.06,
    },
  },
};

export const staggerItem = {
  hidden: { opacity: 1, y: 0 },
  show: {
    opacity: 1,
    y: 0,
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
  return {
    initial: { opacity: variant === "auth" ? 0.9 : 1, x: 0, scale: 1 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 1, x: 0, scale: 1 },
  };
}
