import { useGetLiveEdge } from "@workspace/api-client-react";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PulseDot } from "@/components/PulseDot";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useColors } from "@/hooks/useColors";

function ProgressBar({ value }: { value: number }) {
  const colors = useColors();
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View
      style={{
        height: 5,
        borderRadius: 3,
        backgroundColor: colors.muted,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${pct}%`,
          height: "100%",
          backgroundColor: colors.primary,
        }}
      />
    </View>
  );
}

function RecBadge({ rec }: { rec: string }) {
  const colors = useColors();
  const isOver = rec.includes("Over");
  const isStrong = rec.includes("Strong");
  const baseColor = isOver ? colors.over : colors.under;
  const bg = isStrong
    ? isOver
      ? "rgba(16,185,129,0.25)"
      : "rgba(239,68,68,0.25)"
    : isOver
      ? "rgba(16,185,129,0.12)"
      : "rgba(239,68,68,0.12)";
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: baseColor,
      }}
    >
      <Text
        style={{
          color: baseColor,
          fontSize: 10,
          fontFamily: "Inter_700Bold",
          letterSpacing: 0.6,
        }}
      >
        {rec.toUpperCase()}
      </Text>
    </View>
  );
}

export default function LiveEdgeScreen() {
  const colors = useColors();
  const { data, isLoading, refetch, isRefetching } = useGetLiveEdge({
    query: { queryKey: ["/api/live-edge"], refetchInterval: 15000 },
  });

  const edges = data?.edges ?? [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Live Edge"
        showBack
        onBack={() => router.back()}
        liveCount={edges.length}
        onRefresh={() => refetch()}
        refreshing={isRefetching}
      />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 110, gap: 12 }}>
        <View
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <PulseDot />
            <Text
              style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 14 }}
            >
              Live Projections
            </Text>
          </View>
          <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
            {data?.lastUpdated
              ? `Updated ${new Date(data.lastUpdated).toLocaleTimeString()}`
              : "Refreshes every 15s"}
          </Text>
        </View>

        {isLoading ? (
          [1, 2, 3].map((i) => <SkeletonCard key={i} height={170} />)
        ) : edges.length === 0 ? (
          <EmptyState
            icon="activity"
            title="No live edges"
            description="When games are in progress, live projections will appear here."
          />
        ) : (
          edges.map((edge) => {
            const edgePct = edge.liveEdgePercent ?? 0;
            const isOver = edgePct > 0;
            return (
              <View
                key={edge.id}
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
              >
                <View
                  style={[
                    styles.accent,
                    {
                      backgroundColor:
                        edgePct > 0 ? colors.over : edgePct < 0 ? colors.under : colors.muted,
                    },
                  ]}
                />
                <View style={{ padding: 14 }}>
                  <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                    <PlayerAvatar src={edge.playerImage} name={edge.playerName} size={56} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 6,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              color: colors.foreground,
                              fontFamily: "Inter_700Bold",
                              fontSize: 15,
                            }}
                            numberOfLines={1}
                          >
                            {edge.playerName}
                          </Text>
                          <Text
                            style={{
                              color: colors.mutedForeground,
                              fontSize: 11,
                              marginTop: 2,
                            }}
                            numberOfLines={1}
                          >
                            {edge.teamAbbr} · {edge.propType} · Line {edge.line}
                          </Text>
                        </View>
                        <RecBadge rec={edge.liveRecommendation} />
                      </View>
                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontSize: 10,
                          marginTop: 4,
                          fontVariant: ["tabular-nums"],
                        }}
                      >
                        {edge.period}
                        {edge.clock ? ` · ${edge.clock}` : ""}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statBox,
                      { backgroundColor: colors.background, borderColor: colors.divider },
                    ]}
                  >
                    <View style={styles.threeCol}>
                      <View style={{ flex: 1, alignItems: "center" }}>
                        <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>
                          CURRENT
                        </Text>
                        <Text style={[styles.statVal, { color: colors.foreground }]}>
                          {edge.currentStat}
                        </Text>
                      </View>
                      <View style={{ flex: 1, alignItems: "center" }}>
                        <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>
                          PROJ
                        </Text>
                        <Text
                          style={[
                            styles.statVal,
                            {
                              color:
                                edgePct > 0
                                  ? colors.over
                                  : edgePct < 0
                                    ? colors.under
                                    : colors.foreground,
                            },
                          ]}
                        >
                          {edge.projectedFinal > 0 ? edge.projectedFinal.toFixed(1) : "—"}
                        </Text>
                      </View>
                      <View style={{ flex: 1, alignItems: "center" }}>
                        <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>
                          NEEDED
                        </Text>
                        <Text style={[styles.statVal, { color: colors.foreground }]}>
                          {(edge.neededRemaining ?? 0).toFixed(1)}
                        </Text>
                      </View>
                    </View>
                    <View style={{ marginTop: 12, gap: 4 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text
                          style={{
                            color: colors.mutedForeground,
                            fontSize: 10,
                          }}
                        >
                          Game complete
                        </Text>
                        <Text
                          style={{
                            color: colors.mutedForeground,
                            fontSize: 10,
                            fontVariant: ["tabular-nums"],
                          }}
                        >
                          {(edge.percentComplete * 100).toFixed(0)}%
                        </Text>
                      </View>
                      <ProgressBar value={edge.percentComplete * 100} />
                    </View>
                    {edge.liveEdgePercent !== undefined && (
                      <View
                        style={[
                          styles.edgeRow,
                          { borderTopColor: colors.divider },
                        ]}
                      >
                        <Text
                          style={{
                            color: colors.mutedForeground,
                            fontSize: 11,
                          }}
                        >
                          Live Edge
                        </Text>
                        <Text
                          style={{
                            color:
                              edgePct > 0
                                ? colors.over
                                : edgePct < 0
                                  ? colors.under
                                  : colors.mutedForeground,
                            fontFamily: "Inter_700Bold",
                            fontSize: 13,
                            fontVariant: ["tabular-nums"],
                          }}
                        >
                          {edgePct > 0 ? "+" : ""}
                          {edge.liveEdgePercent.toFixed(1)}%
                        </Text>
                      </View>
                    )}
                    {!isOver && edgePct === 0 && null}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  accent: { height: 3 },
  statBox: {
    marginTop: 14,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  threeCol: { flexDirection: "row", gap: 8 },
  statLbl: {
    fontSize: 9.5,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  statVal: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    fontVariant: ["tabular-nums"],
  },
  edgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
});
