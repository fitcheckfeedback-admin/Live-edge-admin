// ─────────────────────────────────────────────────────────────────────────────
// SidePill.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Drop this into artifacts/mobile/components/SidePill.tsx

import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export function SidePill({
  side,
  line,
  size = "md",
}: {
  side: "Over" | "Under";
  line?: number;
  size?: "sm" | "md";
}) {
  const colors = useColors();
  const isOver = side === "Over";
  const fontSize = size === "sm" ? 10 : 11;
  const padH = size === "sm" ? 8 : 10;

  return (
    <View
      style={[
        sidePillStyles.pill,
        {
          backgroundColor: isOver ? colors.overSoft : colors.underSoft,
          borderColor: isOver ? colors.overBorder : colors.underBorder,
          paddingHorizontal: padH,
        },
      ]}
    >
      <Text
        style={{
          color: isOver ? colors.over : colors.under,
          fontFamily: "Inter_700Bold",
          fontSize,
          letterSpacing: 0.5,
        }}
      >
        {isOver ? "▲ OVER" : "▼ UNDER"}
        {line !== undefined ? `  ${line}` : ""}
      </Text>
    </View>
  );
}

const sidePillStyles = StyleSheet.create({
  pill: {
    borderRadius: 7,
    borderWidth: 1,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
});
