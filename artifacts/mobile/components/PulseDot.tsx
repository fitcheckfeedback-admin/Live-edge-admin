import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export function PulseDot({ color }: { color?: string }) {
  const colors = useColors();
  const dotColor = color ?? colors.primary;
  const opacity = useRef(new Animated.Value(0.6)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.15, duration: 900, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.4, duration: 900, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.6, duration: 900, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.85, duration: 900, useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, scale]);

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          styles.ring,
          { backgroundColor: dotColor, opacity, transform: [{ scale }] },
        ]}
      />
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 10, height: 10, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: 10, height: 10, borderRadius: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
