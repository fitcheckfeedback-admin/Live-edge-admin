import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useGetAlerts, useMarkAlertRead } from "@workspace/api-client-react";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useColors } from "@/hooks/useColors";

function severityProps(severity: string, colors: ReturnType<typeof useColors>) {
  switch (severity) {
    case "high":
      return { color: colors.destructive, icon: "alert-circle" as const };
    case "medium":
      return { color: colors.accent, icon: "alert-triangle" as const };
    case "low":
    default:
      return { color: colors.primary, icon: "info" as const };
  }
}

export default function AlertsScreen() {
  const colors = useColors();
  const qc = useQueryClient();
  const { data, isLoading, refetch, isRefetching } = useGetAlerts(
    { unreadOnly: false },
    {
      query: {
        queryKey: ["/api/alerts", { unreadOnly: false }],
        refetchInterval: 30000,
      },
    },
  );

  const markRead = useMarkAlertRead({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/api/alerts"] });
        qc.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      },
    },
  });

  const alerts = data?.alerts ?? [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Alerts"
        showBack
        onBack={() => router.back()}
        onRefresh={() => refetch()}
        refreshing={isRefetching}
      />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 110, gap: 10 }}>
        {isLoading ? (
          [1, 2, 3].map((i) => <SkeletonCard key={i} height={92} />)
        ) : alerts.length === 0 ? (
          <EmptyState
            icon="bell-off"
            title="No alerts"
            description="You'll see notifications about edge spikes and late line moves here."
          />
        ) : (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          alerts.map((a: any) => {
            const sev = severityProps(a.severity, colors);
            return (
              <View
                key={a.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: a.isRead ? colors.muted : colors.card,
                    borderColor: colors.cardBorder,
                    borderLeftColor: sev.color,
                    opacity: a.isRead ? 0.65 : 1,
                  },
                ]}
              >
                <Feather name={sev.icon} size={18} color={sev.color} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.foreground,
                        fontFamily: "Inter_700Bold",
                        fontSize: 13.5,
                        flex: 1,
                      }}
                      numberOfLines={1}
                    >
                      {a.title}
                    </Text>
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontSize: 10,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {new Date(a.createdAt).toLocaleTimeString()}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontSize: 12,
                      lineHeight: 17,
                    }}
                  >
                    {a.message}
                  </Text>
                  {a.edgeScore != null ? (
                    <View
                      style={[
                        styles.edgeChip,
                        { borderColor: colors.cardBorder, backgroundColor: colors.background },
                      ]}
                    >
                      <Text
                        style={{
                          color: colors.foreground,
                          fontFamily: "Inter_700Bold",
                          fontSize: 9.5,
                          fontVariant: ["tabular-nums"],
                        }}
                      >
                        EDGE {a.edgeScore.toFixed(1)}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {!a.isRead && (
                  <Pressable
                    onPress={() => markRead.mutate({ id: a.id })}
                    hitSlop={10}
                    disabled={markRead.isPending}
                    style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 6 })}
                  >
                    <Feather name="check-circle" size={20} color={colors.mutedForeground} />
                  </Pressable>
                )}
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
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 10,
  },
  edgeChip: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderRadius: 4,
  },
});
