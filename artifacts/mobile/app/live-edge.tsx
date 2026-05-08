import { Feather } from "@expo/vector-icons";
import { useGetBestProps, useGetLiveEdge, useGetLiveScores } from "@workspace/api-client-react";
import { router } from "expo-router";
import { useMemo, useState } from "react";
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
import { useColors } from "@/hooks/useColors";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSource(propType: string): { label: string; color: string } {
  const pp = [
    "Points", "Rebounds", "Assists", "Pts+Reb+Ast", "3-Pointers Made",
    "Total Bases", "Hits+Runs+RBIs", "Pitcher Strikeouts", "Hits",
    "Points + Assists", "Points + Rebounds", "Steals", "Blocks",
  ];
  const dk = ["Home Runs", "Runs", "RBIs", "Walks", "Earned Runs"];
  if (pp.some((t) => propType.includes(t))) return { label: "PrizePicks", color: "#7c3aed" };
  if (dk.some((t) => propType.includes(t))) return { label: "DraftKings", color: "#2d7dd2" };
  return { label: "Underdog", color: "#f59e0b" };
}

// ─── Shared UI pieces ─────────────────────────────────────────────────────────

function ConfBar({ value }: { value: number }) {
  const colors = useColors();
  const pct = Math.min(Math.max(value, 0), 100);
  const fill = value >= 70 ? colors.primary : value >= 55 ? colors.accent : colors.mutedForeground;
  return (
    <View style={[sh.confTrack, { backgroundColor: colors.backgroundSurface }]}>
      <View style={[sh.confFill, { width: `${pct}%` as any, backgroundColor: fill }]} />
    </View>
  );
}

function ProgBar({ value }: { value: number }) {
  const colors = useColors();
  const pct = Math.min(Math.max(value, 0), 100);
  const fill = pct >= 75 ? colors.accent : colors.primary;
  return (
    <View style={[sh.progTrack, { backgroundColor: colors.backgroundSurface }]}>
      <View style={[sh.progFill, { width: `${pct}%` as any, backgroundColor: fill }]} />
    </View>
  );
}

function SectionHeader({ title, count, live }: { title: string; count: number; live?: boolean }) {
  const colors = useColors();
  return (
    <View style={sh.secRow}>
      {live && <PulseDot />}
      <View style={[sh.secDot, { backgroundColor: live ? colors.primary : colors.accent }]} />
      <Text style={[sh.secTitle, { color: live ? colors.primary : colors.foreground }]}>{title}</Text>
      <View style={[sh.secBadge, {
        backgroundColor: live ? colors.primaryGlow : colors.backgroundSurface,
        borderColor: live ? colors.cardBorderActive : colors.cardBorder,
      }]}>
        <Text style={[sh.secBadgeText, { color: live ? colors.primary : colors.mutedForeground }]}>{count}</Text>
      </View>
    </View>
  );
}

function SportTabs({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const colors = useColors();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {["ALL", "NBA", "MLB"].map((s) => (
          <Pressable
            key={s}
            onPress={() => onChange(s)}
            style={[sh.sportPill, {
              backgroundColor: value === s ? colors.primaryGlow : colors.backgroundSurface,
              borderColor: value === s ? colors.cardBorderActive : colors.cardBorder,
            }]}
          >
            <Text style={[sh.sportText, { color: value === s ? colors.primary : colors.mutedForeground }]}>{s}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const sh = StyleSheet.create({
  confTrack: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  confFill: { height: "100%", borderRadius: 2 },
  progTrack: { height: 5, borderRadius: 3, overflow: "hidden" },
  progFill: { height: "100%", borderRadius: 3 },
  secRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  secDot: { width: 6, height: 6, borderRadius: 3 },
  secTitle: { fontFamily: "Inter_700Bold", fontSize: 13, flex: 1 },
  secBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  secBadgeText: { fontFamily: "Inter_700Bold", fontSize: 10.5, fontVariant: ["tabular-nums"] },
  sportPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  sportText: { fontFamily: "Inter_700Bold", fontSize: 12 },
});

// ─── PreGameEdgeCard ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PreGameEdgeCard({ prop }: { prop: any }) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const isOver = String(prop.recommendation ?? "").includes("Over");
  const wp: number = prop.winProbability ?? 50;
  const edge: number = prop.edgeScore ?? 0;
  const source = getSource(prop.propType ?? "");
  const wpColor = wp >= 70 ? colors.primary : wp >= 57 ? colors.accent : colors.mutedForeground;
  const isStrong = wp >= 70;

  return (
    <View style={[
      pgS.card,
      {
        backgroundColor: colors.card,
        borderColor: isStrong ? colors.cardBorderActive : colors.cardBorder,
        borderWidth: isStrong ? 1.5 : 1,
      },
      isStrong && { shadowColor: colors.primary, shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
    ]}>
      {/* Top stripe: green=over, red=under */}
      <View style={[pgS.stripe, { backgroundColor: isOver ? colors.over : colors.under }]} />

      <View style={{ padding: 14, gap: 12 }}>

        {/* ── Player + confidence ── */}
        <View style={pgS.playerRow}>
          <PlayerAvatar src={prop.playerImage} name={prop.playerName} size={46} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[pgS.name, { color: colors.foreground }]} numberOfLines={1}>
              {prop.playerName}
            </Text>
            <Text style={[pgS.meta, { color: colors.mutedForeground }]}>
              {prop.teamAbbr} vs {prop.opponentAbbr} · {prop.sport}
            </Text>
            <View style={pgS.confRow}>
              <ConfBar value={wp} />
              <Text style={[pgS.confNum, { color: wpColor }]}>{wp}%</Text>
            </View>
          </View>

          {/* Side pill + line */}
          <View style={pgS.rightCol}>
            <View style={[pgS.sidePill, {
              backgroundColor: isOver ? colors.overSoft : colors.underSoft,
              borderColor: isOver ? colors.overBorder : colors.underBorder,
            }]}>
              <Text style={[pgS.sideText, { color: isOver ? colors.over : colors.under }]}>
                {isOver ? "▲ OVER" : "▼ UNDER"}
              </Text>
            </View>
            <Text style={[pgS.lineNum, { color: colors.foreground }]}>{prop.line}</Text>
          </View>
        </View>

        {/* ── Tags row: prop type · source · edge ── */}
        <View style={pgS.tagsRow}>
          <View style={[pgS.tag, { backgroundColor: colors.backgroundSurface, borderColor: colors.cardBorder }]}>
            <Text style={[pgS.tagText, { color: colors.mutedForeground }]}>{prop.propType}</Text>
          </View>
          <View style={[pgS.tag, { backgroundColor: `${source.color}18`, borderColor: `${source.color}40` }]}>
            <Text style={[pgS.tagText, { color: source.color }]}>{source.label}</Text>
          </View>
          <View style={[pgS.tag, { backgroundColor: colors.backgroundSurface, borderColor: colors.cardBorder }]}>
            <Text style={[pgS.tagText, { color: colors.mutedForeground }]}>EDGE {edge.toFixed(1)}</Text>
          </View>
        </View>

        {/* ── Stats strip: L5 avg · L10 avg · hit rate · trend ── */}
        <View style={[pgS.statsBox, { backgroundColor: colors.backgroundSurface, borderColor: colors.cardBorder }]}>
          {[
            { label: "L5 AVG", value: prop.avg5 != null ? prop.avg5.toFixed(1) : "—" },
            { label: "L10 AVG", value: prop.avg10 != null ? prop.avg10.toFixed(1) : "—" },
            { label: "HIT RATE", value: prop.hitRate5 != null ? `${Math.round(prop.hitRate5 * 100)}%` : "—" },
            { label: "TREND", value: prop.trend === "up" ? "↑ UP" : prop.trend === "down" ? "↓ DOWN" : "→ FLAT" },
          ].map((s, i, arr) => (
            <View key={s.label} style={{ flexDirection: "row", flex: 1 }}>
              <View style={pgS.statCell}>
                <Text style={[pgS.statVal, { color: colors.foreground }]}>{s.value}</Text>
                <Text style={[pgS.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
              </View>
              {i < arr.length - 1 && (
                <View style={[pgS.statDiv, { backgroundColor: colors.cardBorder }]} />
              )}
            </View>
          ))}
        </View>

        {/* ── Expand toggle ── */}
        <Pressable onPress={() => setExpanded((v) => !v)} style={pgS.expandBtn}>
          <Text style={[pgS.expandText, { color: colors.mutedForeground }]}>
            {expanded ? "Hide analysis ↑" : "See full analysis ↓"}
          </Text>
        </Pressable>

        {/* ── Expanded: reasoning + factors + availability ── */}
        {expanded && (
          <View style={[pgS.reasonBox, { backgroundColor: colors.backgroundSurface, borderColor: colors.cardBorder }]}>
            {!!prop.reasoning && (
              <Text style={[pgS.reasonText, { color: colors.foreground }]}>{prop.reasoning}</Text>
            )}

            {/* Factor chips */}
            {[
              prop.factors?.opponent?.note && { icon: "shield" as const, text: prop.factors.opponent.note },
              prop.factors?.weather?.note && { icon: "cloud" as const, text: prop.factors.weather.note },
              prop.factors?.h2h?.note && { icon: "repeat" as const, text: prop.factors.h2h.note },
            ].filter(Boolean).map((f: any) => (
              <View key={f.icon} style={[pgS.factorChip, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Feather name={f.icon} size={10} color={colors.mutedForeground} />
                <Text style={[pgS.factorText, { color: colors.mutedForeground }]}>{f.text}</Text>
              </View>
            ))}

            {/* Availability row */}
            <View style={pgS.availRow}>
              <View style={[pgS.availDot, { backgroundColor: colors.over }]} />
              <Text style={[pgS.availText, { color: colors.mutedForeground }]}>
                Available on {source.label} · Status: Available Now
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const pgS = StyleSheet.create({
  card: { borderRadius: 16, overflow: "hidden" },
  stripe: { height: 3, opacity: 0.85 },
  playerRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  name: { fontFamily: "Inter_700Bold", fontSize: 15.5, letterSpacing: -0.2 },
  meta: { fontSize: 11, marginTop: 2 },
  confRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 8 },
  confNum: { fontFamily: "Inter_700Bold", fontSize: 11, fontVariant: ["tabular-nums"], minWidth: 30 },
  rightCol: { alignItems: "center", gap: 6 },
  sidePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, borderWidth: 1 },
  sideText: { fontFamily: "Inter_700Bold", fontSize: 10.5, letterSpacing: 0.5 },
  lineNum: { fontFamily: "Inter_700Bold", fontSize: 24, fontVariant: ["tabular-nums"] },
  tagsRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  tagText: { fontFamily: "Inter_600SemiBold", fontSize: 10.5 },
  statsBox: { flexDirection: "row", borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  statCell: { flex: 1, alignItems: "center", paddingVertical: 10, gap: 3 },
  statVal: { fontFamily: "Inter_700Bold", fontSize: 14, fontVariant: ["tabular-nums"] },
  statLabel: { fontFamily: "Inter_700Bold", fontSize: 8, letterSpacing: 1.1 },
  statDiv: { width: 1, marginVertical: 6 },
  expandBtn: { alignItems: "center", paddingVertical: 2 },
  expandText: { fontSize: 11 },
  reasonBox: { borderRadius: 10, borderWidth: 1, padding: 12, gap: 8 },
  reasonText: { fontSize: 12, lineHeight: 18 },
  factorChip: { flexDirection: "row", alignItems: "flex-start", gap: 6, padding: 8, borderRadius: 7, borderWidth: 1 },
  factorText: { fontSize: 11, flex: 1, lineHeight: 16 },
  availRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 2 },
  availDot: { width: 7, height: 7, borderRadius: 3.5 },
  availText: { fontSize: 10.5 },
});

// ─── LiveEdgeCard ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LiveEdgeCard({ edge }: { edge: any }) {
  const colors = useColors();
  const edgePct: number = edge.liveEdgePercent ?? 0;
  const isOver = edgePct > 0;
  const rec: string = edge.liveRecommendation ?? "";
  const isStrong = rec.includes("Strong");
  const source = getSource(edge.propType ?? "");
  const completePct = Math.round((edge.percentComplete ?? 0) * 100);
  const recColor = isOver ? colors.over : colors.under;
  const recBg = isOver ? colors.overSoft : colors.underSoft;
  const recBorder = isOver ? colors.overBorder : colors.underBorder;

  return (
    <View style={[
      lvS.card,
      {
        backgroundColor: colors.card,
        borderColor: isStrong ? colors.cardBorderActive : colors.cardBorder,
        borderWidth: isStrong ? 1.5 : 1,
      },
    ]}>
      <View style={[lvS.stripe, { backgroundColor: colors.primary }]} />

      <View style={{ padding: 14, gap: 12 }}>
        {/* Live header */}
        <View style={lvS.headerRow}>
          <PulseDot />
          <Text style={[lvS.liveLabel, { color: colors.primary }]}>LIVE IN-GAME</Text>
          <Text style={[lvS.clock, { color: colors.mutedForeground }]}>
            {edge.period}{edge.clock ? ` · ${edge.clock}` : ""}
          </Text>
          <View style={{ flex: 1 }} />
          <View style={[lvS.recPill, { backgroundColor: recBg, borderColor: recBorder }]}>
            <Text style={[lvS.recText, { color: recColor }]}>{rec.toUpperCase()}</Text>
          </View>
        </View>

        {/* Player */}
        <View style={lvS.playerRow}>
          <PlayerAvatar src={edge.playerImage} name={edge.playerName} size={46} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[lvS.name, { color: colors.foreground }]} numberOfLines={1}>{edge.playerName}</Text>
            <Text style={[lvS.meta, { color: colors.mutedForeground }]}>
              {edge.teamAbbr} · {edge.propType} · Line {edge.line}
            </Text>
            <View style={[lvS.sourceTag, { backgroundColor: `${source.color}18`, borderColor: `${source.color}40` }]}>
              <Text style={[lvS.sourceText, { color: source.color }]}>{source.label}</Text>
            </View>
          </View>
        </View>

        {/* Live stats strip */}
        <View style={[lvS.statsBox, { backgroundColor: colors.backgroundSurface, borderColor: colors.cardBorder }]}>
          {[
            { label: "CURRENT", value: String(edge.currentStat ?? "—"), color: colors.foreground },
            { label: "PROJECTED", value: edge.projectedFinal > 0 ? edge.projectedFinal.toFixed(1) : "—", color: isOver ? colors.over : colors.under },
            { label: "NEEDED", value: (edge.neededRemaining ?? 0).toFixed(1), color: colors.foreground },
            { label: "LIVE EDGE", value: `${edgePct > 0 ? "+" : ""}${edgePct.toFixed(1)}%`, color: recColor },
          ].map((s, i, arr) => (
            <View key={s.label} style={{ flexDirection: "row", flex: 1 }}>
              <View style={lvS.statCell}>
                <Text style={[lvS.statVal, { color: s.color }]}>{s.value}</Text>
                <Text style={[lvS.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
              </View>
              {i < arr.length - 1 && <View style={[lvS.statDiv, { backgroundColor: colors.cardBorder }]} />}
            </View>
          ))}
        </View>

        {/* Game progress bar */}
        <View style={{ gap: 5 }}>
          <View style={lvS.progressLabelRow}>
            <Text style={[lvS.progressLabel, { color: colors.mutedForeground }]}>Game complete</Text>
            <Text style={[lvS.progressPct, { color: completePct >= 75 ? colors.accent : colors.mutedForeground }]}>
              {completePct}%
            </Text>
          </View>
          <ProgBar value={completePct} />
        </View>
      </View>
    </View>
  );
}

const lvS = StyleSheet.create({
  card: { borderRadius: 16, overflow: "hidden" },
  stripe: { height: 3 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveLabel: { fontFamily: "Inter_700Bold", fontSize: 10.5, letterSpacing: 1.2 },
  clock: { fontSize: 11 },
  recPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  recText: { fontFamily: "Inter_700Bold", fontSize: 9.5, letterSpacing: 0.6 },
  playerRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  name: { fontFamily: "Inter_700Bold", fontSize: 15.5, letterSpacing: -0.2 },
  meta: { fontSize: 11, marginTop: 3 },
  sourceTag: { alignSelf: "flex-start", marginTop: 6, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, borderWidth: 1 },
  sourceText: { fontFamily: "Inter_700Bold", fontSize: 9.5, letterSpacing: 0.5 },
  statsBox: { flexDirection: "row", borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  statCell: { flex: 1, alignItems: "center", paddingVertical: 10, gap: 3 },
  statVal: { fontFamily: "Inter_700Bold", fontSize: 15, fontVariant: ["tabular-nums"] },
  statLabel: { fontFamily: "Inter_700Bold", fontSize: 8, letterSpacing: 1.1 },
  statDiv: { width: 1, marginVertical: 6 },
  progressLabelRow: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 10.5 },
  progressPct: { fontFamily: "Inter_700Bold", fontSize: 10.5, fontVariant: ["tabular-nums"] },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function LiveEdgeScreen() {
  const colors = useColors();
  const [sport, setSport] = useState("ALL");

  const { data: liveData, isLoading: liveLoading, refetch, isRefetching } = useGetLiveEdge({
    query: { queryKey: ["/api/live-edge"], refetchInterval: 15_000 },
  });

  const { data: propsData, isLoading: propsLoading } = useGetBestProps(undefined, {
    query: { queryKey: ["/api/best-props", "edge"], refetchInterval: 60_000 },
  });

  const { data: liveScores } = useGetLiveScores({
    query: { queryKey: ["/api/scores/live"], refetchInterval: 15_000 },
  });

  // IDs of games currently in progress
  const liveGameIds = useMemo(
    () => new Set((liveScores?.games ?? []).filter((g) => g.isLive).map((g) => g.id)),
    [liveScores],
  );

  // Live in-game edges, filtered by sport
  const liveEdges = useMemo(() => {
    const edges = liveData?.edges ?? [];
    return sport === "ALL" ? edges : edges.filter((e) => e.sport === sport);
  }, [liveData, sport]);

  // Pre-game: bestPick only, winProb >= 65, game not live or final, top 12
  const preGameEdges = useMemo(() => {
    const props = propsData?.props ?? [];
    return props
      .filter((p) => {
        if (sport !== "ALL" && p.sport !== sport) return false;
        if ((p.winProbability ?? 0) < 65) return false;
        if (!p.bestPick) return false;
        // Skip if game is already live (covered by live section)
        if (p.gameId && liveGameIds.has(p.gameId)) return false;
        return true;
      })
      .sort((a, b) => (b.winProbability ?? 0) - (a.winProbability ?? 0))
      .slice(0, 12);
  }, [propsData, sport, liveGameIds]);

  const isLoading = liveLoading || propsLoading;
  const totalEdges = liveEdges.length + preGameEdges.length;

  return (
    <View style={[mainS.root, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Betting Edge"
        subtitle={`${totalEdges} opportunities · live refresh`}
        showBack
        onBack={() => router.back()}
        liveCount={liveEdges.length}
        onRefresh={() => refetch()}
        refreshing={isRefetching}
      />

      <FlatList
        data={[1]}
        keyExtractor={() => "content"}
        contentContainerStyle={{ padding: 14, paddingBottom: 110, gap: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 10 }}>
            <SportTabs value={sport} onChange={setSport} />
            <View style={mainS.updateRow}>
              <View style={[mainS.updateDot, { backgroundColor: colors.over }]} />
              <Text style={[mainS.updateText, { color: colors.mutedForeground }]}>
                {liveData?.lastUpdated
                  ? `Live updated ${new Date(liveData.lastUpdated).toLocaleTimeString()}`
                  : "Live edges refresh every 15s · Pre-game every 60s"}
              </Text>
            </View>
          </View>
        }
        renderItem={() =>
          isLoading ? (
            <View style={{ gap: 12 }}>
              {[1, 2, 3].map((i) => <SkeletonCard key={i} height={180} />)}
            </View>
          ) : totalEdges === 0 ? (
            <EmptyState
              icon="activity"
              title="No strong edges right now"
              description="We only show picks with 65%+ confidence. Check back when today's games are closer to start time."
            />
          ) : (
            <View style={{ gap: 20 }}>
              {/* Live in-game section */}
              {liveEdges.length > 0 && (
                <View style={{ gap: 10 }}>
                  <SectionHeader title="Live In-Game Edges" count={liveEdges.length} live />
                  {liveEdges.map((edge) => (
                    <LiveEdgeCard key={edge.id} edge={edge} />
                  ))}
                </View>
              )}

              {/* Pre-game best picks */}
              {preGameEdges.length > 0 && (
                <View style={{ gap: 10 }}>
                  <SectionHeader title="Best Pre-Game Picks" count={preGameEdges.length} />
                  {/* Quality filter note */}
                  <View style={[mainS.qualityNote, { backgroundColor: colors.primaryGlow, borderColor: colors.cardBorderActive }]}>
                    <Feather name="filter" size={12} color={colors.primary} />
                    <Text style={[mainS.qualityText, { color: colors.primary }]}>
                      65%+ win confidence only · Ranked by probability · No filler picks
                    </Text>
                  </View>
                  {preGameEdges.map((p) => (
                    <PreGameEdgeCard key={p.id} prop={p} />
                  ))}
                </View>
              )}
            </View>
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
  updateText: { fontSize: 11, flex: 1 },
  qualityNote: {
    flexDirection: "row", alignItems: "center",
    gap: 8, padding: 10, borderRadius: 10, borderWidth: 1,
  },
  qualityText: { fontSize: 11, flex: 1, fontFamily: "Inter_600SemiBold" },
});
