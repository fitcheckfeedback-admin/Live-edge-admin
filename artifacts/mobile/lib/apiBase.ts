/**
 * Resolves the absolute base URL for all API traffic (generated hooks + Lounge chat).
 *
 * Native React Native fetch has no concept of an "origin" — relative paths like
 * `/api/...` will fail. We MUST have an absolute URL baked in at build time via
 * `EXPO_PUBLIC_DOMAIN` (set automatically by Replit's Expo Launch).
 *
 * If the domain is missing or malformed, return null so the root layout can
 * render a blocking config-error screen instead of silently shipping a broken app.
 */
export function resolveApiBaseUrl(): string | null {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain || typeof domain !== "string") return null;
  const trimmed = domain.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!trimmed || trimmed.includes(" ") || !trimmed.includes(".")) return null;
  return `https://${trimmed}`;
}

export const API_BASE_URL = resolveApiBaseUrl();
