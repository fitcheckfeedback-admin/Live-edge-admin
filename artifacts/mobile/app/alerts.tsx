import { Feather } from "@expo/vector-icons";
import {
  useGetBestProps,
  useGetLiveScores,
  useGetScheduleToday,
} from "@workspace/api-client-react";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PulseDot } from "@/components/PulseDot";
import { SkeletonCard } from "@/components/SkeletonCard";
import { TeamLogo } from "@/components/TeamLogo";
import { useColors } from "@/hooks/useColors";
import { formatTime } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = "confidence" | "startTime" | "edgeScore";
type StatusFilter = "ALL" | "LIVE" | "UPCOMING";

interface Badge {
  label: string;
  color: string;
  bg: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSourceLabel(propType: string): { label: string; color: string } {
  const pp = [
    "Points", "Rebounds", "Assists", "Pts+Reb+Ast", "3-Pointers Made",
    "Total Bases", "Hits+Runs+RBIs", "Pitcher Strikeouts", "Hits",
    "Points + Assists", "Points + Rebounds", "Steals", "Blocks",
  ];
  const dk = ["Home Runs", "Runs", "RBIs", "Walks", "Earned Runs"];
  if (pp.some((t) => propType.includes(t)))
    return { label: "PrizePicks", color: "#7c3aed" };
  if (dk.some((t) => propType.includes(t)))
    return { label: "DraftKings", color: "#2d7dd2" };
  return { label: "Underdog", color: "#f59e0b" };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getBadges(prop: any, isLive: boolean, colors: ReturnType<typeof useColors>): Badge[] {
  const badges: Badge[] = [];
  const wp: number = prop.winProbability ?? 0;
  const trend: string = prop.trend ?? "";
  const action: string = prop.action ?? "";

  if (wp >= 80)
    badges.push({ label: "🔥 HOT", color: "#ff6b35", bg: "rgba(255,107,53,0.14)" });
  else if (wp >= 70)
    badges.push({ label: "HIGH CONFIDENCE", color: colors.primary, bg: colors.primaryGlow });

  if (trend === "up")
    badges.push({ label: "TRENDING ↑", color: colors.accent, bg: colors.accentGlow });
  if (action === "Trap Line")
    badges.push({ label: "LINE MOVED", color: "#60a5fa", bg: "rgba(96,165,250,0.12)" });
  if (isLive)
    badges.push({ label: "LIVE NOW", color: colors.primary, bg: colors.primaryGlow });

  return badges;
}

// ─── BadgePill ────────────────────────────────────────────────────────────────

function BadgePill({ badge }: { badge: Badge }) {
  return (
    <View style={[badgeS.pill, { backgroundColor: badge.bg }]}>
      <Text style={[badgeS.text, { color: badge.color }]}>{badge.label}</Text>
    </View>
  );
}
const badgeS = StyleSheet.create({
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  text: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.8 },
});

// ─── PropRow ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PropRow({ prop, isLive }: { prop: any; isLive: boolean }) {
  const colors = useColors();
  const isOver = String(prop.recommendation ?? "").includes("Over");
  const wp: number = prop.winProbability ?? 50;
  const wpColor = wp >= 70 ? colors.primary : wp >= 57 ? colors.accent : colors.mutedForeground;
  const source = getSourceLabel(prop.propType ?? "");
  const badges = getBadges(prop, isLive, colors);

  return (
    <View
      style={[
        propS.row,
        {
          backgroundColor: colors.backgroundElevated,
          borderColor: wp >= 70 ? colors.cardBorderActive : colors.cardBorder,
        },
      ]}
    >
      <View style={[propS.stripe, { backgroundColor: isOver ? colors.over : colors.under }]} />
      <PlayerAvatar src={prop.playerImage} name={prop.playerName} size={40} />
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <View style={propS.nameRow}>
          <Text style={[propS.name, { color: colors.foreground }]} numberOfLines={1}>
            {prop.playerName}
          </Text>
          <View style={[propS.sourceTag, { backgroundColor: `${source.color}18`, borderColor: `${source.color}40` }]}>
            <Text style={[propS.sourceText, { color: source.color }]}>{source.label}</Text>
          </View>
        </View>
        <Text style={[propS.meta, { color: colors.mutedForeground }]} numberOfLines={1}>
          {prop.propType}{"  ·  "}Line {prop.line}{"  ·  "}{isOver ? "OVER ▲" : "UNDER ▼"}
        </Text>
        {badges.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
            <View style={{ flexDirection: "row", gap: 5 }}>
              {badges.map((b) => <BadgePill key={b.label} badge={b} />)}
            </View>
          </ScrollView>
        )}
        {!!prop.reasoning && (
          <Text style={[propS.reason, { color: colors.mutedForeground }]} numberOfLines={2}>
            {prop.reasoning}
          </Text>
        )}
      </View>
      <View style={propS.wpCol}>
        <Text style={[propS.wpNum, { color: wpColor }]}>{wp}%</Text>
        <Text style={[propS.wpLabel, { color: colors.mutedForeground }]}>WIN</Text>
        <View style={[propS.availDot, { backgroundColor: isLive ? colors.primary : colors.over }]} />
      </View>
    </View>
  );
}

const propS = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "flex-start",
    gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, overflow: "hidden",
  },
  stripe: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  name: { fontFamily: "Inter_700Bold", fontSize: 13.5, flex: 1 },
  sourceTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  sourceText: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.6 },
  meta: { fontSize: 11 },
  reason: { fontSize: 10.5, lineHeight: 15, marginTop: 4, opacity: 0.8 },
  wpCol: { alignItems: "center", gap: 2, minWidth: 38 },
  wpNum: { fontFamily: "Inter_700Bold", fontSize: 18, fontVariant: ["tabular-nums"] },
  wpLabel: { fontFamily: "Inter_700Bold", fontSize: 8.5, letterSpacing: 1 },
  availDot: { width: 7, height: 7, borderRadius: 3.5, marginTop: 2 },
});

// ─── GameGroupCard ────────────────────────────────────────────────────────────

function GameGroupCard({
  game,
  props,
  isLive,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  game: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any[];
  isLive: boolean;
}) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(true);
  const startTime = formatTime(game.startTime);
  const strongCount = props.filter((p) => (p.winProbability ?? 0) >= 70).length;
  const sport: string = props[0]?.sport ?? game.sport ?? "";
  const hasScore = isLive && game.homeScore != null && game.awayScore != null;

  return (
    <View
      style={[
        gameS.card,
        {
          backgroundColor: colors.card,
          borderColor: isLive ? colors.cardBorderActive : colors.cardBorder,
          borderWidth: isLive ? 1.5 : 1,
        },
        isLive && {
          shadowColor: colors.primary,
          shadowOpacity: 0.1,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 0 },
        },
      ]}
    >
      {/* Top accent stripe */}
      <View style={[gameS.topStripe, { backgroundColor: isLive ? colors.primary : colors.cardBorder }]} />

      {/* Header row — always visible, tap to expand/collapse */}
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [gameS.header, { opacity: pressed ? 0.85 : 1 }]}
      >
        {/* Team logos + score/time center block */}
        <View style={gameS.matchupBlock}>
          {/* Away team */}
          <View style={gameS.teamCol}>
            <TeamLogo
              logoUrl={game.awayTeam?.logoUrl}
              abbreviation={game.awayTeam?.abbreviation ?? "?"}
              color={game.awayTeam?.color}
              size={32}
            />
            <Text style={[gameS.teamAbbr, { color: colors.mutedForeground }]}>
              {game.awayTeam?.abbreviation}
            </Text>
          </View>

          {/* Center */}
          <View style={gameS.centerBlock}>
            {hasScore ? (
              <View style={gameS.scoreRow}>
                <Text
                  style={[
                    gameS.scoreNum,
                    {
                      color: game.awayScore > game.homeScore ? colors.foreground : colors.mutedForeground,
                      fontFamily: game.awayScore > game.homeScore ? "Inter_700Bold" : "Inter_400Regular",
                    },
                  ]}
                >
                  {game.awayScore}
                </Text>
                <Text style={[gameS.scoreDash, { color: colors.mutedForeground }]}>—</Text>
                <Text
                  style={[
                    gameS.scoreNum,
                    {
                      color: game.homeScore > game.awayScore ? colors.foreground : colors.mutedForeground,
                      fontFamily: game.homeScore > game.awayScore ? "Inter_700Bold" : "Inter_400Regular",
                    },
                  ]}
                >
                  {game.homeScore}
                </Text>
              </View>
            ) : (
              <Text style={[gameS.startTime, { color: colors.foreground }]}>
                {startTime || "TBD"}
              </Text>
            )}

            {isLive ? (
              <View style={gameS.liveRow}>
                <PulseDot />
                <Text style={[gameS.liveText, { color: colors.primary }]}>
                  {game.period ?? "LIVE"}{game.clock ? `  ${game.clock}` : ""}
                </Text>
              </View>
            ) : (
              <View style={[gameS.sportTag, { backgroundColor: colors.backgroundSurface, borderColor: colors.cardBorder }]}>
                <Text style={[gameS.sportText, { color: colors.mutedForeground }]}>{sport}</Text>
              </View>
            )}
          </View>

          {/* Home team */}
          <View style={gameS.teamCol}>
            <TeamLogo
              logoUrl={game.homeTeam?.logoUrl}
              abbreviation={game.homeTeam?.abbreviation ?? "?"}
              color={game.homeTeam?.color}
              size={32}
            />
            <Text style={[gameS.teamAbbr, { color: colors.mutedForeground }]}>
              {game.homeTeam?.abbreviation}
            </Text>
          </View>
        </View>

        {/* Right meta: strong pill + pick count + chevron */}
        <View style={gameS.rightMeta}>
          {strongCount > 0 && (
            <View style={[gameS.strongPill, { backgroundColor: colors.primaryGlow, borderColor: colors.cardBorderActive }]}>
              <Feather name="zap" size={9} color={colors.primary} />
              <Text style={[gameS.strongText, { color: colors.primary }]}>{strongCount} strong</Text>
            </View>
          )}
          <View style={[gameS.countPill, { backgroundColor: colors.backgroundSurface, borderColor: colors.cardBorder }]}>
            <Text style={[gameS.countText, { color: colors.mutedForeground }]}>
              {props.length} pick{props.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <Feather name={expanded ? "chevron-up" : "chevron-down"} size={15} color={colors.mutedForeground} />
        </View>
      </Pressable>

      {/* Props list */}
      {expanded && (
        <View style={[gameS.propsContainer, { borderTopColor: colors.divider }]}>
          {props.map((p) => <PropRow key={p.id} prop={p} isLive={isLive} />)}
        </View>
      )}
    </View>
  );
}

const gameS = StyleSheet.create({
  card: { borderRadius: 16, overflow: "hidden" },
  topStripe: { height: 2.5 },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 14, gap: 12,
  },
  matchupBlock: {
    flex: 1, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 10,
  },
  teamCol: { alignItems: "center", gap: 4, width: 44 },
  teamAbbr: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.5 },
  centerBlock: { alignItems: "center", gap: 5, flex: 1 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  scoreNum: { fontSize: 22, fontVariant: ["tabular-nums"], letterSpacing: -0.5 },
  scoreDash: { fontSize: 16 },
  startTime: { fontFamily: "Inter_700Bold", fontSize: 15, letterSpacing: -0.2 },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  liveText: { fontFamily: "Inter_700Bold", fontSize: 10.5, letterSpacing: 0.5 },
  sportTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, borderWidth: 1 },
  sportText: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.2 },
  rightMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  strongPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
  },
  strongText: { fontFamily: "Inter_700Bold", fontSize: 9.5 },
  countPill: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  countText: { fontSize: 10 },
  propsContainer: { borderTopWidth: 1, padding: 10, gap: 8 },
});

// ─── Filter bar ───────────────────────────────────────────────────────────────

function FilterBar({
  status, setStatus, sort, setSort, sport, setSport,
}: {
  status: StatusFilter; setStatus: (v: StatusFilter) => void;
  sort: SortKey; setSort: (v: SortKey) => void;
  sport: string; setSport: (v: string) => void;
}) {
  const colors = useColors();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={filterS.row}>
        {(["ALL", "LIVE", "UPCOMING"] as StatusFilter[]).map((s) => (
          <Pressable
            key={s}
            onPress={() => setStatus(s)}
            style={[
              filterS.pill,
              {
                backgroundColor: status === s ? colors.primaryGlow : colors.backgroundSurface,
                borderColor: status === s ? colors.cardBorderActive : colors.cardBorder,
              },
            ]}
          >
            <Text style={[filterS.pillText, { color: status === s ? colors.primary : colors.mutedForeground }]}>
              {s === "LIVE" ? "🔴 Live" : s === "UPCOMING" ? "🕐 Upcoming" : "All"}
            </Text>
          </Pressable>
        ))}

        <View style={[filterS.divider, { backgroundColor: colors.cardBorder }]} />

        {["ALL", "NBA", "MLB"].map((s) => (
          <Pressable
            key={s}
            onPress={() => setSport(s)}
            style={[
              filterS.pill,
              {
                backgroundColor: sport === s ? colors.backgroundSurface : "transparent",
                borderColor: sport === s ? colors.cardBorder : "transparent",
              },
            ]}
          >
            <Text style={[filterS.pillText, { color: sport === s ? colors.foreground : colors.mutedForeground }]}>
              {s}
            </Text>
          </Pressable>
        ))}

        <View style={[filterS.divider, { backgroundColor: colors.cardBorder }]} />

        {([
          { label: "Confidence", value: "confidence" },
          { label: "Start Time", value: "startTime" },
          { label: "Edge Score", value: "edgeScore" },
        ] as { label: string; value: SortKey }[]).map((o) => (
          <Pressable
            key={o.value}
            onPress={() => setSort(o.value)}
            style={[
              filterS.pill,
              {
                backgroundColor: sort === o.value ? colors.accentGlow : "transparent",
                borderColor: sort === o.value ? `${colors.accent}40` : "transparent",
              },
            ]}
          >
            <Text style={[filterS.pillText, { color: sort === o.value ? colors.accent : colors.mutedForeground }]}>
              ↕ {o.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const filterS = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  pillText: { fontFamily: "Inter_600SemiBold", fontSize: 11.5 },
  divider: { width: 1, height: 18, marginHorizontal: 4 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AlertsScreen() {
  const colors = useColors();
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [sort, setSort] = useState<SortKey>("confidence");
  const [sport, setSport] = useState("ALL");

  const { data: propsData, isLoading, refetch, isRefetching } = useGetBestProps(undefined, {
    query: { queryKey: ["/api/best-props", "alerts"], refetchInterval: 60_000 },
  });
  const { data: scheduleData } = useGetScheduleToday(undefined, {
    query: { queryKey: ["/api/schedule/today", "alerts"], refetchInterval: 60_000 },
  });
  const { data: liveData } = useGetLiveScores({
    query: { queryKey: ["/api/scores/live", "alerts"], refetchInterval: 15_000 },
  });

  // Merge schedule + live scores
  const gameMap = useMemo(() => {
    const base = scheduleData?.games ?? [];
    const liveMap = new Map((liveData?.games ?? []).map((g) => [g.id, g]));
    const merged = base.map((g) => liveMap.get(g.id) ?? g);
    return new Map(merged.map((g) => [g.id, g]));
  }, [scheduleData, liveData]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allProps: any[] = propsData?.props ?? [];

  // Filter: bestPick only, winProb >= 60, no finished games
  const qualified = useMemo(() => allProps.filter((p) => {
    if (!p.bestPick) return false;
    if ((p.winProbability ?? 0) < 60) return false;
    const game = p.gameId ? gameMap.get(p.gameId) : null;
    if (game?.status === "final") return false;
    return true;
  }), [allProps, gameMap]);

  // Status + sport filter
  const filtered = useMemo(() => qualified.filter((p) => {
    if (sport !== "ALL" && p.sport !== sport) return false;
    const game = p.gameId ? gameMap.get(p.gameId) : null;
    if (status === "LIVE" && !game?.isLive) return false;
    if (status === "UPCOMING" && game?.isLive) return false;
    return true;
  }), [qualified, sport, status, gameMap]);

  // Sort
  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    if (sort === "confidence") return (b.winProbability ?? 0) - (a.winProbability ?? 0);
    if (sort === "edgeScore") return (b.edgeScore ?? 0) - (a.edgeScore ?? 0);
    if (sort === "startTime") {
      const ta = a.gameStartTime ? new Date(a.gameStartTime).getTime() : Infinity;
      const tb = b.gameStartTime ? new Date(b.gameStartTime).getTime() : Infinity;
      return ta - tb;
    }
    return 0;
  }), [filtered, sort]);

  // Group by game, live games first
  const gameGroups = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = new Map<string, { game: any; props: any[] }>();
    for (const p of sorted) {
      const gid = p.gameId ?? `ungrouped_${p.teamAbbr}`;
      if (!m.has(gid)) {
        const game = gameMap.get(gid) ?? {
          id: gid,
          awayTeam: { abbreviation: p.opponentAbbr },
          homeTeam: { abbreviation: p.teamAbbr },
          startTime: p.gameStartTime,
          isLive: false,
          status: "scheduled",
          sport: p.sport,
        };
        m.set(gid, { game, props: [] });
      }
      m.get(gid)!.props.push(p);
    }
    return [...m.values()].sort((a, b) => {
      if (a.game.isLive && !b.game.isLive) return -1;
      if (!a.game.isLive && b.game.isLive) return 1;
      const ta = a.game.startTime ? new Date(a.game.startTime).getTime() : Infinity;
      const tb = b.game.startTime ? new Date(b.game.startTime).getTime() : Infinity;
      return ta - tb;
    });
  }, [sorted, gameMap]);

  const strongCount = sorted.filter((p) => (p.winProbability ?? 0) >= 70).length;
  const onRefresh = useCallback(() => { refetch(); }, [refetch]);

  return (
    <View style={[mainS.root, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Betting Alerts"
        subtitle={`${sorted.length} picks · ${strongCount} strong`}
        showBack
        onBack={() => router.back()}
        onRefresh={onRefresh}
        refreshing={isRefetching}
      />

      <FlatList
        data={gameGroups}
        keyExtractor={(g) => g.game.id}
        contentContainerStyle={{ padding: 14, paddingBottom: 110, gap: 14 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <FilterBar status={status} setStatus={setStatus} sort={sort} setSort={setSort} sport={sport} setSport={setSport} />
            {liveData?.lastUpdated && (
              <View style={mainS.updateRow}>
                <View style={[mainS.updateDot, { backgroundColor: colors.over }]} />
                <Text style={[mainS.updateText, { color: colors.mutedForeground }]}>
                  Scores updated {new Date(liveData.lastUpdated).toLocaleTimeString()}{"  ·  "}alerts refresh every 60s
                </Text>
              </View>
            )}
            {gameGroups.length > 0 && (
              <View style={mainS.sectionRow}>
                <View style={[mainS.sectionDot, { backgroundColor: colors.primary }]} />
                <Text style={[mainS.sectionLabel, { color: colors.mutedForeground }]}>
                  AVAILABLE NOW — GROUPED BY GAME
                </Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <GameGroupCard game={item.game} props={item.props} isLive={item.game.isLive ?? false} />
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: 12 }}>
              {[1, 2, 3].map((i) => <SkeletonCard key={i} height={160} />)}
            </View>
          ) : (
            <EmptyState
              icon="bell-off"
              title="No alerts right now"
              description="High-confidence picks appear here when today's games have qualifying edges. Check back closer to game time."
            />
          )
        }
      />
    </View>
  );
}

const mainS = StyleSheet.create({
  root: { flex: 1 },
  updateRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  updateDot: { width: 6, height: 6, borderRadius: 3 },
  updateText: { fontSize: 10.5, flex: 1 },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 2 },
  sectionDot: { width: 6, height: 6, borderRadius: 3 },
  sectionLabel: { fontFamily: "Inter_700Bold", fontSize: 9.5, letterSpacing: 1.4 },
});
