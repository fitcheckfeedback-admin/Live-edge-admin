import { Feather } from "@expo/vector-icons";
import { useGetBestProps, useGetDashboardSummary } from "@workspace/api-client-react";
import { useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { PlayerCard, type PlayerGroup } from "@/components/PlayerCard";
import { PlayerSheet } from "@/components/PlayerSheet";
import { SkeletonCard } from "@/components/SkeletonCard";
import { SportFilter, type SportFilterValue } from "@/components/SportFilter";
import { useBetSlip } from "@/contexts/BetSlipContext";
import { useColors } from "@/hooks/useColors";
import { todayLabel } from "@/lib/format";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function groupPropsByPlayer(props: any[]): PlayerGroup[] {
  const m = new Map<string, PlayerGroup>();
  for (const p of props) {
    if (!m.has(p.playerId)) {
      m.set(p.playerId, {
        playerId: p.playerId,
        playerName: p.playerName,
        playerImage: p.playerImage,
        sport: p.sport,
        position: p.position,
        teamAbbr: p.teamAbbr,
        teamLogo: p.teamLogo,
        opponentAbbr: p.opponentAbbr,
        opponentLogo: p.opponentLogo,
        gameId: p.gameId,
        gameLabel: p.gameLabel,
        gameStartTime: p.gameStartTime,
        props: [],
        bestProp: null,
      });
    }
    m.get(p.playerId)!.props.push(p);
  }
  for (const g of m.values()) {
    g.bestProp =
      g.props.find((pp) => pp.bestPick) ??
      g.props.slice().sort(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (a: any, b: any) => (b.winProbability ?? 0) - (a.winProbability ?? 0),
      )[0];
  }
  return [...m.values()].sort(
    (a, b) => (b.bestProp.edgeScore ?? 0) - (a.bestProp.edgeScore ?? 0),
  );
}

export default function PicksScreen() {
  const colors = useColors();
  const slip = useBetSlip();
  const [sport, setSport] = useState<SportFilterValue>("ALL");
  const [activePlayer, setActivePlayer] = useState<PlayerGroup | null>(null);

  const { data, isLoading, refetch, isRefetching } = useGetBestProps(
    sport !== "ALL" ? { sport: sport as "NBA" | "MLB" } : undefined,
    { query: { queryKey: ["/api/best-props", sport] } },
  );
  const { data: summary } = useGetDashboardSummary({
    query: { queryKey: ["/api/dashboard/summary"] },
  });

  const grouped = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => groupPropsByPlayer((data?.props as any[]) ?? []),
    [data],
  );

  const live = (summary?.totalGamesToday ?? 0) > 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Best Picks"
        liveCount={live ? summary?.totalGamesToday ?? 0 : 0}
        onRefresh={() => refetch()}
        refreshing={isRefetching}
      />

      <FlatList
        data={grouped}
        keyExtractor={(g) => g.playerId}
        contentContainerStyle={{ padding: 14, paddingBottom: 110, gap: 10 }}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View>
                <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
                  {todayLabel().toUpperCase()}
                </Text>
                <Text style={[styles.headline, { color: colors.foreground }]}>
                  Today's Edge Board
                </Text>
              </View>
              {summary ? (
                <View
                  style={[
                    styles.statBubble,
                    {
                      backgroundColor: "rgba(34,197,94,0.1)",
                      borderColor: "rgba(34,197,94,0.4)",
                    },
                  ]}
                >
                  <Feather name="zap" size={12} color={colors.primary} />
                  <Text
                    style={{
                      color: colors.primary,
                      fontFamily: "Inter_700Bold",
                      fontSize: 12,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {summary.strongPlays} strong
                  </Text>
                </View>
              ) : null}
            </View>
            <SportFilter value={sport} onChange={setSport} />
          </View>
        }
        renderItem={({ item }) => (
          <PlayerCard
            group={item}
            selectedCount={item.props.filter((p) => slip.has(p.id)).length}
            onPress={() => setActivePlayer(item)}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: 10 }}>
              {[1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} height={150} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="search"
              title="No props for this filter"
              description="Try a different sport or pull to refresh."
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />

      <PlayerSheet
        open={!!activePlayer}
        onClose={() => setActivePlayer(null)}
        player={activePlayer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  dateText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10.5,
    letterSpacing: 1.4,
  },
  headline: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    marginTop: 2,
  },
  statBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
});
