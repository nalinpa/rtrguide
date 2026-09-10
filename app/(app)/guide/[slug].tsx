import { useRef } from "react";
import { View, Pressable, StyleSheet, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

import { AppText, ErrorCard } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { GUIDE_CATEGORIES } from "@/lib/guideContent";

export default function GuideCategoryPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const category = GUIDE_CATEGORIES.find((c) => c.slug === slug);

  if (!category) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.notFound}>
          <ErrorCard
            title="Guide Not Found"
            message="This guide page doesn't exist anymore."
            action={{ label: "Go Back", onPress: () => router.back() }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const Icon = category.icon;
  const scrollY = useRef(new Animated.Value(0)).current;
  const heroContentOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const heroContentHeight = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [48, 0],
    extrapolate: "clamp",
  });
  const heroContentMarginBottom = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [tokens.space.sm, 0],
    extrapolate: "clamp",
  });
  const heroPaddingBottom = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [tokens.space.lg, tokens.space.sm],
    extrapolate: "clamp",
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <Animated.View
        style={[
          styles.hero,
          { backgroundColor: category.color, paddingBottom: heroPaddingBottom },
        ]}
      >
        <Animated.View
          style={[
            styles.heroContent,
            { opacity: heroContentOpacity, height: heroContentHeight, marginBottom: heroContentMarginBottom },
          ]}
        >
          {Icon && (
            <View style={styles.heroIconWrap}>
              <Icon size={28} color="#FFFFFF" strokeWidth={2} />
            </View>
          )}
          <AppText variant="h1" style={styles.title} numberOfLines={2}>
            {category.title}
          </AppText>
        </Animated.View>

        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.backBtn}
          hitSlop={6}
        >
          <ChevronLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
      >
        {category.body.split("\n\n").map((paragraph, index) => {
          // A standalone line with no sentence-ending punctuation (unlike every
          // real paragraph here) is a subheading, e.g. "Renting a car", "Parking".
          const isHeading = !/[.!?]$/.test(paragraph.trim());
          return (
            <AppText
              key={index}
              variant={isHeading ? "sectionTitle" : "body"}
              style={isHeading ? styles.subheading : styles.paragraph}
            >
              {paragraph}
            </AppText>
          );
        })}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.colors.bgBase },
  notFound: { flex: 1, justifyContent: "center", padding: tokens.space.md },
  hero: {
    paddingHorizontal: tokens.space.md,
    paddingTop: tokens.space.md,
    paddingBottom: tokens.space.lg,
  },
  heroContent: { flexDirection: "row", alignItems: "center", gap: tokens.space.sm, overflow: "hidden" },
  backBtn: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: tokens.radius.md,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.md,
    backgroundColor: "rgba(255,255,255,0.16)",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  title: { flex: 1, fontSize: 26, color: "#FFFFFF" },
  content: { paddingHorizontal: tokens.space.md, paddingTop: 24, paddingBottom: 40, gap: 16 },
  paragraph: { fontSize: 15, lineHeight: 23, color: tokens.colors.text },
  subheading: { marginTop: 4 },
});
