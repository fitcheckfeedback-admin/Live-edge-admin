import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

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
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
                  backgroundColor: active
                    ? colors.primaryGlow
                    : colors.backgroundSurface,
                  borderColor: active
                    ? colors.cardBorderActive
                    : colors.cardBorder,
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <Text
                style={[
                  styles.label,
                  {
                    color: active
                      ? colors.primary
                      : colors.mutedForeground,
                    fontFamily: active ? "Inter_700Bold" : "Inter_600SemiBold",
                  },
                ]}
              >
                {s}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  label: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
