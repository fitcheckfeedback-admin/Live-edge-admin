import { Feather } from "@expo/vector-icons";
import { useGetApiStatus } from "@workspace/api-client-react";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AppHeader } from "@/components/AppHeader";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useColors } from "@/hooks/useColors";

function statusBadge(status: string, colors: ReturnType<typeof useColors>) {
  if (status === "live")
    return {
      label: "Live API",
      color: colors.primary,
      icon: "check-circle" as const,
      bg: "rgba(34,197,94,0.1)",
    };
  if (status === "mock")
    return {
      label: "Model / Optional",
      color: colors.accent,
      icon: "alert-triangle" as const,
      bg: "rgba(251,191,36,0.1)",
    };
  return {
    label: "Offline",
    color: colors.destructive,
    icon: "x-circle" as const,
    bg: "rgba(220,38,38,0.1)",
  };
}

export default function SourcesScreen() {
  const colors = useColors();
  const { data, isLoading, refetch } = useGetApiStatus({
    query: { queryKey: ["/api/api-status"] },
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Data Sources"
        showBack
        onBack={() => router.back()}
        onRefresh={() => refetch()}
      />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 110, gap: 14 }}>
        {/* Honesty banner */}
        <View
          style={[
            styles.banner,
            {
              backgroundColor: "rgba(251,191,36,0.07)",
              borderColor: "rgba(251,191,36,0.4)",
            },
          ]}
        >
          <Feather
            name="info"
            size={18}
            color={colors.accent}
            style={{ marginTop: 2 }}
          />
          <View style={{ flex: 1, gap: 8 }}>
            <Text
              style={{
                color: colors.foreground,
                fontFamily: "Inter_700Bold",
                fontSize: 14,
              }}
            >
              How Live Edge Engine sources its data
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 17 }}>
              <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
                Games, scores, schedules, rosters, and player headshots
              </Text>{" "}
              are fetched live from ESPN's public APIs — there is no mock data for these.
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 17 }}>
              <Text style={{ color: colors.accent, fontFamily: "Inter_600SemiBold" }}>
                PrizePicks and Underdog do not publish public APIs.
              </Text>{" "}
              Their projection endpoints are gated behind mobile-app authentication and
              rate-limited per device. Live Edge Engine does{" "}
              <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>
                not
              </Text>{" "}
              bypass those protections. Instead, props are algorithmically generated for
              the actual players on tonight's real ESPN rosters using a transparent
              line-bias + recent-form model. Edge scores reflect{" "}
              <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>
                model confidence
              </Text>
              , not posted PrizePicks/Underdog prices.
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 17 }}>
              To wire up real sportsbook odds (DraftKings, FanDuel) add an{" "}
              <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
                ODDS_API_KEY
              </Text>{" "}
              env var on the server — see The Odds API card below.
            </Text>
          </View>
        </View>

        {/* Provider cards */}
        {isLoading ? (
          [1, 2, 3].map((i) => <SkeletonCard key={i} height={130} />)
        ) : data?.providers ? (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (data.providers as any[]).map((p) => {
            const sb = statusBadge(p.status, colors);
            return (
              <View
                key={p.name}
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontFamily: "Inter_700Bold",
                        fontSize: 15,
                      }}
                    >
                      {p.name}
                    </Text>
                    <View
                      style={[
                        styles.statusChip,
                        { backgroundColor: sb.bg, borderColor: sb.color },
                      ]}
                    >
                      <Text
                        style={{
                          color: sb.color,
                          fontFamily: "Inter_700Bold",
                          fontSize: 9.5,
                          letterSpacing: 1.1,
                        }}
                      >
                        {sb.label.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Feather name={sb.icon} size={20} color={sb.color} />
                </View>
                {p.description ? (
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontSize: 12,
                      lineHeight: 17,
                      marginTop: 10,
                    }}
                  >
                    {p.description}
                  </Text>
                ) : null}
                <View
                  style={[
                    styles.footer,
                    { borderTopColor: colors.divider },
                  ]}
                >
                  <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
                    Last checked
                  </Text>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontSize: 11,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {new Date(p.lastChecked).toLocaleTimeString()}
                  </Text>
                </View>
              </View>
            );
          })
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  banner: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  card: {
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
  },
  statusChip: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    marginTop: 12,
    borderTopWidth: 1,
  },
});
