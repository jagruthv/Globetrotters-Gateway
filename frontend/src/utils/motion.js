/**
 * Globetrotter Gateway: Framer Motion Animation & Spring Physics Presets
 * Inspired by Vibe Coding Modern Web Stack ($10,000 UI Quality)
 */

export const springPhysics = {
  snappy: { type: 'spring', stiffness: 420, damping: 28 },
  gentle: { type: 'spring', stiffness: 220, damping: 24 },
  bouncy: { type: 'spring', stiffness: 500, damping: 18 },
  layout: { type: 'spring', stiffness: 360, damping: 32 },
  slow: { type: 'spring', stiffness: 150, damping: 20 },
};

export const fadeIn = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2 },
  },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.08,
    },
  },
};

export const cardHoverVariant = {
  initial: { y: 0, scale: 1 },
  hover: {
    y: -4,
    scale: 1.01,
    transition: springPhysics.snappy,
  },
  tap: {
    scale: 0.99,
    transition: springPhysics.snappy,
  },
};

export const modalVariant = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springPhysics.layout,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 12,
    transition: { duration: 0.18 },
  },
};
