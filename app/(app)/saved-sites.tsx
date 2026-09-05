import { useMemo, useRef } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Swipeable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, Bookmark, Trash2 } from "lucide-react-native";

import { AppText, LoadingState, ErrorCard, AppIconButton } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { hooksBag, useAllLocations } from "@/lib/hooksBag";
import { useSavedSites } from "@/lib/hooks/useSavedSites";
import { SiteListItem } from "@/components/site/list/SiteListItem";
import type { SortedRow } from "@blacksands/hooks";
import type { Site } from "@/lib/models";

type SiteRow = SortedRow<Site>;

function SwipeableRow({ item, index, onUnsave }: { item: SiteRow; index: number; onUnsave: () => void }) {
  const swipeRef = useRef<Swipeable>(null);

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={() => (
        <TouchableOpacity
          style={styles.deleteAction}
          onPress={() => {
            swipeRef.current?.close();
            onUnsave();
          }}
          activeOpacity={0.85}
        >
          <Trash2 color="#FFFFFF" size={22} />
          <AppText style={styles.deleteActionText}>Remove</AppText>
        </TouchableOpacity>
      )}
      rightThreshold={60}
      overshootRight={false}
    >
      <SiteListItem
        id={item.location.id}
        name={item.location.name}
        description={item.location.description}
        distanceMeters={item.distanceMeters}
        imageUrl={item.location.imageThumbnailUrl ?? item.location.imageUrl}
        onPress={(id) => router.push(`/(app)/(tabs)/sites/${id}`)}
        index={index}
      />
    </Swipeable>
  );
}

export default function SavedSitesPage() {
  const { savedSiteIds, toggleSavedSite } = useSavedSites();
  const { locations, loading, err } = useAllLocations();
  const { loc } = hooksBag.useUserLocation();

  const savedLocations = useMemo(
    () => locations.filter((l) => savedSiteIds.has(l.id)),
    [locations, savedSiteIds],
  );
  const rows = hooksBag.useSortedRows(savedLocations, loc);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingState label="Loading saved places..." />
      </SafeAreaView>
    );
  }

  if (err) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ErrorCard title="Connection Issue" message={err} />
      </SafeAreaView>
    );
  }

  const header = (
    <View style={styles.header}>
      <AppIconButton icon={ChevronLeft} onPress={() => router.back()} accessibilityLabel="Back" />
      <View style={styles.titleRow}>
        <AppText variant="h1" style={styles.title}>
          Saved Places
        </AppText>
        {rows.length > 0 && (
          <View style={styles.countBadge}>
            <AppText style={styles.countText}>{rows.length}</AppText>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlashList
        data={rows}
        keyExtractor={(item) => item.location.id}
        renderItem={({ item, index }: { item: SiteRow; index: number }) => (
          <View style={styles.itemWrap}>
            <SwipeableRow
              item={item}
              index={index}
              onUnsave={() => toggleSavedSite({ siteId: item.location.id, isSaving: false })}
            />
          </View>
        )}
        ListHeaderComponent={header}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Bookmark color={tokens.colors.borderStrong} size={48} />
            <AppText variant="h3" style={styles.centerText}>
              No saved places yet
            </AppText>
            <AppText variant="body" status="hint" style={styles.centerText}>
              Tap the bookmark icon on any place to save it here.
            </AppText>
          </View>
        }
      />
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
  titleRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 28 },
  countBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: tokens.colors.surfDim,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  countText: { color: tokens.colors.surf, fontSize: 12, fontWeight: "700" },
  listContent: { paddingHorizontal: tokens.space.md, paddingBottom: 32 },
  itemWrap: { marginBottom: tokens.space.md },
  deleteAction: {
    backgroundColor: tokens.colors.danger,
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderRadius: tokens.radius.lg,
    marginLeft: 8,
    gap: 4,
  },
  deleteActionText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: tokens.space.md,
    gap: 12,
  },
  centerText: { textAlign: "center" },
});