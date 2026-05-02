import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface RecentGame {
  date: string;
  opponent: string;
  isHome: boolean;
  value: number;
  beatLine: boolean;
}

export function Last5Chart({
  games,
  line,
}: {
  games: RecentGame[];
  line: number;
}) {
  const colors = useColors();

  if (!games || games.length === 0) {
    return (
      <View
        style={[
          styles.empty,
          { borderColor: colors.divider, borderRadius: colors.radius },
        ]}
      >
        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
          No recent game data
        </Text>
      </View>
    );
  }

  const maxValue = Math.max(line * 1.6, ...games.map((g) => g.value), 1);
  const linePercent = (line / maxValue) * 100;
  const avg = games.reduce((s, g) => s + g.value, 0) / games.length;

  return (
    <View
      style={[
        styles.wrap,
        { borderColor: colors.divider, backgroundColor: "rgba(0,0,0,0.25)" },
      ]}
    >
      <View style={styles.chart}>
        {/* Dashed line marker */}
        <View
          style={[
            styles.lineMarker,
            { bottom: `${linePercent}%`, borderColor: "rgba(255,255,255,0.4)" },
          ]}
          pointerEvents="none"
        >
          <View
            style={[
              styles.lineLabel,
              { backgroundColor: "rgba(0,0,0,0.85)" },
            ]}
          >
            <Text
              style={{
                color: "#fff",
                fontFamily: "Inter_700Bold",
                fontSize: 10,
                fontVariant: ["tabular-nums"],
              }}
            >
              {line}
            </Text>
          </View>
        </View>

        {/* Bars */}
        <View style={styles.bars}>
          {games.map((g, i) => {
            const heightPct = Math.max(4, (g.value / maxValue) * 100);
            return (
              <View key={i} style={styles.barCol}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${heightPct}%`,
                      backgroundColor: g.beatLine ? colors.over : colors.under,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      </View>

      {/* X-axis labels */}
      <View style={styles.labels}>
        {games.map((g, i) => {
          const d = new Date(g.date);
          const label = `${d.getMonth() + 1}/${d.getDate()}`;
          return (
            <View key={i} style={styles.labelCol}>
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 10,
                  fontFamily: "Inter_700Bold",
                  fontVariant: ["tabular-nums"],
                }}
              >
                {g.value}
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: 9,
                }}
                numberOfLines={1}
              >
                {g.opponent}
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: 9,
                  fontVariant: ["tabular-nums"],
                  opacity: 0.7,
                }}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      <View
        style={[
          styles.footer,
          { borderTopColor: colors.divider },
        ]}
      >
        <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
          {avg.toFixed(1)} avg last {games.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  empty: {
    borderWidth: 1,
    borderStyle: "dashed",
    paddingVertical: 18,
    alignItems: "center",
  },
  chart: { height: 110, position: "relative" },
  lineMarker: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopWidth: 1.5,
    borderStyle: "dashed",
    zIndex: 10,
  },
  lineLabel: {
    position: "absolute",
    right: 0,
    top: -10,
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  bars: {
    position: "absolute",
    inset: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    gap: 6,
  },
  barCol: { flex: 1, height: "100%", justifyContent: "flex-end" },
  bar: { width: "100%", borderTopLeftRadius: 4, borderTopRightRadius: 4, minHeight: 4 },
  labels: { flexDirection: "row", marginTop: 6, gap: 6 },
  labelCol: { flex: 1, alignItems: "center" },
  footer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    alignItems: "center",
  },
});
