import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useGetResults, useUpdateResult } from "@workspace/api-client-react";
import { router } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useToast } from "@/contexts/ToastContext";
import { useColors } from "@/hooks/useColors";

const STATUSES = ["Pending", "Win", "Loss", "Push", "DNP", "Line Removed"] as const;

function statusStyle(status: string, colors: ReturnType<typeof useColors>) {
  switch (status) {
    case "Win":
      return { color: colors.primary, bg: "rgba(34,197,94,0.12)" };
    case "Loss":
      return { color: colors.under, bg: "rgba(239,68,68,0.12)" };
    case "Push":
      return { color: colors.accent, bg: "rgba(251,191,36,0.12)" };
    default:
      return { color: colors.mutedForeground, bg: colors.muted };
  }
}

export default function ResultsScreen() {
  const colors = useColors();
  const qc = useQueryClient();
  const { show } = useToast();
  const { data, isLoading, refetch } = useGetResults(
    {},
    { query: { queryKey: ["/api/results", {}] } },
  );

  const update = useUpdateResult({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/api/results"] });
        show({ title: "Result updated" });
      },
      onError: () =>
        show({
          title: "Update failed",
          description: "Couldn't update result.",
          variant: "destructive",
        }),
    },
  });

  const [editing, setEditing] = useState<{ id: number; status: string } | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = (data?.results as any[]) ?? [];
  const summary = data?.summary;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Results"
        showBack
        onBack={() => router.back()}
        onRefresh={() => refetch()}
      />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 110, gap: 12 }}>
        {/* Summary stats */}
        {summary ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View
              style={[
                styles.statBox,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>
                WIN RATE
              </Text>
              <Text
                style={{
                  color: colors.foreground,
                  fontFamily: "Inter_700Bold",
                  fontSize: 20,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {summary.winRate ? summary.winRate.toFixed(1) : 0}%
              </Text>
            </View>
            <View
              style={[
                styles.statBox,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>
                P / L
              </Text>
              <Text
                style={{
                  color:
                    (summary.totalProfitLoss ?? 0) >= 0 ? colors.primary : colors.under,
                  fontFamily: "Inter_700Bold",
                  fontSize: 20,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {(summary.totalProfitLoss ?? 0) >= 0 ? "+" : ""}
                {summary.totalProfitLoss ?? 0}u
              </Text>
            </View>
          </View>
        ) : null}

        {/* Results list */}
        {isLoading ? (
          [1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} height={70} />)
        ) : results.length === 0 ? (
          <EmptyState
            icon="archive"
            title="No graded results"
            description="Results will populate as games finish."
          />
        ) : (
          results.map((r) => {
            const ss = statusStyle(r.status, colors);
            return (
              <View
                key={r.id}
                style={[
                  styles.row,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <Text
                      style={{
                        color: colors.primary,
                        fontFamily: "Inter_700Bold",
                        fontSize: 9.5,
                        letterSpacing: 1,
                      }}
                    >
                      {r.sport}
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 10.5 }}>
                      {new Date(r.date).toLocaleDateString()} · {r.teamAbbr} v {r.opponentAbbr}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontFamily: "Inter_700Bold",
                      fontSize: 13.5,
                      marginTop: 3,
                    }}
                    numberOfLines={1}
                  >
                    {r.playerName}
                  </Text>
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontSize: 11.5,
                      marginTop: 1,
                      fontVariant: ["tabular-nums"],
                    }}
                    numberOfLines={1}
                  >
                    {r.propType} {r.line} · {r.recommendation}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setEditing({ id: r.id, status: r.status })}
                  style={({ pressed }) => [
                    styles.statusBtn,
                    {
                      backgroundColor: ss.bg,
                      borderColor: ss.color,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: ss.color,
                      fontFamily: "Inter_700Bold",
                      fontSize: 11,
                      letterSpacing: 0.6,
                    }}
                  >
                    {r.status.toUpperCase()}
                  </Text>
                  <Feather name="chevron-down" size={12} color={ss.color} />
                </Pressable>
              </View>
            );
          })
        )}

        {/* Note about CSV */}
        <Text
          style={{
            color: colors.mutedForeground,
            fontSize: 10.5,
            opacity: 0.65,
            textAlign: "center",
            marginTop: 6,
          }}
        >
          Tap any status pill to update. CSV export available on the web app.
        </Text>
      </ScrollView>

      {/* Status edit sheet */}
      <Modal
        visible={!!editing}
        animationType="fade"
        transparent
        onRequestClose={() => setEditing(null)}
        statusBarTranslucent
      >
        <Pressable
          onPress={() => setEditing(null)}
          style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.65)" }]}
        />
        <View
          style={[
            styles.editSheet,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text
            style={{
              color: colors.foreground,
              fontFamily: "Inter_700Bold",
              fontSize: 14,
              marginBottom: 10,
            }}
          >
            Set result
          </Text>
          {STATUSES.map((s) => {
            const ss = statusStyle(s, colors);
            const active = editing?.status === s;
            return (
              <Pressable
                key={s}
                onPress={() => {
                  if (editing && s !== editing.status) {
                    update.mutate({
                      id: editing.id,
                      data: { status: s as never },
                    });
                  }
                  setEditing(null);
                }}
                style={({ pressed }) => [
                  styles.editOpt,
                  {
                    backgroundColor: active ? ss.bg : "transparent",
                    borderColor: active ? ss.color : colors.cardBorder,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? ss.color : colors.foreground,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 13.5,
                  }}
                >
                  {s}
                </Text>
                {active && <Feather name="check" size={14} color={ss.color} />}
              </Pressable>
            );
          })}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  statLbl: {
    fontSize: 9.5,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 80,
    justifyContent: "center",
  },
  editSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    gap: 6,
  },
  editOpt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
});
