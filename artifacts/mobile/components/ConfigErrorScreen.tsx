import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import colors from "@/constants/colors";

export function ConfigErrorScreen() {
  const c = colors.dark;
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]}>
      <View style={styles.inner}>
        <View style={[styles.icon, { backgroundColor: "rgba(220,38,38,0.15)", borderColor: "rgba(220,38,38,0.4)" }]}>
          <Feather name="alert-triangle" size={28} color={c.destructive} />
        </View>
        <Text style={[styles.title, { color: c.foreground }]}>Configuration Error</Text>
        <Text style={[styles.body, { color: c.mutedForeground }]}>
          Live Edge Engine couldn't reach its data service. The app was built without a valid
          API host (EXPO_PUBLIC_DOMAIN). Please reinstall the latest build from the App Store.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
