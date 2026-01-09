// Global spring physics configuration for snappy iOS-style animations

export const springPresets = {
  // Default snappy feel - iOS style
  snappy: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
  },
  // Extra snappy for buttons and small interactions
  button: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 25,
  },
  // Smooth for modals and larger elements
  modal: {
    type: 'spring' as const,
    stiffness: 260,
    damping: 28,
  },
  // Bouncy for playful elements
  bouncy: {
    type: 'spring' as const,
    stiffness: 350,
    damping: 20,
  },
  // Gentle for subtle movements
  gentle: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 35,
  },
} as const;

export const hoverScale = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: springPresets.button,
};

export const tapScale = {
  whileTap: { scale: 0.95 },
  transition: springPresets.button,
};

export const floatIn = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.98 },
  transition: springPresets.snappy,
};

export const slideIn = {
  initial: { opacity: 0, x: -30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 30 },
  transition: springPresets.snappy,
};
