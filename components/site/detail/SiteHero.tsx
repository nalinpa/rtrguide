// components/site/detail/SiteHero.tsx
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ImageOff } from "lucide-react-native";

import { tokens } from "@/lib/ui/tokens";

export const SITE_HERO_HEIGHT = 320;

type SiteHeroProps = {
  imageUrl?: string | null;
  imageThumbnailUrl?: string | null;
};

export function SiteHero({ imageUrl, imageThumbnailUrl }: SiteHeroProps) {
  const uri = imageUrl ?? imageThumbnailUrl;
  return (
    <View style={styles.container}>
      {uri ? (
        <Image source={{ uri }} style={styles.image} />
      ) : (
        <View style={styles.placeholder}>
          <ImageOff size={40} color="rgba(255,255,255,0.7)" />
        </View>
      )}
      <LinearGradient colors={["transparent", "rgba(36,26,18,0.55)"]} style={StyleSheet.absoluteFill} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: SITE_HERO_HEIGHT,
    width: "100%",
    backgroundColor: tokens.colors.accent,
  },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  placeholder: { flex: 1, justifyContent: "center", alignItems: "center" },
});