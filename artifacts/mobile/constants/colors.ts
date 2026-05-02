/**
 * Live Edge Engine — design tokens
 *
 * Synced from sibling web artifact (artifacts/live-edge-engine/src/index.css).
 * Dark-mode first to match the web app, which forces dark mode.
 */

const dark = {
  text: "#f8fafc",
  tint: "#22c55e",

  background: "#0c1426",
  foreground: "#f8fafc",

  card: "#0f1729",
  cardForeground: "#f8fafc",
  cardBorder: "#1a2540",

  primary: "#22c55e",
  primaryForeground: "#00321a",

  secondary: "#1e293b",
  secondaryForeground: "#f8fafc",

  muted: "#1e293b",
  mutedForeground: "#94a3b8",

  accent: "#fbbf24",
  accentForeground: "#3d2900",

  destructive: "#dc2626",
  destructiveForeground: "#fef2f2",

  border: "#1e293b",
  input: "#1e293b",

  // Semantic helpers (used across screens)
  over: "#10b981",
  overSoft: "rgba(16, 185, 129, 0.15)",
  overBorder: "rgba(16, 185, 129, 0.4)",
  under: "#ef4444",
  underSoft: "rgba(239, 68, 68, 0.15)",
  underBorder: "rgba(239, 68, 68, 0.4)",

  surfaceElev: "#162038",
  surfaceMuted: "rgba(255,255,255,0.04)",
  divider: "rgba(255,255,255,0.06)",
};

const colors = {
  light: dark,
  dark,
  radius: 10,
};

export default colors;
