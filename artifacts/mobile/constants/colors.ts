/**
 * Live Edge Engine — Premium Design Tokens v2
 *
 * Aesthetic direction: "Bloomberg Terminal meets Nike Training"
 * — Deep navy/slate base with electric green accents
 * — Glassmorphism surfaces with subtle gradients
 * — Data-dense but breathable
 */

const dark = {
  // Core
  text: "#f1f5f9",
  tint: "#00ff87",

  // Backgrounds — layered depth system
  background: "#060d1a",        // Deepest base
  backgroundElevated: "#0a1628", // Cards rest here
  backgroundSurface: "#0e1e38",  // Slightly lifted

  foreground: "#f1f5f9",

  // Cards
  card: "#0a1628",
  cardForeground: "#f1f5f9",
  cardBorder: "#1a2d4a",
  cardBorderActive: "#00ff8766",
  cardGlow: "rgba(0,255,135,0.06)",

  // Primary — electric green
  primary: "#00ff87",
  primaryDim: "#00cc6a",
  primaryForeground: "#001a0d",
  primaryGlow: "rgba(0,255,135,0.15)",
  primaryGlowStrong: "rgba(0,255,135,0.25)",

  // Secondary
  secondary: "#162040",
  secondaryForeground: "#94a3b8",

  // Muted
  muted: "#111e36",
  mutedForeground: "#64748b",
  mutedForegroundBright: "#94a3b8",

  // Accent — amber/gold for "BEST" marks
  accent: "#f59e0b",
  accentDim: "#d97706",
  accentForeground: "#3d2900",
  accentGlow: "rgba(245,158,11,0.15)",

  // Danger
  destructive: "#ef4444",
  destructiveForeground: "#fef2f2",

  // Borders & Inputs
  border: "#1a2d4a",
  input: "#111e36",

  // Semantic — Over/Under
  over: "#00e676",
  overSoft: "rgba(0,230,118,0.12)",
  overBorder: "rgba(0,230,118,0.35)",
  overText: "#00e676",

  under: "#ff4d4d",
  underSoft: "rgba(255,77,77,0.12)",
  underBorder: "rgba(255,77,77,0.35)",
  underText: "#ff4d4d",

  // Surface helpers
  surfaceElev: "#0e1e38",
  surfaceMuted: "rgba(255,255,255,0.03)",
  divider: "rgba(255,255,255,0.05)",

  // Live indicator
  live: "#00ff87",
  liveGlow: "rgba(0,255,135,0.2)",

  // Score highlights
  scoreWin: "#00e676",
  scoreLoss: "#ff4d4d",
};

const colors = {
  light: dark, // Dark-only app
  dark,
  radius: 12,
};

export default colors;
