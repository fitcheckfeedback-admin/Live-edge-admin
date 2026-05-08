import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PlayerAvatar } from "@/components/PlayerAvatar";
import { WinProbBadge } from "@/components/WinProbBadge";
import { useColors } from "@/hooks/useColors";
import { formatTime } from "@/lib/format";

export interface PlayerGroup {
  playerId: string;
  playerName: string;
  playerImage?: string;
  sport: string;
  position?: string;
  teamAbbr: string;
  teamLogo?: string;
  opponentAbbr: string;
  opponentLogo?: string;
  gameId?: string;
  gameLabel?: string;
  gameStartTime?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bestProp: any;
}

function EdgeBar({ score }: { score: number }) {
  const colors = useColors();
  const pct = Math.min(Math.max((score / 10) * 100, 0), 100);
  const barColor =
    score >= 7.5
      ? colors.primary
      : score >= 5
      ? colors.accent
      : colors.mutedForeground;
  return (
    <View style={edgeStyles.wrap}>
      <View
        style={[
          edgeStyles.track,
          { backgroundColor: colors.backgroundSurface },
        ]}
      >
        <View
          style={[
            edgeStyles.fill,
            { width: `${pct}%` as any, backgroundColor: barColor },
          ]}
        />
      </View>
      <Text
        style={[
          edgeStyles.label,
          { color: barColor, fontFamily: "Inter_700Bold" },
        ]}
      >
        {score.toFixed(1)}
      </Text>
    </View>
  );
}

const edgeStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  track: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 2 },
  label: { fontSize: 11, fontVariant: ["tabular-nums"], minWidth: 24 },
});

export function PlayerCard({
  group,
  selectedCount,
  onPress,
}: {
  group: PlayerGroup;
  selectedCount: number;
  onPress: () => void;
}) {
  const colors = useColors();
  const best = group.bestProp;
  const isOver = String(best.recommendation).includes("Over");
  const startTime = formatTime(group.gameStartTime);
  const isSelected = selectedCount > 0;
  const edgeScore: number = best.edgeScore ?? 0;
  const winProb: number = best.winProbability ?? 50;
  const isStrong = winProb >= 65;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isSelected
            ? colors.primary
            : isStrong
            ? "rgba(0,255,135,0.18)"
            : colors.cardBorder,
          borderWidth: isSelected ? 1.5 : 1,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        isSelected && { shadowColor: colors.primary, shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
      ]}
    >
      {/* Top: sport tag + time + edge */}
      <View style={styles.topMeta}>
        <View
          style={[
            styles.sportTag,
            { backgroundColor: colors.backgroundSurface, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.sportTagText, { color: colors.mutedForeground }]}>
            {group.sport}
          </Text>
        </View>

        <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
          {group.teamAbbr} vs {group.opponentAbbr}
          {startTime ? `  ·  ${startTime}` : ""}
        </Text>

        {isSelected && (
          <View
            style={[
              styles.inSlipTag,
              { backgroundColor: colors.primaryGlow, borderColor: colors.cardBorderActive },
            ]}
          >
            <Feather name="bookmark" size={9} color={colors.primary} />
            <Text style={[styles.inSlipText, { color: colors.primary }]}>
              {selectedCount}
            </Text>
          </View>
        )}
      </View>

      {/* Main content */}
      <View style={styles.mainRow}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          <PlayerAvatar
            src={group.playerImage}
            name={group.playerName}
            size={52}
          />
          {isStrong && (
            <View
              style={[
                styles.strongDot,
                { backgroundColor: colors.primary, borderColor: colors.card },
              ]}
            />
          )}
        </View>

        {/* Player info */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={[styles.playerName, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {group.playerName}
          </Text>
          <Text
            style={[styles.posText, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {group.position ?? group.sport}
            {group.position ? ` · ${group.sport}` : ""}
          </Text>

          {/* Edge score bar */}
          <View style={{ marginTop: 8, marginBottom: 2 }}>
            <Text
              style={[styles.edgeLabel, { color: colors.mutedForeground }]}
            >
              EDGE
            </Text>
            <EdgeBar score={edgeScore} />
          </View>
        </View>

        {/* Right: win prob + side */}
        <View style={styles.rightCol}>
          <WinProbBadge probability={winProb} />
          <View
            style={[
              styles.sidePill,
              {
                backgroundColor: isOver ? colors.overSoft : colors.underSoft,
                borderColor: isOver ? colors.overBorder : colors.underBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.sideText,
                { color: isOver ? colors.over : colors.under },
              ]}
            >
              {isOver ? "▲" : "▼"} {isOver ? "OVER" : "UNDER"}
            </Text>
          </View>
        </View>
      </View>

      {/* Best prop highlight row */}
      <View
        style={[
          styles.bestRow,
          {
            backgroundColor: "rgba(245,158,11,0.05)",
            borderColor: "rgba(245,158,11,0.18)",
          },
        ]}
      >
        <View style={styles.bestLeft}>
          <Feather name="star" size={10} color="#f59e0b" />
          <Text style={styles.bestLabel}>BEST PICK</Text>
        </View>
        <Text
          style={[
            styles.lineNum,
            { color: colors.foreground, fontVariant: ["tabular-nums"] },
          ]}
        >
          {best.line}
        </Text>
        <Text
          style={[styles.propTypeText, { color: colors.mutedForeground }]}
          numberOfLines={1}
        >
          {best.propType}
        </Text>
        <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    gap: 12,
    overflow: "hidden",
  },
  topMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sportTag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
  },
  sportTagText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 1.2,
  },
  timeText: {
    fontSize: 11,
    flex: 1,
  },
  inSlipTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
  },
  inSlipText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    fontVariant: ["tabular-nums"],
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  avatarWrap: { position: "relative" },
  strongDot: {
    position: "absolute",
    bottom: 0,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  playerName: {
    fontFamily: "Inter_700Bold",
    fontSize: 16.5,
    letterSpacing: -0.3,
  },
  posText: { fontSize: 11, marginTop: 2 },
  edgeLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 8.5,
    letterSpacing: 1.3,
    marginBottom: 4,
  },
  rightCol: {
    alignItems: "flex-end",
    gap: 8,
  },
  sidePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  sideText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 0.8,
  },
  bestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  bestLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bestLabel: {
    color: "#f59e0b",
    fontFamily: "Inter_700Bold",
    fontSize: 8.5,
    letterSpacing: 1,
  },
  lineNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  propTypeText: {
    fontSize: 11,
    flex: 1,
  },
});
