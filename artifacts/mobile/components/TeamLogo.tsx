import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  logoUrl?: string | null;
  abbreviation: string;
  color?: string | null;
  size?: number;
}

export function TeamLogo({ logoUrl, abbreviation, color, size = 32 }: Props) {
  const colors = useColors();
  const [errored, setErrored] = useState(false);
  const fallbackBg = color || colors.surfaceElev;

  if (logoUrl && !errored) {
    return (
      <Image
        source={{ uri: logoUrl }}
        style={{ width: size, height: size }}
        resizeMode="contain"
        onError={() => setErrored(true)}
      />
    );
  }
  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          backgroundColor: fallbackBg,
          borderRadius: 6,
        },
      ]}
    >
      <Text
        style={{
          color: "#fff",
          fontFamily: "Inter_700Bold",
          fontSize: Math.max(8, size * 0.32),
        }}
      >
        {abbreviation.slice(0, 3)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: "center", justifyContent: "center" },
});
