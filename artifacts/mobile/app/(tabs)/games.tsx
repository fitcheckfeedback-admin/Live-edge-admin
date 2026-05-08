import { Feather } from "@expo/vector-icons";
import { useGetLiveScores, useGetScheduleToday } from "@workspace/api-client-react";
import { useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { PulseDot } from "@/components/PulseDot";
import { SkeletonCard } from "@/components/SkeletonCard";
import { SportFilter, type SportFilterValue } from "@/components/SportFilter";
import { TeamLogo } from "@/components/TeamLogo";
import { useColors } from "@/hooks/useColors";
import { formatTime } from "@/lib/format";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function GameCard({ game }: { game: any }) {
  const colors = useColors();
  const isLive = game.isLive;
  const isFinal = game.status === "final";
  const startTime = formatTime(game.startTime);

  const homeWinning =
    (isLive || isFinal) &&
    (game.homeScore ?? 0) > (game.awayScore ?? 0);
  const awayWinning =
    (isLive || isFinal) &&
    (game.awayScore ?? 0) > (game.homeScore ?? 0);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isLive ? colors.cardBorderActive : colors.cardBorder,
          borderWidth: isLive ? 1.5 : 1,
        },
        isLive && {
          shadowColor: colors.primary,
          shadowOpacity: 0.12,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 0 },
        },
      ]}
    >
      {/* Header row: sport + status */}
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.sportBadge,
            {
              backgroundColor: colors.backgroundSurface,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <Text style={[styles.sportText, { color: colors.mutedForeground }]}>
            {game.sport}
          </Text>
        </View>

        {isLive ? (
          <View style={styles.liveRow}>
            <PulseDot />
            <Text style={[styles.liveText, { color: colors.primary }]}>
              {game.period}
              {game.clock ? ` · ${game.clock}` : ""}
            </Text>
          </View>
        ) : isFinal ? (
          <Text style={[styles.finalText, { color: colors.mutedForeground }]}>
            FINAL
          </Text>
        ) : (
          <View style={styles.timeRow}>
            <Feather name="clock" size={10} color={colors.mutedForeground} />
            <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
              {startTime}
            </Text>
          </View>
        )}
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.divider }]} />

      {/* Away team */}
      <View style={styles.teamRow}>
        <View style={styles.teamLeft}>
          <TeamLogo
            logoUrl={game.awayTeam?.logoUrl}
            abbreviation={game.awayTeam?.abbreviation ?? "?"}
            color={game.awayTeam?.color}
            size={34}
          />
          <View>
            <Text
              style={[
                styles.teamName,
                {
                  color: awayWinning ? colors.foreground : colors.mutedForegroundBright,
                  fontFamily: awayWinning ? "Inter_700Bold" : "Inter_400Regular",
                },
              ]}
              numberOfLines={1}
            >
              {game.awayTeam?.name ?? game.awayTeam?.abbreviation}
            </Text>
            <Text style={[styles.teamAbbr, { color: colors.mutedForeground }]}>
              {game.awayTeam?.abbreviation} · AWAY
            </Text>
          </View>
        </View>
        {(isLive || isFinal) && (
          <Text
            style={[
              styles.score,
              {
                color: awayWinning ? colors.foreground : colors.mutedForeground,
                fontFamily: awayWinning ? "Inter_700Bold" : "Inter_600SemiBold",
              },
            ]}
          >
            {game.awayScore ?? "—"}
          </Text>
        )}
      </View>

      {/* Home team */}
      <View style={styles.teamRow}>
        <View style={styles.teamLeft}>
          <TeamLogo
            logoUrl={game.homeTeam?.logoUrl}
            abbreviation={game.homeTeam?.abbreviation ?? "?"}
            color={game.homeTeam?.color}
            size={34}
          />
          <View>
            <Text
              style={[
                styles.teamName,
                {
                  color: homeWinning ? colors.foreground : colors.mutedForegroundBright,
                  fontFamily: homeWinning ? "Inter_700Bold" : "Inter_400Regular",
                },
              ]}
              numberOfLines={1}
            >
              {game.homeTeam?.name ?? game.homeTeam?.abbreviation}
            </Text>
            <Text style={[styles.teamAbbr, { color: colors.mutedForeground }]}>
              {game.homeTeam?.abbreviation} · HOME
            </Text>
          </View>
        </View>
        {(isLive || isFinal) && (
          <Text
            style={[
              styles.score,
              {
                color: homeWinning ? colors.foreground : colors.mutedForeground,
                fontFamily: homeWinning ? "Inter_700Bold" : "Inter_600SemiBold",
              },
            ]}
          >
            {game.homeScore ?? "—"}
          </Text>
        )}
      </View>
    </View>
  );
}

function SectionHeader({
  title,
  count,
  accent,
}: {
  title: string;
  count: number;
  accent?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={sectionStyles.row}>
      <View
        style={[
          sectionStyles.dot,
          {
            backgroundColor: accent ? colors.primary : colors.mutedForeground,
          },
        ]}
      />
      <Text
        style={[
          sectionStyles.title,
          { color: accent ? colors.primary : colors.mutedForeground },
        ]}
      >
        {title.toUpperCase()}
      </Text>
      <View
        style={[
          sectionStyles.countBadge,
          {
            backgroundColor: accent ? colors.primaryGlow : colors.backgroundSurface,
            borderColor: accent ? colors.cardBorderActive : colors.cardBorder,
          },
        ]}
      >
        <Text
          style={[
            sectionStyles.countText,
            { color: accent ? colors.primary : colors.mutedForeground },
          ]}
        >
          {count}
        </Text>
      </View>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 2, marginBottom: 8 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  title: { fontFamily: "Inter_700Bold", fontSize: 10.5, letterSpacing: 1.4, flex: 1 },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  countText: { fontFamily: "Inter_700Bold", fontSize: 10, fontVariant: ["tabular-nums"] },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Section({ title, games, primary }: { title: string; games: any[]; primary?: boolean }) {
  if (games.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      <SectionHeader title={title} count={games.length} accent={primary} />
      {games.map((g) => <GameCard key={g.id} game={g} />)}
    </View>
  );
}

export default function GamesScreen() {
  const colors = useColors();
  const [sport, setSport] = useState<SportFilterValue>("ALL");

  const { data, isLoading, refetch, isRefetching } = useGetScheduleToday(
    sport !== "ALL" ? { sport: sport as "NBA" | "MLB" } : undefined,
    { query: { queryKey: ["/api/schedule/today", sport] } },
  );
  const { data: liveData } = useGetLiveScores({
    query: { queryKey: ["/api/scores/live"], refetchInterval: 15000 },
  });

  const games = useMemo(() => {
    const base = data?.games ?? [];
    const liveMap = new Map((liveData?.games ?? []).map((g) => [g.id, g]));
    return base.map((g) => liveMap.get(g.id) ?? g);
  }, [data, liveData]);

  const liveGames = games.filter((g) => g.isLive);
  const upcoming = games.filter((g) => !g.isLive && g.status !== "final");
  const finals = games.filter((g) => g.status === "final");

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Scoreboard"
        subtitle="Today's games"
        liveCount={liveGames.length}
        onRefresh={() => refetch()}
        refreshing={isRefetching}
      />
      <FlatList
        data={[1]}
        keyExtractor={() => "wrap"}
        contentContainerStyle={{ padding: 14, paddingBottom: 110, gap: 16 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 4, gap: 10 }}>
            <SportFilter value={sport} onChange={setSport} />
            {liveData?.lastUpdated ? (
              <View style={styles.updateRow}>
                <View style={[styles.updateDot, { backgroundColor: colors.over }]} />
                <Text style={[styles.updateText, { color: colors.mutedForeground }]}>
                  Scores updated{" "}
                  {new Date(liveData.lastUpdated).toLocaleTimeString()}
                </Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={() =>
          isLoading ? (
            <View style={{ gap: 10 }}>
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} height={140} />
              ))}
            </View>
          ) : games.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="No games today"
              description="There are no scheduled games for this filter."
            />
          ) : (
            <View style={{ gap: 20 }}>
              <Section title="Live Now" games={liveGames} primary />
              <Section title="Upcoming" games={upcoming} />
              <Section title="Final" games={finals} />
            </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  card: {
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sportBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
  },
  sportText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 1.2,
  },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  finalText: { fontFamily: "Inter_700Bold", fontSize: 10.5, letterSpacing: 1.5 },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  timeText: { fontSize: 12 },
  divider: { height: 1 },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  teamLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  teamName: { fontSize: 14.5, letterSpacing: -0.2 },
  teamAbbr: { fontSize: 10, marginTop: 1 },
  score: {
    fontSize: 26,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.5,
    minWidth: 36,
    textAlign: "right",
  },
  updateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  updateDot: { width: 6, height: 6, borderRadius: 3 },
  updateText: { fontSize: 11 },
});
