// components/site/list/SiteListItem.tsx
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { Image as ImageIcon, Lock } from "lucide-react-native";
import { MotiView } from "moti";
import { formatDistanceMeters } from "@blacksands/hooks";

import { AppText, Pill, Row, Stack } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";

type SiteListItemProps = {
  id: string;
  name: string;
  description?: string;
  distanceMeters?: number | null;
  imageUrl?: string | null;
  locked?: boolean;
  onPress: (id: string) => void;
  index: number;
};

export function SiteListItem({
  id,
  name,
  description,
  distanceMeters,
  imageUrl,
  locked,
  onPress,
  index,
}: SiteListItemProps) {
  if (locked) {
    return (
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 250, delay: Math.min(index * 50, 300) }}
      >
        <TouchableOpacity activeOpacity={0.7} onPress={() => onPress(id)} style={[styles.card, styles.lockedCard]}>
          <Lock size={22} color={tokens.colors.borderStrong} />
          <AppText variant="label" status="hint" style={styles.lockedLabel}>
            Premium
          </AppText>
        </TouchableOpacity>
      </MotiView>
    );
  }

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 250, delay: Math.min(index * 50, 300) }}
    >
      <TouchableOpacity activeOpacity={0.7} onPress={() => onPress(id)} style={styles.card}>
        <View style={styles.main}>
          <Stack gap="xs">
            <AppText variant="h3" numberOfLines={2}>
              {name}
            </AppText>
            {description ? (
              <AppText variant="body" status="hint" numberOfLines={2}>
                {description}
              </AppText>
            ) : null}
          </Stack>
          {distanceMeters != null && (
            <Row style={styles.footer}>
              <Pill status="basic">{formatDistanceMeters(distanceMeters)}</Pill>
            </Row>
          )}
        </View>

        <View style={styles.imageWrap}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <ImageIcon size={28} color={tokens.colors.borderStrong} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: tokens.colors.bgCard,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.md,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    shadowColor: "#241A12",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    overflow: "hidden",
  },
  lockedCard: {
    minHeight: 96,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  lockedLabel: { letterSpacing: 1, textTransform: "uppercase" },
  main: {
    flex: 1,
    marginRight: tokens.space.sm,
    justifyContent: "space-between",
  },
  footer: {
    marginTop: tokens.space.sm,
  },
  imageWrap: {
    width: 96,
    height: 96,
    borderRadius: tokens.radius.md,
    overflow: "hidden",
    backgroundColor: tokens.colors.bgElevated,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});