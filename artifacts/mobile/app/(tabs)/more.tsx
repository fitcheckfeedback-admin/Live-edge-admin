import { Feather } from "@expo/vector-icons";
import { useGetAlerts, useGetDashboardSummary, useGetLiveEdge } from "@workspace/api-client-react";
import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppHeader } from "@/components/AppHeader";
import { PulseDot } from "@/components/PulseDot";
import { useColors } from "@/hooks/useColors";

interface MenuItem {
  href: "/live-edge" | "/alerts" | "/track-record" | "/results" | "/sources";
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  badgeCount?: number;
  pulse?: boolean;
  accentColor?: string;
}

function MenuCard({
  item,
  accentColor,
}: {
  item: MenuItem;
  accentColor: string;
}) {
  const colors = useColors();
  const hasBadge = (item.badgeCount ?? 0) > 0;

  return (
    <Link href={item.href} asChild>
      <Pressable
        style={({ pressed }) => [
          styles.menuCard,
          {
            backgroundColor: colors.card,
            borderColor: hasBadge ? `${accentColor}40` : colors.cardBorder,
            opacity: pressed ? 0.88 : 1,
            transform: [{ scale: pressed ? 0.985 : 1 }],
          },
        ]}
      >
        {/* Icon block */}
        <View
          style={[
            styles.iconBlock,
            {
              backgroundColor: `${accentColor}14`,
              borderColor: `${accentColor}30`,
            },
          ]}
        >
          <Feather name={item.icon} size={20} color={accentColor} />
        </View>

        {/* Text */}
        <View style={{ flex: 1 }}>
          <View style={styles.menuTitleRow}>
            <Text style={[styles.menuTitle, { color: colors.foreground }]}>
              {item.title}
            </Text>
            {item.pulse && <PulseDot />}
          </View>
          <Text
            style={[styles.menuSubtitle, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {item.subtitle}
          </Text>
        </View>

        {/* Badge or chevron */}
        {hasBadge ? (
          <View
            style={[
              styles.badge,
              { backgroundColor: accentColor },
            ]}
          >
            <Text style={styles.badgeText}>
              {(item.badgeCount ?? 0) > 99 ? "99+" : item.badgeCount}
            </Text>
          </View>
        ) : (
          <Feather name="chevron-right" size={17} color={colors.mutedForeground} />
        )}
      </Pressable>
    </Link>
  );
}

export default function MoreScreen() {
  const colors = useColors();
  const { data: live } = useGetLiveEdge({
    query: { queryKey: ["/api/live-edge"], refetchInterval: 30000 },
  });
  const { data: alertData } = useGetAlerts(
    { unreadOnly: true },
    { query: { queryKey: ["/api/alerts", { unreadOnly: true }], refetchInterval: 30000 } },
  );
  const { data: summary } = useGetDashboardSummary({
    query: { queryKey: ["/api/dashboard/summary"] },
  });

  const liveCount = live?.edges?.length ?? 0;
  const unreadAlerts = alertData?.alerts?.length ?? 0;

  const menuItems: (MenuItem & { accentColor: string })[] = [
    {
      href: "/live-edge",
      icon: "activity",
      title: "Live Edge",
      subtitle:
        liveCount > 0
          ? `${liveCount} active live projection${liveCount === 1 ? "" : "s"}`
          : "Real-time in-game projections",
      badgeCount: liveCount,
      pulse: liveCount > 0,
      accentColor: colors.primary,
    },
    {
      href: "/alerts",
      icon: "bell",
      title: "Alerts",
      subtitle:
        unreadAlerts > 0
          ? `${unreadAlerts} unread alert${unreadAlerts === 1 ? "" : "s"}`
          : "Edge spikes & late line moves",
      badgeCount: unreadAlerts,
      accentColor: colors.accent,
    },
    {
      href: "/track-record",
      icon: "bar-chart-2",
      title: "Track Record",
      subtitle: "Auto-graded picks and tier hit rates",
      accentColor: "#60a5fa",
    },
    {
      href: "/results",
      icon: "list",
      title: "Results",
      subtitle: "Full result history with CSV export",
      accentColor: "#a78bfa",
    },
    {
      href: "/sources",
      icon: "database",
      title: "Data Sources",
      subtitle: "Provider status and methodology",
      accentColor: colors.mutedForegroundBright,
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title="More" />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 110, gap: 16 }}>

        {/* Stats strip */}
        {summary ? (
          <View
            style={[
              styles.statsStrip,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <View style={[styles.statsStripe, { backgroundColor: colors.primary }]} />
            <View style={styles.statsRow}>
              {[
                { label: "GAMES", value: summary.totalGamesToday, color: colors.foreground },
                { label: "STRONG", value: summary.strongPlays, color: colors.primary },
                { label: "PROPS", value: summary.totalProps, color: colors.foreground },
                { label: "AVG EDGE", value: summary.avgEdgeScore.toFixed(1), color: colors.accent },
              ].map((s, i, arr) => (
                <View key={s.label} style={{ flexDirection: "row", flex: 1 }}>
                  <View style={[styles.statCell]}>
                    <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
                    <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>{s.label}</Text>
                  </View>
                  {i < arr.length - 1 && (
                    <View style={[styles.statDiv, { backgroundColor: colors.cardBorder }]} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Section label */}
        <View style={styles.sectionRow}>
          <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            TOOLS &amp; ANALYTICS
          </Text>
        </View>

        {/* Menu items */}
        <View style={{ gap: 10 }}>
          {menuItems.map((item) => (
            <MenuCard key={item.href} item={item} accentColor={item.accentColor} />
          ))}
        </View>

        {/* Lounge card */}
        <View
          style={[
            styles.loungeCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <View
            style={[
              styles.iconBlock,
              {
                backgroundColor: "rgba(245,158,11,0.12)",
                borderColor: "rgba(245,158,11,0.28)",
              },
            ]}
          >
            <Feather name="message-circle" size={20} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuTitle, { color: colors.foreground }]}>
              The Lounge
            </Text>
            <Text style={[styles.menuSubtitle, { color: colors.mutedForeground }]}>
              Chat picks with other users — tap the bubble in the bottom right corner.
            </Text>
          </View>
        </View>

        {/* Disclaimer */}
        <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
          FOR RESEARCH PURPOSES ONLY · NOT GAMBLING ADVICE
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  statsStrip: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  statsStripe: { height: 3, opacity: 0.7 },
  statsRow: {
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  statCell: { flex: 1, alignItems: "center", gap: 4 },
  statVal: { fontFamily: "Inter_700Bold", fontSize: 22, fontVariant: ["tabular-nums"] },
  statLbl: { fontFamily: "Inter_700Bold", fontSize: 8.5, letterSpacing: 1.3 },
  statDiv: { width: 1, marginVertical: 4 },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 2 },
  sectionDot: { width: 6, height: 6, borderRadius: 3 },
  sectionLabel: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.4 },
  menuCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: 16,
  },
  iconBlock: {
    width: 42,
    height: 42,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTitleRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 3 },
  menuTitle: { fontFamily: "Inter_700Bold", fontSize: 15 },
  menuSubtitle: { fontSize: 12, lineHeight: 17 },
  badge: {
    paddingHorizontal: 8,
    height: 22,
    minWidth: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#001a0d",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
  loungeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  disclaimer: {
    fontSize: 9.5,
    textAlign: "center",
    opacity: 0.5,
    letterSpacing: 1.2,
    marginTop: 4,
  },
});
