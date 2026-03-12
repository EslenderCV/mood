// Design System v1 — semantic tokens
// Single source of truth for semantic values.
// (Tailwind/nativewind mirrors these in tailwind.config.js)

export const colors = {
  bg: "#000000",
  surface1: "#0B0B0F",
  surface2: "#12121A",
  surface3: "#18181F",
  border: "rgba(255,255,255,0.08)",
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.70)",
  accent: "#5E17EB",
  accent2: "#EC4899",
  success: "#22C55E",
  danger: "#EF4444",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  x2: 24,
  x3: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    x2: 24,
    x3: 32,
  },
  weights: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
} as const;
