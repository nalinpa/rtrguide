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
      {/* Sits behind the image so it shows whenever the image is empty: no URL,
          still loading, or failed offline. */}
      <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
        <ImageOff size={40} color="rgba(255,255,255,0.7)" />
      </View>
      {/* The detail route is a tab screen, so this stays mounted across sites.
          Without recyclingKey expo-image keeps the previous site's picture
          when the new one can't load (offline). */}
      {uri && <Image source={{ uri }} recyclingKey={uri} style={styles.image} contentFit="cover" />}
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
  image: { width: "100%", height: "100%" },
  placeholder: { flex: 1, justifyContent: "center", alignItems: "center" },
});