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
        <AppHeader title="My Picks" />
        <View style={{ padding: 14 }}>
          <EmptyState
            icon="check-square"
            title="Your bet slip is empty"
            description="Head to Best Picks and tap any pick to add it to your slip."
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title="My Picks" />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 110, gap: 16 }}>
        {/* Aggregate header */}
        {stats && (
          <View
            style={[
              styles.statHero,
              {
                backgroundColor: "rgba(34,197,94,0.07)",
                borderColor: "rgba(34,197,94,0.35)",
              },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <Feather name="award" size={18} color={colors.primary} />
              <Text
                style={{
                  color: colors.foreground,
                  fontFamily: "Inter_700Bold",
                  fontSize: 16,
                  flex: 1,
                }}
              >
                My Bet Slip
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                {slip.count} pick{slip.count === 1 ? "" : "s"}
              </Text>
            </View>
            <View style={styles.statRow}>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>
                  AVG WIN
                </Text>
                <Text
                  style={[styles.statVal, { color: colors.foreground }]}
                >
                  {stats.avg}%
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>
                  STRONG
                </Text>
                <Text style={[styles.statVal, { color: colors.primary }]}>
                  {stats.strong}
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>
                  COMBINED*
                </Text>
                <Text style={[styles.statVal, { color: colors.accent }]}>
                  {stats.combined}%
                </Text>
              </View>
            </View>
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: 10,
                textAlign: "center",
                marginTop: 10,
                opacity: 0.75,
              }}
            >
              *Naive product of individual win probabilities. Research only.
            </Text>
          </View>
        )}

        {/* Groups */}
        {grouped.map(([key, picks]) => {
          const [sport, gameLabel] = key.split("__");
          return (
            <View key={key} style={{ gap: 8 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingHorizontal: 4,
                }}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontFamily: "Inter_700Bold",
                    fontSize: 10,
                    letterSpacing: 1.4,
                  }}
                >
                  {sport}
                </Text>
                <Text
                  style={{
                    color: colors.foreground,
                    fontFamily: "Inter_700Bold",
                    fontSize: 13,
                  }}
                >
                  {gameLabel}
                </Text>
              </View>

              <View style={{ gap: 8 }}>
                {picks.map((p) => (
                  <View
                    key={p.id}
                    style={[
                      styles.pickRow,
                      { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    ]}
                  >
                    <PlayerAvatar src={p.playerImage} name={p.playerName} size={44} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={{
                          color: colors.foreground,
                          fontFamily: "Inter_700Bold",
                          fontSize: 13.5,
                        }}
                        numberOfLines={1}
                      >
                        {p.playerName}
                      </Text>
                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontSize: 11,
                          marginTop: 2,
                        }}
                        numberOfLines={1}
                      >
                        {p.propType} · {p.teamAbbr} vs {p.opponentAbbr}
                      </Text>
                      <View style={{ flexDirection: "row", gap: 6, alignItems: "center", marginTop: 6 }}>
                        <SidePill side={p.side} line={p.line} size="sm" />
                        <WinProbBadge probability={p.winProbability} size="sm" />
                      </View>
                    </View>
                    <Pressable
                      hitSlop={10}
                      onPress={() => {
                        slip.remove(p.id);
                        show({ title: "Removed", description: `${p.playerName} ${p.recommendation} ${p.line}` });
                      }}
                      style={({ pressed }) => [
                        styles.removeBtn,
                        { opacity: pressed ? 0.5 : 1 },
                      ]}
                    >
                      <Feather name="trash-2" size={16} color={colors.under} />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        {/* Clear all */}
        <Pressable
          onPress={() => {
            slip.clear();
            show({ title: "Cleared all picks" });
          }}
          style={({ pressed }) => [
            styles.clearBtn,
            {
              borderColor: colors.cardBorder,
              opacity: pressed ? 0.5 : 1,
            },
          ]}
        >
          <Feather name="trash-2" size={14} color={colors.mutedForeground} />
          <Text
            style={{
              color: colors.mutedForeground,
              fontFamily: "Inter_600SemiBold",
              fontSize: 13,
            }}
          >
            Clear all picks
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  statHero: { padding: 16, borderRadius: 14, borderWidth: 1 },
  statRow: { flexDirection: "row", gap: 8 },
  statLbl: {
    fontFamily: "Inter_700Bold",
    fontSize: 9.5,
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  statVal: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    fontVariant: ["tabular-nums"],
  },
  pickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  removeBtn: { padding: 6 },
  clearBtn: {
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
});
