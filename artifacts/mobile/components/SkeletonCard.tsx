import { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";

import { useColors } from "@/hooks/useColors";

export function SkeletonCard({ height = 120 }: { height?: number }) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.box,
        {
          height,
          backgroundColor: colors.muted,
          borderColor: colors.cardBorder,
          borderRadius: colors.radius,
          opacity,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1 },
});
