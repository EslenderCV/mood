// Design System v1 — motion presets
// Keep these numbers consistent across the app.

export const motion = {
  duration: {
    fast: 120,
    base: 180,
    slow: 260,
  },
  spring: {
    // Good default spring for iOS/Android
    default: {
      damping: 18,
      stiffness: 220,
      mass: 0.9,
    },
  },
  pressed: {
    scaleTo: 0.98,
  },
} as const;
