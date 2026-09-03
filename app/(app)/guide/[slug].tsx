import { View, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

import { AppText, AppIconButton } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { GUIDE_CATEGORIES } from "@/lib/guideContent";

export default function GuideCategoryPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const category = GUIDE_CATEGORIES.find((c) => c.slug === slug);
  const Icon = category?.icon;
  const color = category?.color ?? tokens.colors.accent;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={[styles.hero, { backgroundColor: color }]}>
        <AppIconButton
          icon={ChevronLeft}
          onPress={() => router.back()}
          accessibilityLabel="Back"
          variant="control"
          style={styles.backBtn}
        />
        {Icon && (
          <View style={styles.heroIconWrap}>
            <Icon size={28} color="#FFFFFF" strokeWidth={2} />
          </View>
        )}
        <AppText variant="h1" style={styles.title} numberOfLines={2}>
          {category?.title ?? "Guide"}
        </AppText>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {category?.body.split("\n\n").map((paragraph, index) => (
          <AppText key={index} variant="body" style={styles.paragraph}>
            {paragraph}
          </AppText>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.colors.bgBase },
  hero: {
    paddingHorizontal: tokens.space.md,
    paddingTop: tokens.space.sm,
    paddingBottom: tokens.space.lg,
    gap: tokens.space.sm,
  },
  backBtn: { backgroundColor: "rgba(255,255,255,0.16)" },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.md,
    backgroundColor: "rgba(255,255,255,0.16)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: tokens.space.xs,
  },
  title: { fontSize: 26, color: "#FFFFFF" },
  content: { paddingHorizontal: tokens.space.md, paddingTop: 24, paddingBottom: 40, gap: 16 },
  paragraph: { fontSize: 15, lineHeight: 23, color: tokens.colors.text },
});
