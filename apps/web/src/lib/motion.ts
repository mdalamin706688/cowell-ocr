/** Shared motion tokens — premium easing, consistent across the app */
export const easeOutExpo = [0.22, 1, 0.36, 1] as const;

export const springSnappy = {
  type: "spring" as const,
  stiffness: 420,
  damping: 36,
  mass: 0.7,
};

export const springSoft = {
  type: "spring" as const,
  stiffness: 280,
  damping: 32,
  mass: 0.85,
};

export const tweenFast = {
  duration: 0.22,
  ease: easeOutExpo,
};

export const tweenPage = {
  duration: 0.32,
  ease: easeOutExpo,
};

export const pageVariants = {
  initial: {
    opacity: 0,
    y: 14,
    filter: "blur(6px)",
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
  },
  exit: {
    opacity: 0,
    y: -10,
    filter: "blur(4px)",
  },
};

export const workspaceVariants = {
  initial: {
    opacity: 0,
    x: 16,
    filter: "blur(4px)",
  },
  animate: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
  },
  exit: {
    opacity: 0,
    x: -12,
    filter: "blur(3px)",
  },
};

export const loginVariants = {
  initial: { opacity: 0, y: 20, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -12, scale: 0.99 },
};
