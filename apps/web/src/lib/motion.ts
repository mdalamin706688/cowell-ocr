/** Shared motion tokens — premium easing, consistent across the app */
export const easeOutExpo = [0.22, 1, 0.36, 1] as const;

/** Top progress bar duration — short so nav feels instant on static hosts */
export const PAGE_TRANSITION_MS = 280;

/** @deprecated No longer gates content reveal */
export const PAGE_REVEAL_DELAY_MS = 0;

/** @deprecated Skeletons no longer force a minimum display time on soft nav */
export const MIN_SKELETON_MS = 0;

/** Skeleton fade-out when handing off to content */
export const SKELETON_FADE_MS = 180;

export const springSnappy = {
  type: "spring" as const,
  stiffness: 380,
  damping: 34,
  mass: 0.85,
};

/** Softer spring — subtle page enter */
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
  duration: 0.28,
  ease: easeOutExpo,
};

export const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: springSoft,
  },
};

export type PageMotionVariant = "workspace" | "auth";

export function getPageMotion(
  variant: PageMotionVariant,
  direction: number
): {
  initial: { opacity: number; x: number; scale: number };
  animate: { opacity: number; x: number; scale: number };
  exit: { opacity: number; x: number; scale: number };
} {
  const forward = direction >= 0;
  const distance = variant === "workspace" ? 16 : 12;
  const enterX = forward ? distance : -distance;
  const exitX = forward ? -distance * 0.5 : distance * 0.5;

  return {
    initial: { opacity: 0.96, x: enterX, scale: 0.997 },
    animate: { opacity: 1, x: 0, scale: 1 },
    // Kept for API compat — page transitions are enter-only.
    exit: { opacity: 1, x: exitX, scale: 1 },
  };
}
