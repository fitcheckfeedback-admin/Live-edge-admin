import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { initials } from "@/lib/format";

interface Props {
  src?: string | null;
  name: string;
  size?: number;
}

export function PlayerAvatar({ src, name, size = 56 }: Props) {
  const colors = useColors();
  const [errored, setErrored] = useState(false);
  const showImage = src && !errored;

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: 14,
          backgroundColor: colors.surfaceElev,
          borderColor: colors.divider,
        },
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: src }}
          style={{ width: size, height: size, borderRadius: 14 }}
          resizeMode="cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <Text style={[styles.initials, { color: colors.foreground, fontSize: size * 0.32 }]}>
          {initials(name)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
  },
  initials: {
    fontFamily: "Inter_700Bold",
  },
});
