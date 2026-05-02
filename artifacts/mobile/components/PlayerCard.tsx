import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PlayerAvatar } from "@/components/PlayerAvatar";
import { SidePill } from "@/components/SidePill";
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

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isSelected ? colors.primary : colors.cardBorder,
          borderWidth: isSelected ? 1.5 : 1,
          borderRadius: 14,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
      ]}
    >
      {/* Player header */}
      <View style={styles.headerRow}>
        <PlayerAvatar src={group.playerImage} name={group.playerName} size={56} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.nameRow}>
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.playerName, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {group.playerName}
              </Text>
              <Text
                style={[styles.subText, { color: colors.mutedForeground }]}
                numberOfLines={1}
              >
                {group.sport} · {group.teamAbbr}
                {group.position ? ` · ${group.position}` : ""}
              </Text>
              <Text
                style={[styles.subText, { color: colors.mutedForeground }]}
                numberOfLines={1}
              >
                vs {group.opponentAbbr}
                {startTime ? ` · ${startTime}` : ""}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </View>
          {isSelected && (
            <View
              style={[
                styles.slipBadge,
                {
                  backgroundColor: "rgba(34,197,94,0.15)",
                  borderColor: "rgba(34,197,94,0.4)",
                },
              ]}
            >
              <Text
                style={{
                  color: colors.primary,
                  fontFamily: "Inter_700Bold",
                  fontSize: 10,
                }}
              >
                {selectedCount} in slip
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Best Pick row */}
      <View
        style={[
          styles.bestRow,
          {
            backgroundColor: "rgba(251,191,36,0.05)",
            borderColor: "rgba(251,191,36,0.3)",
          },
        ]}
      >
        <View
          style={[
            styles.bestBadge,
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
              letterSpacing: 0.8,
            }}
          >
            BEST
          </Text>
        </View>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text
            style={[
              styles.line,
              { color: colors.foreground, fontVariant: ["tabular-nums"] },
            ]}
          >
            {best.line}
          </Text>
          <Text
            style={{ color: colors.mutedForeground, fontSize: 11, flex: 1 }}
            numberOfLines={1}
          >
            {best.propType}
          </Text>
        </View>
        <WinProbBadge probability={best.winProbability ?? 50} />
        <SidePill side={isOver ? "Over" : "Under"} />
      </View>

      <Text
        style={{
          color: colors.mutedForeground,
          fontSize: 10.5,
          marginTop: 8,
          textAlign: "center",
          opacity: 0.7,
        }}
      >
        Tap for all {group.props.length} stat{" "}
        {group.props.length === 1 ? "category" : "categories"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  nameRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  playerName: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    lineHeight: 19,
  },
  subText: { fontSize: 11, marginTop: 2 },
  slipBadge: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  bestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  bestBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  line: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
});
