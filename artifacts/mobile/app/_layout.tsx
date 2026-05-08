import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppState, type AppStateStatus, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";

import { ConfigErrorScreen } from "@/components/ConfigErrorScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoungeFab } from "@/components/Lounge";
import { BetSlipProvider } from "@/contexts/BetSlipContext";
import { ToastProvider } from "@/contexts/ToastContext";
import colors from "@/constants/colors";
import { API_BASE_URL } from "@/lib/apiBase";

// Wire the API client before any hook fires.
if (API_BASE_URL) {
  setBaseUrl(API_BASE_URL);
  setAuthTokenGetter(async () => null);
}

SplashScreen.preventAutoHideAsync().catch(() => {});

// ── QueryClient ──────────────────────────────────────────────────────────────
// Tuned for a live-data sports app:
// - staleTime 20s: data is considered fresh for 20s after fetch
// - gcTime 5min: keep cached data in memory for 5 minutes
// - retry 2: retry failed requests twice before showing error
// - refetchOnReconnect: always refresh when coming back online
// - refetchOnWindowFocus: handled via AppState listener below (more reliable on mobile)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      staleTime: 20_000,          // 20s fresh window
      gcTime: 5 * 60 * 1000,     // 5min in-memory cache
      refetchOnWindowFocus: false, // handled by AppState below
      refetchOnReconnect: true,
    },
  },
});

// ── AppState-driven refetch ──────────────────────────────────────────────────
// When the user backgrounds the app and comes back, refetch all active queries.
// This is the mobile equivalent of browser "window focus" refetching.
function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === "active");
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // AppState listener — refetch when app foregrounded
  useEffect(() => {
    const sub = AppState.addEventListener("change", onAppStateChange);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  if (!API_BASE_URL) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <StatusBar style="light" />
          <ConfigErrorScreen />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <KeyboardProvider>
            <QueryClientProvider client={queryClient}>
              <BetSlipProvider>
                <ToastProvider>
                  <View
                    style={[
                      styles.root,
                      { backgroundColor: colors.dark.background },
                    ]}
                  >
                    <StatusBar style="light" />
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        contentStyle: {
                          backgroundColor: colors.dark.background,
                        },
                        animation: "slide_from_right",
                      }}
                    >
                      <Stack.Screen name="(tabs)" />
                      <Stack.Screen name="live-edge" />
                      <Stack.Screen name="alerts" />
                      <Stack.Screen name="track-record" />
                      <Stack.Screen name="results" />
                      <Stack.Screen name="sources" />
                    </Stack>
                    <LoungeFab />
                  </View>
                </ToastProvider>
              </BetSlipProvider>
            </QueryClientProvider>
          </KeyboardProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
