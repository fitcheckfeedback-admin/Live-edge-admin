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

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isLive ? "rgba(34,197,94,0.45)" : colors.cardBorder,
          borderWidth: isLive ? 1.5 : 1,
        },
      ]}
    >
      {/* Top row */}
      <View style={styles.topRow}>
        <View style={[styles.sportBadge, { borderColor: colors.cardBorder }]}>
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 9.5,
              fontFamily: "Inter_700Bold",
              letterSpacing: 1.2,
            }}
          >
            {game.sport}
          </Text>
        </View>
        {isLive ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <PulseDot />
            <Text
              style={{
                color: colors.primary,
                fontFamily: "Inter_700Bold",
                fontSize: 11.5,
              }}
            >
              {game.period}
              {game.clock ? ` · ${game.clock}` : ""}
            </Text>
          </View>
        ) : isFinal ? (
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 11,
              fontFamily: "Inter_700Bold",
              letterSpacing: 1.4,
            }}
          >
            FINAL
          </Text>
        ) : (
          <Text style={{ color: colors.mutedForeground, fontSize: 11.5 }}>
            {startTime}
          </Text>
        )}
      </View>

      {/* Away */}
      <View style={styles.teamRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
          <TeamLogo
            logoUrl={game.awayTeam?.logoUrl}
            abbreviation={game.awayTeam?.abbreviation ?? "?"}
            color={game.awayTeam?.color}
            size={32}
          />
          <Text
            style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}
            numberOfLines={1}
          >
            {game.awayTeam?.name ?? game.awayTeam?.abbreviation}
          </Text>
        </View>
        {(isLive || isFinal) && (
          <Text
            style={{
              color: colors.foreground,
              fontFamily: "Inter_700Bold",
              fontSize: 22,
              fontVariant: ["tabular-nums"],
            }}
          >
            {game.awayScore ?? "-"}
          </Text>
        )}
      </View>

      {/* Home */}
      <View style={styles.teamRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
          <TeamLogo
            logoUrl={game.homeTeam?.logoUrl}
            abbreviation={game.homeTeam?.abbreviation ?? "?"}
            color={game.homeTeam?.color}
            size={32}
          />
          <Text
            style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}
            numberOfLines={1}
          >
            {game.homeTeam?.name ?? game.homeTeam?.abbreviation}
          </Text>
        </View>
        {(isLive || isFinal) && (
          <Text
            style={{
              color: colors.foreground,
              fontFamily: "Inter_700Bold",
              fontSize: 22,
              fontVariant: ["tabular-nums"],
            }}
          >
            {game.homeScore ?? "-"}
          </Text>
        )}
      </View>
    </View>
  );
}

function Section({
  title,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  games,
  primary,
}: {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  games: any[];
  primary?: boolean;
}) {
  const colors = useColors();
  if (games.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          color: primary ? colors.primary : colors.mutedForeground,
          fontFamily: "Inter_700Bold",
          fontSize: 11,
          letterSpacing: 1.4,
          paddingHorizontal: 4,
        }}
      >
        {title.toUpperCase()}
      </Text>
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
        title="Games Today"
        liveCount={liveGames.length}
        onRefresh={() => refetch()}
        refreshing={isRefetching}
      />
      <FlatList
        data={[1]}
        keyExtractor={() => "wrap"}
        contentContainerStyle={{ padding: 14, paddingBottom: 110, gap: 16 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 4 }}>
            <SportFilter value={sport} onChange={setSport} />
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: 11,
                marginTop: 8,
                fontVariant: ["tabular-nums"],
              }}
            >
              <Feather name="clock" size={11} />
              {"  "}
              Last update{" "}
              {liveData?.lastUpdated
                ? new Date(liveData.lastUpdated).toLocaleTimeString()
                : "—"}
            </Text>
          </View>
        }
        renderItem={() =>
          isLoading ? (
            <View style={{ gap: 10 }}>
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} height={130} />
              ))}
            </View>
          ) : games.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="No games today"
              description="There are no scheduled games for this filter."
            />
          ) : (
            <View style={{ gap: 16 }}>
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
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sportBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
});
