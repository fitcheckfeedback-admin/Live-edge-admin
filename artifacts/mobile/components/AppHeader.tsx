import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PulseDot } from "@/components/PulseDot";
import { useColors } from "@/hooks/useColors";

interface Props {
  title?: string;
  liveCount?: number;
  onRefresh?: () => void;
  refreshing?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  subtitle?: string;
}

export function AppHeader({
  title = "Live Edge Engine",
  liveCount = 0,
  onRefresh,
  refreshing,
  showBack,
  onBack,
  subtitle,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top + 4,
          backgroundColor: colors.background,
          borderBottomColor: colors.cardBorder,
        },
      ]}
    >
      {/* Accent line at top */}
      <View style={[styles.accentLine, { backgroundColor: colors.primary }]} />

      <View style={styles.row}>
        {showBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={10}
            style={({ pressed }) => [
              styles.iconBtn,
              {
                borderColor: colors.cardBorder,
                backgroundColor: colors.backgroundSurface,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Feather name="arrow-left" size={17} color={colors.foreground} />
          </Pressable>
        ) : (
          <View
            style={[
              styles.logoMark,
              {
                borderColor: colors.cardBorderActive,
                backgroundColor: colors.primaryGlow,
              },
            ]}
          >
            <Feather name="zap" size={15} color={colors.primary} />
          </View>
        )}

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={[styles.title, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.rightCluster}>
          {liveCount > 0 && (
            <View
              style={[
                styles.livePill,
                {
                  backgroundColor: colors.primaryGlow,
                  borderColor: colors.cardBorderActive,
                },
              ]}
            >
              <PulseDot />
              <Text
                style={{
                  color: colors.primary,
                  fontFamily: "Inter_700Bold",
                  fontSize: 11,
                  fontVariant: ["tabular-nums"],
                  letterSpacing: 0.5,
                }}
              >
                {liveCount} LIVE
              </Text>
            </View>
          )}
          {onRefresh ? (
            <Pressable
              onPress={onRefresh}
              hitSlop={10}
              disabled={refreshing}
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  borderColor: colors.cardBorder,
                  backgroundColor: colors.backgroundSurface,
                  opacity: pressed || refreshing ? 0.45 : 1,
                },
              ]}
            >
              <Feather
                name="refresh-cw"
                size={15}
                color={colors.mutedForegroundBright}
              />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: 1 },
  accentLine: {
    height: 2,
    width: 48,
    marginLeft: 16,
    marginBottom: 2,
    borderRadius: 1,
    opacity: 0.85,
  },
  row: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 1,
  },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rightCluster: { flexDirection: "row", alignItems: "center", gap: 8 },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
  },
});
