import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Last5Chart } from "@/components/Last5Chart";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { TeamLogo } from "@/components/TeamLogo";
import { WinProbBadge } from "@/components/WinProbBadge";
import { useBetSlip, type SlipPick } from "@/contexts/BetSlipContext";
import { useToast } from "@/contexts/ToastContext";
import { useColors } from "@/hooks/useColors";
import { formatTime } from "@/lib/format";
import type { PlayerGroup } from "@/components/PlayerCard";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function propToSlip(prop: any, side: "Over" | "Under"): SlipPick {
  return {
    id: prop.id,
    sport: prop.sport,
    playerName: prop.playerName,
    playerImage: prop.playerImage,
    teamAbbr: prop.teamAbbr,
    teamLogo: prop.teamLogo,
    opponentAbbr: prop.opponentAbbr,
    propType: prop.propType,
    line: prop.line,
    recommendation: side === "Over" ? "Lean Over" : "Lean Under",
    side,
    winProbability: prop.winProbability ?? 50,
    edgeScore: prop.edgeScore,
    gameLabel: prop.gameLabel,
    gameStartTime: prop.gameStartTime,
    addedAt: new Date().toISOString(),
  };
}

function FactorChip({
  label,
  value,
  impact,
  icon,
}: {
  label: string;
  value: string;
  impact: number;
  icon: keyof typeof Feather.glyphMap;
}) {
  const colors = useColors();
  let chipColor = colors.mutedForeground;
  let chipBg = colors.muted;
  let chipBorder = colors.cardBorder;
  if (impact > 2) {
    chipColor = colors.over;
    chipBg = colors.overSoft;
    chipBorder = colors.overBorder;
  } else if (impact < -2) {
    chipColor = colors.under;
    chipBg = colors.underSoft;
    chipBorder = colors.underBorder;
  }
  const sign = impact > 0 ? "+" : "";
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: chipBg, borderColor: chipBorder },
      ]}
    >
      <Feather name={icon} size={12} color={chipColor} />
      <Text style={{ color: chipColor, fontSize: 11, fontFamily: "Inter_600SemiBold" }}>
        {label}:
      </Text>
      <Text style={{ color: chipColor, fontSize: 11 }} numberOfLines={1}>
        {value}
      </Text>
      <Text
        style={{
          color: chipColor,
          fontSize: 11,
          fontFamily: "Inter_700Bold",
          fontVariant: ["tabular-nums"],
        }}
      >
        {sign}
        {impact}pp
      </Text>
    </View>
  );
}

function CategoryRow({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prop,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prop: any;
}) {
  const colors = useColors();
  const slip = useBetSlip();
  const { show } = useToast();
  const [open, setOpen] = useState(false);

  const existing = slip.picks.find((p) => p.id === prop.id);
  const selectedSide = existing?.side ?? null;
  const isInSlip = !!existing;
  const recommendedSide: "Over" | "Under" = String(prop.recommendation).includes("Over")
    ? "Over"
    : "Under";
  const wp: number = prop.winProbability ?? 50;

  function pick(side: "Over" | "Under") {
    if (selectedSide === side) {
      slip.remove(prop.id);
      show({ title: "Removed", description: `${prop.playerName} ${prop.propType} ${prop.line}` });
      return;
    }
    if (selectedSide && selectedSide !== side) {
      slip.remove(prop.id);
      slip.add(propToSlip(prop, side));
      show({ title: `Switched to ${side}`, description: `${prop.playerName} ${side} ${prop.line} ${prop.propType}` });
      return;
    }
    slip.add(propToSlip(prop, side));
    show({ title: "Added to My Picks", description: `${prop.playerName} ${side} ${prop.line} ${prop.propType}` });
  }

  return (
    <View
      style={[
        styles.catRow,
        {
          backgroundColor: prop.bestPick ? "rgba(251,191,36,0.06)" : colors.card,
          borderColor: prop.bestPick
            ? "rgba(251,191,36,0.45)"
            : isInSlip
              ? colors.primary
              : colors.cardBorder,
          borderWidth: isInSlip ? 1.5 : 1,
        },
      ]}
    >
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.catHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text
              style={{
                color: colors.foreground,
                fontFamily: "Inter_700Bold",
                fontSize: 22,
                fontVariant: ["tabular-nums"],
              }}
            >
              {prop.line}
            </Text>
            <WinProbBadge probability={wp} />
            {prop.bestPick && (
              <View
                style={[
                  styles.bestTag,
                  {
                    backgroundColor: "rgba(251,191,36,0.2)",
                    borderColor: "rgba(251,191,36,0.45)",
                  },
                ]}
              >
                <Feather name="star" size={10} color="#fcd34d" />
                <Text
                  style={{
                    color: "#fcd34d",
                    fontFamily: "Inter_700Bold",
                    fontSize: 9,
                    letterSpacing: 0.6,
                  }}
                >
                  BEST PICK
                </Text>
              </View>
            )}
          </View>
          <Text
            style={{ color: colors.mutedForeground, fontSize: 11.5, marginTop: 3 }}
            numberOfLines={1}
          >
            {prop.propType} · L5{" "}
            <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>
              {prop.avg5}
            </Text>{" "}
            · Rec:{" "}
            <Text
              style={{
                color: recommendedSide === "Over" ? colors.over : colors.under,
                fontFamily: "Inter_600SemiBold",
              }}
            >
              {recommendedSide === "Over" ? "▲ More" : "▼ Less"}
            </Text>
          </Text>
        </View>
        <Feather
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.mutedForeground}
        />
      </Pressable>

      {open && (
        <View style={[styles.catBody, { borderTopColor: colors.divider }]}>
          <Last5Chart games={prop.recentGames ?? []} line={prop.line} />

          {prop.factors && (
            <View style={styles.chipRow}>
              <FactorChip
                label="Opp"
                value={`#${prop.factors.opponent.rank} ${prop.factors.opponent.rating}`}
                impact={prop.factors.opponent.impact}
                icon="shield"
              />
              <FactorChip
                label="H2H"
                value={`${prop.factors.h2h.avgVsOpponent} avg`}
                impact={prop.factors.h2h.impact}
                icon="repeat"
              />
              {prop.factors.weather && (
                <FactorChip
                  label="Weather"
                  value={
                    prop.factors.weather.indoor
                      ? "Dome"
                      : (prop.factors.weather.conditions ?? "—")
                  }
                  impact={prop.factors.weather.impact}
                  icon={prop.factors.weather.indoor ? "home" : "cloud"}
                />
              )}
            </View>
          )}

          {prop.reasoning ? (
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: 11.5,
                lineHeight: 17,
              }}
            >
              {prop.reasoning}
            </Text>
          ) : null}

          {Array.isArray(prop.redFlags) && prop.redFlags.length > 0 ? (
            <View style={{ gap: 2 }}>
              {prop.redFlags.map((f: string, i: number) => (
                <Text key={i} style={{ color: "#fca5a5", fontSize: 10.5 }}>
                  ⚠ {f}
                </Text>
              ))}
            </View>
          ) : null}

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => pick("Over")}
              style={({ pressed }) => [
                styles.pickBtn,
                {
                  backgroundColor:
                    selectedSide === "Over" ? colors.over : "transparent",
                  borderColor:
                    selectedSide === "Over"
                      ? colors.over
                      : recommendedSide === "Over"
                        ? colors.overBorder
                        : colors.cardBorder,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              {selectedSide === "Over" && (
                <Feather name="check" size={14} color="#fff" />
              )}
              <Text
                style={{
                  color:
                    selectedSide === "Over"
                      ? "#fff"
                      : recommendedSide === "Over"
                        ? colors.over
                        : colors.foreground,
                  fontFamily: "Inter_700Bold",
                  fontSize: 13,
                }}
              >
                ▲ More {prop.line}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => pick("Under")}
              style={({ pressed }) => [
                styles.pickBtn,
                {
                  backgroundColor:
                    selectedSide === "Under" ? colors.under : "transparent",
                  borderColor:
                    selectedSide === "Under"
                      ? colors.under
                      : recommendedSide === "Under"
                        ? colors.underBorder
                        : colors.cardBorder,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              {selectedSide === "Under" && (
                <Feather name="check" size={14} color="#fff" />
              )}
              <Text
                style={{
                  color:
                    selectedSide === "Under"
                      ? "#fff"
                      : recommendedSide === "Under"
                        ? colors.under
                        : colors.foreground,
                  fontFamily: "Inter_700Bold",
                  fontSize: 13,
                }}
              >
                ▼ Less {prop.line}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  player: PlayerGroup | null;
}

export function PlayerSheet({ open, onClose, player }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  if (!player) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sorted = [...player.props].sort((a: any, b: any) => {
    if (a.bestPick && !b.bestPick) return -1;
    if (!a.bestPick && b.bestPick) return 1;
    return (b.winProbability ?? 0) - (a.winProbability ?? 0);
  });
  const startTime = formatTime(player.gameStartTime);

  return (
    <Modal
      visible={open}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.65)" }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.card, borderTopColor: colors.cardBorder },
          ]}
        >
          {/* Drag handle */}
          <View style={{ alignItems: "center", paddingTop: 8, paddingBottom: 6 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.25)" }} />
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero */}
            <View
              style={[
                styles.hero,
                { borderBottomColor: colors.divider, backgroundColor: colors.surfaceElev },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <PlayerAvatar src={player.playerImage} name={player.playerName} size={64} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontFamily: "Inter_700Bold",
                      fontSize: 24,
                      lineHeight: 28,
                    }}
                    numberOfLines={1}
                  >
                    {player.playerName}
                  </Text>
                  <Text
                    style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 2 }}
                  >
                    {player.sport} · {player.teamAbbr}
                    {player.position ? ` · ${player.position}` : ""}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.gameCard,
                  { backgroundColor: colors.background, borderColor: colors.divider },
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                  <TeamLogo
                    logoUrl={player.opponentLogo}
                    abbreviation={player.opponentAbbr}
                    size={26}
                  />
                  <Text
                    style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 13 }}
                  >
                    {player.opponentAbbr}
                  </Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>Today</Text>
                  {startTime ? (
                    <Text
                      style={{
                        color: colors.foreground,
                        fontSize: 11,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {startTime}
                    </Text>
                  ) : null}
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    flex: 1,
                    justifyContent: "flex-end",
                  }}
                >
                  <Text
                    style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 13 }}
                  >
                    {player.teamAbbr}
                  </Text>
                  <TeamLogo
                    logoUrl={player.teamLogo}
                    abbreviation={player.teamAbbr}
                    size={26}
                  />
                </View>
              </View>
            </View>

            {/* Categories */}
            <View style={{ paddingHorizontal: 14, paddingTop: 14, gap: 10 }}>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontFamily: "Inter_700Bold",
                  fontSize: 11,
                  letterSpacing: 1.2,
                }}
              >
                STAT LINES · {sorted.length}{" "}
                {sorted.length === 1 ? "CATEGORY" : "CATEGORIES"}
              </Text>
              {sorted.map((p) => (
                <CategoryRow key={p.id} prop={p} />
              ))}
            </View>
          </ScrollView>

          {/* Sticky close */}
          <View
            style={[
              styles.footer,
              {
                paddingBottom: Math.max(12, insets.bottom),
                borderTopColor: colors.cardBorder,
                backgroundColor: colors.card,
              },
            ]}
          >
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeBtn,
                {
                  backgroundColor: colors.foreground,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Feather name="x" size={20} color={colors.background} />
              <Text
                style={{
                  color: colors.background,
                  fontFamily: "Inter_700Bold",
                  fontSize: 15,
                }}
              >
                Close
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    height: "92%",
    borderTopWidth: 1,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: "hidden",
  },
  hero: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 14,
  },
  gameCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  catRow: { borderRadius: 10, overflow: "hidden" },
  catHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 8,
  },
  catBody: {
    padding: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  bestTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  pickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  footer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  closeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 12,
  },
});
