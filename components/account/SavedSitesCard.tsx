// components/account/SavedSitesCard.tsx
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";

import { AppButton, AppText } from "@/lib/uiKit";
import { useSavedSites } from "@/lib/hooks/useSavedSites";
import { hooksBag } from "@/lib/hooksBag";
import { tokens } from "@/lib/ui/tokens";

function SavedSiteRow({ siteId }: { siteId: string }) {
  const { location } = hooksBag.useLocation(siteId);
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/(app)/(tabs)/sites/${siteId}`)}
      activeOpacity={0.6}
    >
      <Text style={styles.rowTitle} numberOfLines={1}>
        {location?.name ?? "Unavailable"}
      </Text>
      <ChevronRight size={14} color={tokens.colors.textMuted} strokeWidth={2} />
    </TouchableOpacity>
  );
}

export function SavedSitesCard() {
  const { savedSiteIds } = useSavedSites();
  const recentSavedSites = Array.from(savedSiteIds).slice(-3).reverse();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>SAVED PLACES</Text>
        {savedSiteIds.size > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{savedSiteIds.size}</Text>
          </View>
        )}
      </View>

      {recentSavedSites.length === 0 ? (
        <Text style={styles.emptyText}>No saved places yet.</Text>
      ) : (
        <View style={styles.list}>
          {recentSavedSites.map((siteId) => (
            <SavedSiteRow key={siteId} siteId={siteId} />
          ))}
        </View>
      )}

      {savedSiteIds.size > 0 && (
        <AppButton variant="ghost" onPress={() => router.push("/(app)/saved-sites")}>
          <AppText variant="label" style={{ color: tokens.colors.surf }}>
            {savedSiteIds.size > recentSavedSites.length ? "View All Saved Places" : "Manage Saved Places"}
          </AppText>
        </AppButton>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: tokens.space.md, paddingVertical: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 3,
    textTransform: "uppercase",
    color: tokens.colors.text2,
  },
  countBadge: {
    backgroundColor: tokens.colors.surf,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: { fontSize: 10, fontWeight: "700", color: "#FFFFFF" },
  emptyText: { fontSize: 14, fontWeight: "400", color: tokens.colors.textMuted, marginBottom: 16 },
  list: { marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.border,
  },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: "600", color: tokens.colors.text, letterSpacing: -0.1, marginRight: 8 },
});