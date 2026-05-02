import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export function EmptyState({
  icon = "inbox",
  title,
  description,
}: {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  description?: string;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.wrap,
        {
          borderColor: colors.cardBorder,
          borderRadius: colors.radius,
        },
      ]}
    >
      <Feather name={icon} size={36} color={colors.mutedForeground} style={{ opacity: 0.55 }} />
      <Text
        style={{
          color: colors.foreground,
          fontFamily: "Inter_700Bold",
          fontSize: 15,
          marginTop: 12,
        }}
      >
        {title}
      </Text>
      {description ? (
        <Text
          style={{
            color: colors.mutedForeground,
            fontSize: 13,
            marginTop: 4,
            textAlign: "center",
            maxWidth: 280,
          }}
        >
          {description}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 56,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderStyle: "dashed",
  },
});
