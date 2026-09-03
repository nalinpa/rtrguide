import { View, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

import { AppText, AppIconButton } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { GUIDE_CATEGORIES } from "@/lib/guideContent";

export default function GuideIndexPage() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <AppIconButton icon={ChevronLeft} onPress={() => router.back()} accessibilityLabel="Back" />
        <AppText variant="h1" style={styles.title}>
          Guide
        </AppText>
      </View>

      <View style={styles.list}>
        {GUIDE_CATEGORIES.map((category) => {
          const Icon = category.icon;
          return (
            <TouchableOpacity
              key={category.slug}
              style={styles.row}
              onPress={() => router.push(`/(app)/guide/${category.slug}`)}
              activeOpacity={0.6}
            >
              <View style={[styles.iconWrap, { backgroundColor: `${category.color}1F` }]}>
                <Icon size={20} color={category.color} strokeWidth={2} />
              </View>
              <AppText style={styles.rowTitle}>{category.title}</AppText>
              <ChevronRight size={16} color={tokens.colors.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.colors.bgBase },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
    paddingTop: tokens.space.md,
    paddingBottom: tokens.space.md,
  },
  title: { fontSize: 28 },
  list: { paddingHorizontal: tokens.space.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.border,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.md,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: "600", color: tokens.colors.text, letterSpacing: -0.1 },
});
