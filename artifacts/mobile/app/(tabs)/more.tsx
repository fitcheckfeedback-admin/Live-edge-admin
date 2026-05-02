import { Feather } from "@expo/vector-icons";
import { useGetAlerts, useGetDashboardSummary, useGetLiveEdge } from "@workspace/api-client-react";
import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppHeader } from "@/components/AppHeader";
import { PulseDot } from "@/components/PulseDot";
import { useColors } from "@/hooks/useColors";

interface Item {
  href: "/live-edge" | "/alerts" | "/track-record" | "/results" | "/sources";
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  badgeCount?: number;
  badgeColor?: string;
  pulse?: boolean;
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

  const items: Item[] = [
    {
      href: "/live-edge",
      icon: "activity",
      title: "Live Edge",
      subtitle: liveCount > 0 ? `${liveCount} active live projection${liveCount === 1 ? "" : "s"}` : "Real-time in-game projections",
      badgeCount: liveCount,
      badgeColor: colors.primary,
      pulse: liveCount > 0,
    },
    {
      href: "/alerts",
      icon: "bell",
      title: "Alerts",
      subtitle: unreadAlerts > 0 ? `${unreadAlerts} unread alert${unreadAlerts === 1 ? "" : "s"}` : "Edge spikes, late line moves",
      badgeCount: unreadAlerts,
      badgeColor: colors.accent,
    },
    {
      href: "/track-record",
      icon: "bar-chart-2",
      title: "Track Record",
      subtitle: "Auto-graded picks and tier hit rates",
    },
    {
      href: "/results",
      icon: "list",
      title: "Results",
      subtitle: "Full result history with CSV export",
    },
    {
      href: "/sources",
      icon: "database",
      title: "Data Sources",
      subtitle: "Provider status and methodology",
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title="More" />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 110, gap: 16 }}>
        {/* Hero stats */}
        {summary ? (
          <View
            style={[
              styles.heroGrid,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <View style={styles.heroCell}>
              <Text style={[styles.heroLbl, { color: colors.mutedForeground }]}>GAMES</Text>
              <Text style={[styles.heroVal, { color: colors.foreground }]}>
                {summary.totalGamesToday}
              </Text>
            </View>
            <View style={[styles.heroCell, { borderLeftColor: colors.cardBorder, borderLeftWidth: 1 }]}>
              <Text style={[styles.heroLbl, { color: colors.mutedForeground }]}>STRONG</Text>
              <Text style={[styles.heroVal, { color: colors.primary }]}>
                {summary.strongPlays}
              </Text>
            </View>
            <View style={[styles.heroCell, { borderLeftColor: colors.cardBorder, borderLeftWidth: 1 }]}>
              <Text style={[styles.heroLbl, { color: colors.mutedForeground }]}>PROPS</Text>
              <Text style={[styles.heroVal, { color: colors.foreground }]}>
                {summary.totalProps}
              </Text>
            </View>
            <View style={[styles.heroCell, { borderLeftColor: colors.cardBorder, borderLeftWidth: 1 }]}>
              <Text style={[styles.heroLbl, { color: colors.mutedForeground }]}>EDGE</Text>
              <Text style={[styles.heroVal, { color: colors.accent }]}>
                {summary.avgEdgeScore.toFixed(1)}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Menu items */}
        <View style={{ gap: 10 }}>
          {items.map((it) => (
            <Link key={it.href} href={it.href} asChild>
              <Pressable
                style={({ pressed }) => [
                  styles.menuItem,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.menuIcon,
                    {
                      backgroundColor: "rgba(34,197,94,0.12)",
                      borderColor: "rgba(34,197,94,0.3)",
                    },
                  ]}
                >
                  <Feather name={it.icon} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontFamily: "Inter_700Bold",
                        fontSize: 15,
                      }}
                    >
                      {it.title}
                    </Text>
                    {it.pulse && <PulseDot />}
                  </View>
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    {it.subtitle}
                  </Text>
                </View>
                {it.badgeCount && it.badgeCount > 0 ? (
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: it.badgeColor ?? colors.primary,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: "#001a0d",
                        fontFamily: "Inter_700Bold",
                        fontSize: 11,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {it.badgeCount > 99 ? "99+" : it.badgeCount}
                    </Text>
                  </View>
                ) : null}
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </Pressable>
            </Link>
          ))}
        </View>

        {/* Lounge promo card */}
        <View
          style={[
            styles.loungePromo,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <View
            style={[
              styles.menuIcon,
              {
                backgroundColor: "rgba(251,191,36,0.12)",
                borderColor: "rgba(251,191,36,0.3)",
              },
            ]}
          >
            <Feather name="message-circle" size={20} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 15 }}>
              The Lounge
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 2 }}>
              Tap the chat bubble (bottom right) on any screen to talk picks with other users.
            </Text>
          </View>
        </View>

        <Text
          style={{
            color: colors.mutedForeground,
            fontSize: 10,
            textAlign: "center",
            opacity: 0.55,
            marginTop: 8,
            letterSpacing: 1.2,
          }}
        >
          FOR RESEARCH PURPOSES ONLY · NOT GAMBLING ADVICE
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  heroGrid: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  heroCell: { flex: 1, alignItems: "center", paddingVertical: 14, gap: 4 },
  heroLbl: {
    fontFamily: "Inter_700Bold",
    fontSize: 9.5,
    letterSpacing: 1.4,
  },
  heroVal: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    fontVariant: ["tabular-nums"],
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: 14,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    paddingHorizontal: 8,
    height: 22,
    minWidth: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  loungePromo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
});
