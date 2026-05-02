import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface ToastInput {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

interface ToastContextValue {
  show: (t: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastInput | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (t: ToastInput) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setToast(t);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 7 }),
      ]).start();
      hideTimer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
        ]).start(() => setToast(null));
      }, 2400);
    },
    [opacity, translateY],
  );

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  const value = useMemo(() => ({ show }), [show]);

  const isDestructive = toast?.variant === "destructive";

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.host,
            { top: insets.top + 8, opacity, transform: [{ translateY }] },
          ]}
        >
          <Pressable
            onPress={() => {
              Animated.timing(opacity, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
              }).start(() => setToast(null));
            }}
            style={[
              styles.toast,
              {
                backgroundColor: colors.card,
                borderColor: isDestructive ? colors.destructive : colors.cardBorder,
                borderRadius: colors.radius,
              },
            ]}
          >
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: isDestructive ? colors.destructive : colors.primary,
                },
              ]}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
                {toast.title}
              </Text>
              {toast.description ? (
                <Text
                  style={[styles.desc, { color: colors.mutedForeground }]}
                  numberOfLines={2}
                >
                  {toast.description}
                </Text>
              ) : null}
            </View>
          </Pressable>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  title: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  desc: { fontFamily: "Inter_400Regular", fontSize: 11.5, marginTop: 2 },
});
