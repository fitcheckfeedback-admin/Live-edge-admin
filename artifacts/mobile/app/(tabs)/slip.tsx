import { Feather } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { SidePill } from "@/components/SidePill";
import { WinProbBadge } from "@/components/WinProbBadge";
import { useBetSlip, type SlipPick } from "@/contexts/BetSlipContext";
import { useToast } from "@/contexts/ToastContext";
import { useColors } from "@/hooks/useColors";

function ProbabilityRing({
  combined,
  avg,
  strong,
  total,
}: {
  combined: number;
  avg: number;
  strong: number;
  total: number;
}) {
  const colors = useColors();
  const ringColor =
    avg >= 65 ? colors.primary : avg >= 55 ? colors.accent : colors.mutedForeground;

  return (
    <View style={ringStyles.wrap}>
      {/* Outer ring visual */}
      <View
        style={[
          ringStyles.ring,
          {
            borderColor: ringColor,
            shadowColor: ringColor,
            shadowOpacity: 0.3,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 0 },
          },
        ]}
      >
        <Text style={[ringStyles.pct, { color: ringColor }]}>{avg}%</Text>
        <Text style={[ringStyles.pctLabel, { color: colors.mutedForeground }]}>
          AVG WIN
        </Text>
      </View>

      {/* Side stats */}
      <View style={ringStyles.statsCol}>
        <View style={ringStyles.statItem}>
          <Text style={[ringStyles.statVal, { color: colors.primary }]}>{strong}</Text>
          <Text style={[ringStyles.statLbl, { color: colors.mutedForeground }]}>
            STRONG {"\n"}PLAYS
          </Text>
        </View>
        <View style={[ringStyles.statDivider, { backgroundColor: colors.divider }]} />
        <View style={ringStyles.statItem}>
          <Text style={[ringStyles.statVal, { color: colors.accent }]}>
            {combined}%
          </Text>
          <Text style={[ringStyles.statLbl, { color: colors.mutedForeground }]}>
            COMBINED {"*"}
          </Text>
        </View>
        <View style={[ringStyles.statDivider, { backgroundColor: colors.divider }]} />
        <View style={ringStyles.statItem}>
          <Text style={[ringStyles.statVal, { color: colors.foreground }]}>{total}</Text>
          <Text style={[ringStyles.statLbl, { color: colors.mutedForeground }]}>
            TOTAL {"\n"}PICKS
          </Text>
        </View>
      </View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 20, paddingVertical: 4 },
  ring: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  pct: { fontFamily: "Inter_700Bold", fontSize: 26, fontVariant: ["tabular-nums"] },
  pctLabel: { fontFamily: "Inter_700Bold", fontSize: 8, letterSpacing: 1.2, marginTop: 2 },
  statsCol: { flex: 1, gap: 8 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  statVal: { fontFamily: "Inter_700Bold", fontSize: 18, fontVariant: ["tabular-nums"], minWidth: 44 },
  statLbl: { fontFamily: "Inter_700Bold", fontSize: 8.5, letterSpacing: 1.1, lineHeight: 13 },
  statDivider: { height: 1 },
});

function PickRow({ pick, onRemove }: { pick: SlipPick; onRemove: () => void }) {
  const colors = useColors();
  const isOver = pick.side === "Over";

  return (
    <View
      style={[
        styles.pickRow,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
        },
      ]}
    >
      {/* Side accent stripe */}
      <View
        style={[
          styles.sideStripe,
          { backgroundColor: isOver ? colors.over : colors.under },
        ]}
      />

      <PlayerAvatar src={pick.playerImage} name={pick.playerName} size={42} />

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={[styles.pickName, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {pick.playerName}
        </Text>
        <Text
          style={[styles.pickMeta, { color: colors.mutedForeground }]}
          numberOfLines={1}
        >
          {pick.propType} · {pick.teamAbbr} vs {pick.opponentAbbr}
        </Text>
        <View style={styles.pickBadges}>
          <SidePill side={pick.side} line={pick.line} size="sm" />
          <WinProbBadge probability={pick.winProbability} size="sm" />
        </View>
      </View>

      <Pressable
        hitSlop={12}
        onPress={onRemove}
        style={({ pressed }) => [
          styles.removeBtn,
          {
            backgroundColor: colors.backgroundSurface,
            borderColor: colors.cardBorder,
            opacity: pressed ? 0.5 : 1,
          },
        ]}
      >
        <Feather name="x" size={14} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

export default function SlipScreen() {
  const colors = useColors();
  const slip = useBetSlip();
  const { show } = useToast();

  const stats = useMemo(() => {
    if (slip.picks.length === 0) return null;
    const avg = slip.picks.reduce((s, p) => s + p.winProbability, 0) / slip.picks.length;
    const combined =
      slip.picks.reduce((p, x) => p * (x.winProbability / 100), 1) * 100;
    const strong = slip.picks.filter((p) => p.winProbability >= 65).length;
    return {
      avg: Math.round(avg),
      strong,
      combined: Math.round(combined * 10) / 10,
    };
  }, [slip.picks]);

  const grouped = useMemo(() => {
    const m = new Map<string, SlipPick[]>();
    for (const p of slip.picks) {
      const k = `${p.sport}__${p.gameLabel ?? `${p.teamAbbr} vs ${p.opponentAbbr}`}`;
      m.set(k, [...(m.get(k) ?? []), p]);
    }
    return [...m.entries()];
  }, [slip.picks]);

  if (slip.picks.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppHeader title="My Slip" />
        <View style={{ padding: 14, flex: 1, justifyContent: "center" }}>
          <EmptyState
            icon="bookmark"
            title="Your slip is empty"
            description="Head to the Edge Board and tap any pick to add it here."
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title="My Slip" subtitle={`${slip.count} pick${slip.count === 1 ? "" : "s"} selected`} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 110, gap: 16 }}>

        {/* Hero probability card */}
        {stats && (
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <View style={[styles.heroStripe, { backgroundColor: colors.primary }]} />
            <View style={{ padding: 16 }}>
              <View style={styles.heroTitleRow}>
                <Feather name="bookmark" size={15} color={colors.primary} />
                <Text style={[styles.heroTitle, { color: colors.foreground }]}>
                  Slip Summary
                </Text>
              </View>
              <View style={{ marginTop: 16 }}>
                <ProbabilityRing
                  avg={stats.avg}
                  combined={stats.combined}
                  strong={stats.strong}
                  total={slip.count}
                />
              </View>
              <Text
                style={[styles.disclaimer, { color: colors.mutedForeground }]}
              >
                * Combined = product of individual win probabilities. Research only.
              </Text>
            </View>
          </View>
        )}

        {/* Pick groups */}
        {grouped.map(([key, picks]) => {
          const [sport, gameLabel] = key.split("__");
          return (
            <View key={key} style={{ gap: 8 }}>
              {/* Group header */}
              <View style={styles.groupHeader}>
                <View
                  style={[
                    styles.sportPill,
                    {
                      backgroundColor: colors.primaryGlow,
                      borderColor: colors.cardBorderActive,
                    },
                  ]}
                >
                  <Text style={[styles.sportPillText, { color: colors.primary }]}>
                    {sport}
                  </Text>
                </View>
                <Text
                  style={[styles.gameLabel, { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {gameLabel}
                </Text>
              </View>

              {picks.map((p) => (
                <PickRow
                  key={p.id}
                  pick={p}
                  onRemove={() => {
                    slip.remove(p.id);
                    show({
                      title: "Removed",
                      description: `${p.playerName} ${p.recommendation} ${p.line}`,
                    });
                  }}
                />
              ))}
            </View>
          );
        })}

        {/* Clear all */}
        <Pressable
          onPress={() => {
            slip.clear();
            show({ title: "Slip cleared" });
          }}
          style={({ pressed }) => [
            styles.clearBtn,
            {
              borderColor: colors.underBorder,
              backgroundColor: colors.underSoft,
              opacity: pressed ? 0.6 : 1,
            },
          ]}
        >
          <Feather name="trash-2" size={14} color={colors.under} />
          <Text style={[styles.clearText, { color: colors.under }]}>
            Clear all picks
          </Text>
        </Pressable>
      </ScrollView>
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
  heroStripe: { height: 3, opacity: 0.7 },
  heroTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  heroTitle: { fontFamily: "Inter_700Bold", fontSize: 15 },
  disclaimer: {
    fontSize: 10,
    marginTop: 14,
    lineHeight: 15,
    opacity: 0.7,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 2,
  },
  sportPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  sportPillText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9.5,
    letterSpacing: 1,
  },
  gameLabel: { fontFamily: "Inter_700Bold", fontSize: 13.5, flex: 1 },
  pickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    padding: 12,
  },
  sideStripe: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3 },
  pickName: { fontFamily: "Inter_700Bold", fontSize: 13.5, letterSpacing: -0.2 },
  pickMeta: { fontSize: 11, marginTop: 2 },
  pickBadges: { flexDirection: "row", gap: 6, alignItems: "center", marginTop: 7 },
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  clearBtn: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  clearText: { fontFamily: "Inter_600SemiBold", fontSize: 13.5 },
});
