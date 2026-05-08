import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
  onAction,
}: {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  description?: string;
  action?: string;
  onAction?: () => void;
}) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.wrap,
        {
          borderColor: colors.cardBorder,
          backgroundColor: colors.card,
          borderRadius: 16,
        },
      ]}
    >
      {/* Icon with glow ring */}
      <View
        style={[
          styles.iconRing,
          {
            backgroundColor: colors.primaryGlow,
            borderColor: colors.cardBorderActive,
          },
        ]}
      >
        <Feather name={icon} size={24} color={colors.primary} />
      </View>

      <Text style={[styles.title, { color: colors.foreground }]}>
        {title}
      </Text>

      {description ? (
        <Text style={[styles.desc, { color: colors.mutedForeground }]}>
          {description}
        </Text>
      ) : null}

      {action && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.actionBtn,
            {
              backgroundColor: colors.primaryGlow,
              borderColor: colors.cardBorderActive,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text style={[styles.actionText, { color: colors.primary }]}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    borderWidth: 1,
    gap: 10,
  },
  iconRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 15.5,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  desc: {
    fontSize: 13,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 19,
  },
  actionBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  actionText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12.5,
    letterSpacing: 0.3,
  },
});
