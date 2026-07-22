/** Shared motion tokens — premium easing, consistent across the app */
export const easeOutExpo = [0.22, 1, 0.36, 1] as const;

/** Route slide duration — synced with progress bar */
export const PAGE_TRANSITION_MS = 620;

/** Brief pause after slide before stagger reveal */
export const PAGE_REVEAL_DELAY_MS = 72;

/** Minimum time skeleton stays visible — prevents abrupt flash on fast loads */
export const MIN_SKELETON_MS = 420;

/** Skeleton fade in/out duration */
export const SKELETON_FADE_MS = 420;

export const springSnappy = {
  type: "spring" as const,
  stiffness: 380,
  damping: 34,
  mass: 0.85,
};

/** Softer spring — more visible, premium page slide */
export const springPage = {
  type: "spring" as const,
  stiffness: 165,
  damping: 24,
  mass: 1.05,
};

export const springSoft = {
  type: "spring" as const,
  stiffness: 200,
  damping: 26,
  mass: 1,
};

export const pageTransitionTween = {
  duration: 0.58,
  ease: easeOutExpo,
};

export const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 8 },
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
  const distance = variant === "workspace" ? 40 : 24;
  const enterX = forward ? distance : -distance;
  const exitX = forward ? -distance * 0.7 : distance * 0.7;

  return {
    initial: { opacity: 0.92, x: enterX, scale: 0.992 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: exitX, scale: 0.996 },
  };
}
