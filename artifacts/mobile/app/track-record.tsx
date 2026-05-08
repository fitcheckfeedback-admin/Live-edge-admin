import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useGetTrackRecord, useGradeTrackRecord } from "@workspace/api-client-react";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppHeader } from "@/components/AppHeader";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useToast } from "@/contexts/ToastContext";
import { useColors } from "@/hooks/useColors";

type WindowKey = "7d" | "30d" | "all";

interface Bucket {
  label: string;
  graded: number;
  hits: number;
  misses: number;
  pushes: number;
  dnp: number;
  pending: number;
  hitRate: number;
}

function rateColor(rate: number, graded: number, colors: ReturnType<typeof useColors>) {
  if (graded < 5) return colors.mutedForeground;
  if (rate >= 60) return colors.over;
  if (rate >= 52) return "#6ee7b7";
  if (rate >= 47) return "#fde047";
  return "#f87171";
}

function StatCard({
  icon,
  title,
  bucket,
  emphasize,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  bucket: Bucket;
  emphasize?: boolean;
}) {
  const colors = useColors();
  const noData = bucket.graded === 0;
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: emphasize ? "rgba(34,197,94,0.06)" : colors.card,
          borderColor: emphasize ? "rgba(34,197,94,0.4)" : colors.cardBorder,
        },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Feather
          name={icon}
          size={13}
          color={emphasize ? colors.primary : colors.mutedForeground}
        />
        <Text
          style={{
            color: colors.mutedForeground,
            fontFamily: "Inter_700Bold",
            fontSize: 10,
            letterSpacing: 1.1,
          }}
          numberOfLines={1}
        >
          {title.toUpperCase()}
        </Text>
      </View>
      {noData ? (
        <Text
          style={{
            color: colors.mutedForeground,
            fontSize: 11,
            marginTop: 6,
            fontStyle: "italic",
          }}
        >
          Awaiting graded picks
        </Text>
      ) : (
        <>
          <Text
            style={{
              color: rateColor(bucket.hitRate, bucket.graded, colors),
              fontFamily: "Inter_700Bold",
              fontSize: 26,
              fontVariant: ["tabular-nums"],
              marginTop: 4,
            }}
          >
            {bucket.hitRate}%
          </Text>
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 11,
              marginTop: 4,
              fontVariant: ["tabular-nums"],
            }}
          >
            {bucket.hits}–{bucket.misses}
            {bucket.pushes > 0 ? ` · ${bucket.pushes}P` : ""}
          </Text>
        </>
      )}
    </View>
  );
}

function BucketRow({ bucket, highlight }: { bucket: Bucket; highlight?: boolean }) {
  const colors = useColors();
  const noData = bucket.graded === 0;
  return (
    <View
      style={[
        styles.bucketRow,
        {
          backgroundColor: highlight ? "rgba(34,197,94,0.06)" : colors.background,
          borderColor: highlight ? "rgba(34,197,94,0.3)" : colors.cardBorder,
        },
      ]}
    >
      <Text
        style={{
          flex: 1,
          color: colors.foreground,
          fontFamily: "Inter_600SemiBold",
          fontSize: 12.5,
        }}
        numberOfLines={1}
      >
        {bucket.label}
      </Text>
      <Text
        style={{
          color: colors.mutedForeground,
          fontSize: 10.5,
          fontVariant: ["tabular-nums"],
        }}
      >
        {bucket.hits}–{bucket.misses}
        {bucket.pushes > 0 ? ` · ${bucket.pushes}P` : ""}
      </Text>
      <Text
        style={{
          color: rateColor(bucket.hitRate, bucket.graded, colors),
          fontFamily: "Inter_700Bold",
          fontSize: 13,
          fontVariant: ["tabular-nums"],
          width: 48,
          textAlign: "right",
        }}
      >
        {noData ? "—" : `${bucket.hitRate}%`}
      </Text>
    </View>
  );
}

function ResultPill({ result }: { result: string }) {
  const colors = useColors();
  const map: Record<string, { bg: string; fg: string; border: string }> = {
    HIT: {
      bg: "rgba(16,185,129,0.2)",
      fg: "#6ee7b7",
      border: "rgba(16,185,129,0.4)",
    },
    MISS: {
      bg: "rgba(239,68,68,0.2)",
      fg: "#fca5a5",
      border: "rgba(239,68,68,0.4)",
    },
    PUSH: {
      bg: "rgba(250,204,21,0.18)",
      fg: "#fde047",
      border: "rgba(250,204,21,0.4)",
    },
    DNP: { bg: colors.muted, fg: colors.mutedForeground, border: colors.cardBorder },
  };
  const c = map[result] ?? map.DNP!;
  return (
    <View
      style={{
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
        borderWidth: 1,
        backgroundColor: c.bg,
        borderColor: c.border,
      }}
    >
      <Text
        style={{
          color: c.fg,
          fontSize: 9,
          fontFamily: "Inter_700Bold",
          letterSpacing: 0.4,
        }}
      >
        {result}
      </Text>
    </View>
  );
}

export default function TrackRecordScreen() {
  const colors = useColors();
  const qc = useQueryClient();
  const { show } = useToast();
  const [win, setWin] = useState<WindowKey>("30d");

  const { data, isLoading, refetch } = useGetTrackRecord(
    { window: win },
    { query: { queryKey: ["/api/track-record", win] } },
  );

  const grade = useGradeTrackRecord({
    mutation: {
      onSuccess: (res) => {
        show({
          title: "Grading complete",
          description: (res as { message?: string })?.message ?? "Refreshed",
        });
        qc.invalidateQueries({ queryKey: ["/api/track-record"] });
        refetch();
      },
      onError: () =>
        show({
          title: "Grading failed",
          description: "Couldn't grade pending picks.",
          variant: "error",
        }),
    },
  });

  const tierLabels: Record<string, string> = {
    "Tier 1": "T1: Balanced + volume",
    "Tier 2": "T2: Balanced",
    "Tier 3": "T3: Volume only",
    "Tier 4": "T4: Fallback",
    "Non-Best": "Other recommended picks",
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title="Track Record" showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 110, gap: 14 }}>
        <View style={{ gap: 6 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Feather name="bar-chart-2" size={18} color={colors.primary} />
            <Text
              style={{
                color: colors.foreground,
                fontFamily: "Inter_700Bold",
                fontSize: 18,
                flex: 1,
              }}
            >
              Auto-graded results
            </Text>
            <Pressable
              onPress={() => grade.mutate(undefined)}
              disabled={grade.isPending}
              style={({ pressed }) => [
                styles.gradeBtn,
                {
                  borderColor: colors.cardBorder,
                  opacity: pressed || grade.isPending ? 0.5 : 1,
                },
              ]}
            >
              <Feather name="refresh-cw" size={12} color={colors.foreground} />
              <Text
                style={{
                  color: colors.foreground,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 12,
                }}
              >
                Grade now
              </Text>
            </Pressable>
          </View>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 17 }}>
            Every recommended pick is auto-snapshotted daily, then graded against real game logs.
            The system uses these results to auto-tune which Best Pick tiers it favors.
          </Text>
        </View>

        {/* Window selector */}
        <View style={[styles.windowGroup, { backgroundColor: colors.muted }]}>
          {(["7d", "30d", "all"] as WindowKey[]).map((k) => {
            const active = win === k;
            return (
              <Pressable
                key={k}
                onPress={() => setWin(k)}
                style={({ pressed }) => [
                  styles.windowBtn,
                  {
                    backgroundColor: active ? colors.card : "transparent",
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? colors.foreground : colors.mutedForeground,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 12,
                  }}
                >
                  {k === "7d" ? "Last 7d" : k === "30d" ? "Last 30d" : "All time"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {isLoading || !data ? (
          <>
            <SkeletonCard height={90} />
            <SkeletonCard height={150} />
          </>
        ) : (
          <>
            {/* Headline stats */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <StatCard icon="award" title="Best Picks" bucket={data.bestPicks as Bucket} emphasize />
              <StatCard icon="target" title="Other" bucket={data.otherPicks as Bucket} />
              <StatCard icon="trending-up" title="Overall" bucket={data.overall as Bucket} />
            </View>

            {/* By tier */}
            <View
              style={[
                styles.section,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Feather name="layers" size={14} color={colors.primary} />
                <Text
                  style={{
                    color: colors.foreground,
                    fontFamily: "Inter_700Bold",
                    fontSize: 12,
                    letterSpacing: 1,
                  }}
                >
                  BY BEST-PICK TIER
                </Text>
              </View>
              {(data.byTier as Bucket[]).length === 0 ? (
                <Text style={{ color: colors.mutedForeground, fontSize: 11.5, fontStyle: "italic" }}>
                  No graded picks yet — check back tomorrow.
                </Text>
              ) : (
                <View style={{ gap: 6 }}>
                  {(data.byTier as Bucket[]).map((b) => (
                    <BucketRow
                      key={b.label}
                      bucket={{ ...b, label: tierLabels[b.label] ?? b.label }}
                      highlight={b.label.startsWith("Tier")}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* By sport */}
            <View
              style={[
                styles.section,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              <Text
                style={{
                  color: colors.foreground,
                  fontFamily: "Inter_700Bold",
                  fontSize: 12,
                  letterSpacing: 1,
                  marginBottom: 8,
                }}
              >
                BY SPORT
              </Text>
              {(data.bySport as Bucket[]).length === 0 ? (
                <Text style={{ color: colors.mutedForeground, fontSize: 11.5, fontStyle: "italic" }}>
                  No graded picks yet.
                </Text>
              ) : (
                <View style={{ gap: 6 }}>
                  {(data.bySport as Bucket[]).map((b) => (
                    <BucketRow key={b.label} bucket={b} />
                  ))}
                </View>
              )}
            </View>

            {/* By prop type */}
            <View
              style={[
                styles.section,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              <Text
                style={{
                  color: colors.foreground,
                  fontFamily: "Inter_700Bold",
                  fontSize: 12,
                  letterSpacing: 1,
                  marginBottom: 8,
                }}
              >
                BY PROP TYPE
              </Text>
              {(data.byPropType as Bucket[]).length === 0 ? (
                <Text style={{ color: colors.mutedForeground, fontSize: 11.5, fontStyle: "italic" }}>
                  No graded picks yet.
                </Text>
              ) : (
                <View style={{ gap: 6 }}>
                  {(data.byPropType as Bucket[]).slice(0, 12).map((b) => (
                    <BucketRow key={b.label} bucket={b} />
                  ))}
                </View>
              )}
            </View>

            {/* Recent */}
            <View
              style={[
                styles.section,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              <Text
                style={{
                  color: colors.foreground,
                  fontFamily: "Inter_700Bold",
                  fontSize: 12,
                  letterSpacing: 1,
                  marginBottom: 8,
                }}
              >
                RECENT GRADED ({data.recent.length})
              </Text>
              {data.recent.length === 0 ? (
                <Text style={{ color: colors.mutedForeground, fontSize: 11.5, fontStyle: "italic" }}>
                  Snapshots from today's slate will be graded after games finish.
                </Text>
              ) : (
                <View>
                  {data.recent.slice(0, 25).map((p, i, arr) => (
                    <View
                      key={p.id}
                      style={[
                        styles.recentRow,
                        { borderBottomColor: colors.divider },
                        i === arr.length - 1 ? { borderBottomWidth: 0 } : null,
                      ]}
                    >
                      <ResultPill result={p.result} />
                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontSize: 10.5,
                          width: 38,
                          fontVariant: ["tabular-nums"],
                        }}
                      >
                        {p.date.slice(5)}
                      </Text>
                      <Text
                        style={{
                          flex: 1,
                          color: colors.foreground,
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 11.5,
                        }}
                        numberOfLines={1}
                      >
                        {p.playerName}
                      </Text>
                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontSize: 10.5,
                          fontVariant: ["tabular-nums"],
                        }}
                      >
                        {p.propType} {p.side === "Over" ? "O" : "U"}
                        {p.line}
                      </Text>
                      {p.actualValue != null && (
                        <Text
                          style={{
                            color: colors.foreground,
                            fontFamily: "Inter_700Bold",
                            fontSize: 11,
                            width: 26,
                            textAlign: "right",
                            fontVariant: ["tabular-nums"],
                          }}
                        >
                          {p.actualValue}
                        </Text>
                      )}
                      {p.isBestPick && (
                        <Text style={{ color: colors.primary, fontSize: 10 }}>★</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  gradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  windowGroup: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 10,
  },
  windowBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 7,
  },
  statCard: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  section: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  bucketRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
});
