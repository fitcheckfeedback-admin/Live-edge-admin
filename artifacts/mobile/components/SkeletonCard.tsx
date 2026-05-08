import { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";

import { useColors } from "@/hooks/useColors";

export function SkeletonCard({ height = 120 }: { height?: number }) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 750,
          useNativeDriver: true,
        }),
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
          // Use backgroundSurface instead of muted — slightly lighter, more
          // visible against the new deeper background color
          backgroundColor: colors.backgroundSurface,
          borderColor: colors.cardBorder,
          borderRadius: 16,
          opacity,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1 },
});
