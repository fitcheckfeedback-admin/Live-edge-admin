import colors from "@/constants/colors";

/**
 * Returns the dark design tokens.
 *
 * Live Edge Engine is a dark-only app — the design tokens in
 * constants/colors.ts are dark-first and the light palette is
 * intentionally identical to dark. This hook skips the useColorScheme()
 * call entirely so:
 *   1. No flash of light-mode colors on first render
 *   2. No re-render when the device switches appearance
 *   3. iOS system dark-mode toggle has zero effect on the app
 */
export function useColors() {
  return { ...colors.dark, radius: colors.radius };
}
