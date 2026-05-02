import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export function WinProbBadge({
  probability,
  size = "md",
}: {
  probability: number;
  size?: "sm" | "md" | "lg";
}) {
  const colors = useColors();
  const wp = Math.max(0, Math.min(100, probability));
  let bg = colors.muted;
  let fg = colors.mutedForeground;
  let border = colors.cardBorder;

  if (wp >= 65) {
    bg = "rgba(16,185,129,0.18)";
    fg = "#6ee7b7";
    border = "rgba(16,185,129,0.45)";
  } else if (wp >= 55) {
    bg = "rgba(251,191,36,0.18)";
    fg = "#fbbf24";
    border = "rgba(251,191,36,0.4)";
  } else if (wp >= 50) {
    bg = "rgba(148,163,184,0.18)";
    fg = "#cbd5e1";
    border = "rgba(148,163,184,0.3)";
  } else {
    bg = "rgba(239,68,68,0.15)";
    fg = "#fca5a5";
    border = "rgba(239,68,68,0.4)";
  }

  const padH = size === "lg" ? 10 : size === "sm" ? 6 : 8;
  const padV = size === "lg" ? 4 : 2;
  const fontSize = size === "lg" ? 14 : size === "sm" ? 10 : 11;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          borderColor: border,
          borderRadius: 999,
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
        }}
      >
        {wp}% WIN
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderWidth: 1, alignSelf: "flex-start" },
});
