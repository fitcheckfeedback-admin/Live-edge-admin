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

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={statStyles.tile}>
      <Text style={[statStyles.val, { color: accent ? colors.primary : colors.foreground }]}>
        {value}
      </Text>
      <Text style={[statStyles.lbl, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  tile: { flex: 1, alignItems: "center" },
  val: { fontFamily: "Inter_700Bold", fontSize: 24, fontVariant: ["tabular-nums"] },
  lbl: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.3, marginTop: 3 },
});

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
        title="Edge Board"
        subtitle={todayLabel()}
        liveCount={live ? summary?.totalGamesToday ?? 0 : 0}
        onRefresh={() => refetch()}
        refreshing={isRefetching}
      />

      <FlatList
        data={grouped}
        keyExtractor={(g) => g.playerId}
        contentContainerStyle={{ padding: 14, paddingBottom: 110, gap: 10 }}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            {/* Stats hero card */}
            {summary ? (
              <View
                style={[
                  styles.heroCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                {/* Subtle green top stripe */}
                <View
                  style={[
                    styles.heroStripe,
                    { backgroundColor: colors.primary },
                  ]}
                />
                <View style={styles.heroInner}>
                  <StatTile label="GAMES TODAY" value={summary.totalGamesToday} />
                  <View style={[styles.heroDivider, { backgroundColor: colors.cardBorder }]} />
                  <StatTile label="STRONG PLAYS" value={summary.strongPlays} accent />
                  <View style={[styles.heroDivider, { backgroundColor: colors.cardBorder }]} />
                  <StatTile label="TOTAL PROPS" value={summary.totalProps} />
                  <View style={[styles.heroDivider, { backgroundColor: colors.cardBorder }]} />
                  <StatTile label="AVG EDGE" value={summary.avgEdgeScore.toFixed(1)} />
                </View>
              </View>
            ) : null}

            {/* Filter row */}
            <SportFilter value={sport} onChange={setSport} />

            {/* Section label */}
            <View style={styles.sectionRow}>
              <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                RANKED BY EDGE SCORE
              </Text>
              <Text style={[styles.countBadge, { color: colors.mutedForeground }]}>
                {grouped.length} players
              </Text>
            </View>
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
                <SkeletonCard key={i} height={160} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="zap-off"
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
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  heroStripe: {
    height: 3,
    opacity: 0.7,
  },
  heroInner: {
    flexDirection: "row",
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  heroDivider: { width: 1, marginVertical: 4 },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 2,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1.4,
    flex: 1,
  },
  countBadge: {
    fontSize: 11,
  },
});
