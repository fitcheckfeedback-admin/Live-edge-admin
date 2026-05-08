import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, Text, View } from "react-native";

import { useBetSlip } from "@/contexts/BetSlipContext";
import { useColors } from "@/hooks/useColors";

function TabBadge({ count, color }: { count: number; color: string }) {
  if (count <= 0) return null;
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text
        style={{
          color: "#000d07",
          fontFamily: "Inter_700Bold",
          fontSize: 8.5,
          fontVariant: ["tabular-nums"],
        }}
      >
        {count > 99 ? "99+" : count}
      </Text>
    </View>
  );
}

function TabIcon({
  name,
  color,
  size,
  badge,
  badgeColor,
}: {
  name: keyof typeof Feather.glyphMap;
  color: string;
  size: number;
  badge?: number;
  badgeColor?: string;
}) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Feather name={name} size={size} color={color} />
      {badge !== undefined && badgeColor ? (
        <TabBadge count={badge} color={badgeColor} />
      ) : null}
    </View>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const slip = useBetSlip();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.backgroundElevated,
          borderTopColor: colors.cardBorder,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 88 : 68,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 26 : 10,
          // Subtle shadow upward
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 20,
        },
        tabBarLabelStyle: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 10,
          letterSpacing: 0.3,
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Board",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="zap" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: "Games",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="activity" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="slip"
        options={{
          title: "My Slip",
          tabBarIcon: ({ color, size }) => (
            <TabIcon
              name="bookmark"
              color={color}
              size={size}
              badge={slip.count}
              badgeColor={colors.primary}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="grid" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -7,
    right: -10,
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
});
