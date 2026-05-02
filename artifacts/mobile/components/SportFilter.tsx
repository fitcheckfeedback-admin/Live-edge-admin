import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

const SPORTS = ["ALL", "NBA", "MLB"] as const;
export type SportFilterValue = (typeof SPORTS)[number];

export function SportFilter({
  value,
  onChange,
}: {
  value: SportFilterValue;
  onChange: (v: SportFilterValue) => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      {SPORTS.map((s) => {
        const active = value === s;
        return (
          <Pressable
            key={s}
            onPress={() => onChange(s)}
            style={({ pressed }) => [
              styles.pill,
              {
                backgroundColor: active ? colors.primary : "transparent",
                borderColor: active ? colors.primary : colors.cardBorder,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={{
                color: active ? colors.primaryForeground : colors.foreground,
                fontFamily: "Inter_700Bold",
                fontSize: 12,
                letterSpacing: 0.4,
              }}
            >
              {s}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
});
