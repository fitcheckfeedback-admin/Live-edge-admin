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
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: isOver ? colors.overSoft : colors.underSoft,
          borderColor: isOver ? colors.overBorder : colors.underBorder,
        },
      ]}
    >
      <Text
        style={{
          color: isOver ? colors.over : colors.under,
          fontFamily: "Inter_700Bold",
          fontSize,
          letterSpacing: 0.6,
        }}
      >
        {isOver ? "▲ MORE" : "▼ LESS"}
        {line !== undefined ? ` ${line}` : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
});
