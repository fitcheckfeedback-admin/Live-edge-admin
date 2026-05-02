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
}

export function AppHeader({
  title = "Live Edge Engine",
  liveCount = 0,
  onRefresh,
  refreshing,
  showBack,
  onBack,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top + 6,
          backgroundColor: colors.background,
          borderBottomColor: colors.cardBorder,
        },
      ]}
    >
      <View style={styles.row}>
        {showBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={10}
            style={({ pressed }) => [
              styles.iconBtn,
              { borderColor: colors.cardBorder, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="arrow-left" size={18} color={colors.foreground} />
          </Pressable>
        ) : (
          <View
            style={[
              styles.iconBtn,
              {
                borderColor: "rgba(34,197,94,0.4)",
                backgroundColor: "rgba(34,197,94,0.12)",
              },
            ]}
          >
            <Feather name="activity" size={16} color={colors.primary} />
          </View>
        )}
        <Text
          style={[styles.title, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {title}
        </Text>

        <View style={styles.rightCluster}>
          {liveCount > 0 && (
            <View style={styles.liveChip}>
              <PulseDot />
              <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold", fontSize: 11 }}>
                {liveCount}
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
                  opacity: pressed || refreshing ? 0.55 : 1,
                },
              ]}
            >
              <Feather
                name="refresh-cw"
                size={16}
                color={colors.foreground}
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
  row: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 17,
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
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(34,197,94,0.1)",
  },
});
