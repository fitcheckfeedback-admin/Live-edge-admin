import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
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

// Wire the generated API client BEFORE any hook fires.
// Native fetch can't resolve relative paths, so we MUST have an absolute URL.
if (API_BASE_URL) {
  setBaseUrl(API_BASE_URL);
  setAuthTokenGetter(async () => null);
}

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

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
                  <View style={[styles.root, { backgroundColor: colors.dark.background }]}>
                    <StatusBar style="light" />
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: colors.dark.background },
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
