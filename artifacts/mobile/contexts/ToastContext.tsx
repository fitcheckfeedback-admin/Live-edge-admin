import { Feather } from "@expo/vector-icons";
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

type ToastVariant = "default" | "success" | "error" | "warning";

interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  show: (t: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function variantStyle(
  variant: ToastVariant,
  colors: ReturnType<typeof useColors>,
): { icon: keyof typeof Feather.glyphMap; color: string; bg: string; border: string } {
  switch (variant) {
    case "success":
      return {
        icon: "check-circle",
        color: colors.over,
        bg: colors.overSoft,
        border: colors.overBorder,
      };
    case "error":
      return {
        icon: "alert-circle",
        color: colors.under,
        bg: colors.underSoft,
        border: colors.underBorder,
      };
    case "warning":
      return {
        icon: "alert-triangle",
        color: colors.accent,
        bg: colors.accentGlow,
        border: `${colors.accent}50`,
      };
    default:
      return {
        icon: "zap",
        color: colors.primary,
        bg: colors.primaryGlow,
        border: colors.cardBorderActive,
      };
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastInput | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;
  const scale = useRef(new Animated.Value(0.95)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -16, duration: 180, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.95, duration: 180, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [opacity, translateY, scale]);

  const show = useCallback(
    (t: ToastInput) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setToast(t);
      // Animate in
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 100,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 8,
          tension: 100,
        }),
      ]).start();
      // Auto-dismiss
      hideTimer.current = setTimeout(dismiss, t.duration ?? 2600);
    },
    [opacity, translateY, scale, dismiss],
  );

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  const value = useMemo(() => ({ show }), [show]);
  const variant = toast?.variant ?? "default";
  const vs = variantStyle(variant, colors);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.host,
            {
              top: insets.top + 10,
              opacity,
              transform: [{ translateY }, { scale }],
            },
          ]}
        >
          <Pressable
            onPress={dismiss}
            style={[
              styles.toast,
              {
                backgroundColor: colors.card,
                borderColor: vs.border,
                borderLeftColor: vs.color,
              },
            ]}
          >
            {/* Icon */}
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: vs.bg, borderColor: vs.border },
              ]}
            >
              <Feather name={vs.icon} size={14} color={vs.color} />
            </View>

            {/* Text */}
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.title, { color: colors.foreground }]}
                numberOfLines={1}
              >
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

            {/* Dismiss X */}
            <Feather name="x" size={14} color={colors.mutedForeground} />
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
    zIndex: 9999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    paddingLeft: 10,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: -0.1,
  },
  desc: {
    fontFamily: "Inter_400Regular",
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 16,
  },
});
