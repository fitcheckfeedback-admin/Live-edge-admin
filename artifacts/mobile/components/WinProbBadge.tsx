import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

/**
 * Win probability badge.
 *
 * Thresholds match the backend clamp (32–88%):
 *  ≥ 70%  → green  (High confidence)
 *  ≥ 58%  → amber  (Medium)
 *  ≥ 50%  → slate  (Coin flip)
 *  < 50%  → red    (Avoid)
 */
export function WinProbBadge({
  probability,
  size = "md",
}: {
  probability: number;
  size?: "sm" | "md" | "lg";
}) {
  const colors = useColors();
  const wp = Math.max(0, Math.min(100, Math.round(probability)));

  // Color tiers
  let bg: string;
  let fg: string;
  let border: string;

  if (wp >= 70) {
    bg = colors.overSoft;
    fg = colors.over;
    border = colors.overBorder;
  } else if (wp >= 58) {
    bg = colors.accentGlow;
    fg = colors.accent;
    border = `${colors.accent}50`;
  } else if (wp >= 50) {
    bg = colors.backgroundSurface;
    fg = colors.mutedForegroundBright;
    border = colors.cardBorder;
  } else {
    bg = colors.underSoft;
    fg = colors.under;
    border = colors.underBorder;
  }

  const padH = size === "lg" ? 12 : size === "sm" ? 6 : 9;
  const padV = size === "lg" ? 5 : size === "sm" ? 2 : 3;
  const fontSize = size === "lg" ? 14 : size === "sm" ? 10 : 11.5;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          borderColor: border,
          paddingHorizontal: padH,
          paddingVertical: padV,
        },
      ]}
    >
      <Text
        style={{
          color: fg,
          fontSize,
          fontFamily: "Inter_700Bold",
          fontVariant: ["tabular-nums"],
          letterSpacing: 0.3,
        }}
      >
        {wp}% WIN
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
});
