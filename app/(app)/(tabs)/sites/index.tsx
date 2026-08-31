import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Pressable,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Search, X, Bookmark, Image as ImageIcon } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Screen, LoadingState, ErrorCard, CardShell, Stack, Row, AppText, AppIconButton } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { hooksBag } from "@/lib/hooksBag";
import { useEntitlementGate } from "@/lib/hooks/useEntitlementGate";
import { useSession } from "@/lib/providers/SessionProvider";
import { SITE_CATEGORIES, type SiteCategory, type Site } from "@/lib/models";
import { FULL_GUIDE_PRODUCT_ID } from "@/lib/constants/commerce";
import { SitesListView } from "@/components/site/list/SitesListView";

export default function SiteListPage() {
  const { session } = useSession();
  const uid = session.status === "authed" ? session.uid : null;
  const isGuest = session.status === "guest";
  const { entitledProductIds, loading: entitlementsLoading } = useEntitlementGate(uid);
  const isSiteLocked = useCallback(
    (site: Site) => !!site.isPremium && !entitledProductIds.has(FULL_GUIDE_PRODUCT_ID),
    [entitledProductIds],
  );

  const { locations, loading: entitiesLoading, err: entitiesErr } = hooksBag.useLocations();

  const { loc: liveLoc, status: locStatus } = hooksBag.useUserLocation({ autoRequest: true });
  const [lockedLoc, setLockedLoc] = useState(() => hooksBag.useLocationStore.getState().location);
  useEffect(() => {
    if (!lockedLoc && liveLoc) setLockedLoc(liveLoc);
  }, [liveLoc, lockedLoc]);

  const handleRefreshGPS = () => Linking.openSettings();

  const [category, setCategory] = useState<SiteCategory | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const activeLocations = useMemo(() => locations.filter((l) => l.active !== false), [locations]);

  const filteredLocations = useMemo(() => {
    let list = activeLocations;
    if (category) list = list.filter((l) => l.category.includes(category));
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((l) => l.name.toLowerCase().includes(q));
      list = list.filter((l) => !isSiteLocked(l));
    }
    return list;
  }, [activeLocations, category, searchQuery, isSiteLocked]);

  const rows = hooksBag.useSortedRows(filteredLocations, lockedLoc);

  const featuredSite = useMemo(() => {
    if (!rows.length) return null;
    const eligible = rows.filter((r) => !isSiteLocked(r.location));
    if (!eligible.length) return null;
    const withFeatured = eligible.filter((r) => (r.location.featured ?? 0) > 0);
    if (!withFeatured.length) return eligible[0];
    return withFeatured.reduce((best, r) =>
      (r.location.featured ?? 0) > (best.location.featured ?? 0) ? r : best,
    );
  }, [rows, isSiteLocked]);

  const listRows = useMemo(
    () => (featuredSite ? rows.filter((r) => r.location.id !== featuredSite.location.id) : rows),
    [rows, featuredSite],
  );

  if (entitiesLoading || session.status === "loading" || entitlementsLoading) {
    return (
      <Screen>
        <LoadingState label="Finding Locations..." />
      </Screen>
    );
  }

  if (entitiesErr) {
    return (
      <Screen>
        <ErrorCard title="Connection Issue" message={entitiesErr} />
      </Screen>
    );
  }

  const header = (
    <Stack gap="md" style={styles.headerStack}>
      <View style={styles.paddedSection}>
        <Row justify="space-between" align="flex-end">
          <View>
            <AppText variant="label" status="hint" style={styles.eyebrow}>
              Explore
            </AppText>
            <AppText variant="h1" style={styles.cityTitle}>
              Rotorua
            </AppText>
          </View>
          <Row gap="sm">
            <AppIconButton
              icon={searchOpen ? X : Search}
              onPress={() => {
                setSearchOpen((open) => !open);
                if (searchOpen) setSearchQuery("");
              }}
              accessibilityLabel="Search locations"
            />
            <AppIconButton
              icon={Bookmark}
              onPress={() => router.push("/(app)/saved-sites")}
              accessibilityLabel="Saved sites"
            />
          </Row>
        </Row>
      </View>

      {searchOpen && (
        <View style={styles.paddedSection}>
          <View style={styles.searchInputWrap}>
            <Search size={16} color={tokens.colors.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search locations"
              placeholderTextColor={tokens.colors.textMuted}
              style={styles.searchInput}
              autoFocus
            />
          </View>
        </View>
      )}

      {locStatus === "denied" && (
        <View style={styles.paddedSection}>
          <ErrorCard
            status="warning"
            title="Location Disabled"
            message="Enable location to see distances to nearby sites."
            action={{ label: "Open Settings", onPress: handleRefreshGPS }}
          />
        </View>
      )}

      {isGuest ? (
        <View style={styles.paddedSection}>
          <CardShell status="surf" onPress={() => router.push("/(auth)/login")}>
            <Stack gap="xs">
              <AppText variant="sectionTitle">Sign In for More</AppText>
              <AppText variant="label" status="hint">
                Sign in to save sites, plan itineraries, and leave reviews.
              </AppText>
            </Stack>
          </CardShell>
        </View>
      ) : null}

      <View style={styles.paddedSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryTabContent}
        >
          <TouchableOpacity style={styles.categoryTab} onPress={() => setCategory(null)}>
            <AppText style={[styles.categoryTabText, !category && styles.categoryTabTextActive]}>
              All
            </AppText>
            {!category && <View style={styles.categoryTabIndicator} />}
          </TouchableOpacity>
          {SITE_CATEGORIES.map((cat) => (
            <TouchableOpacity key={cat} style={styles.categoryTab} onPress={() => setCategory(cat)}>
              <AppText style={[styles.categoryTabText, category === cat && styles.categoryTabTextActive]}>
                {cat}
              </AppText>
              {category === cat && <View style={styles.categoryTabIndicator} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {activeLocations.length > 0 && rows.length === 0 && (
        <View style={styles.paddedSection}>
          <AppText variant="body" status="hint" style={styles.centerText}>
            No locations match your current filters.
          </AppText>
        </View>
      )}

      {rows.length > 0 && (
        <>
          {featuredSite && (
            <Pressable
              style={styles.featuredCard}
              onPress={() => router.push(`/(app)/(tabs)/sites/${featuredSite.location.id}`)}
            >
              {featuredSite.location.imageUrl ? (
                <Image source={{ uri: featuredSite.location.imageUrl }} style={styles.featuredImage} />
              ) : (
                <View style={styles.featuredPlaceholder}>
                  <ImageIcon size={40} color="#FFFFFF" />
                </View>
              )}
              <LinearGradient
                colors={["transparent", "rgba(36,26,18,0.85)"]}
                style={styles.featuredOverlay}
              >
                <AppText style={styles.featuredBadge}>Featured</AppText>
                <AppText style={styles.featuredTitle}>{featuredSite.location.name}</AppText>
                <AppText style={styles.featuredSubtitle} numberOfLines={2}>
                  {featuredSite.location.description || "Discover this Rotorua location."}
                </AppText>
              </LinearGradient>
            </Pressable>
          )}

          <View style={styles.paddedSection}>
            <AppText variant="label" status="hint" style={styles.sectionLabel}>
              {category ?? "Places to Visit"}
            </AppText>
          </View>
        </>
      )}
    </Stack>
  );

  return (
    <Screen padded={false}>
      <SitesListView
        rows={listRows}
        header={header}
        onPressSite={(id) => router.push(`/(app)/(tabs)/sites/${id}`)}
        isLocked={isSiteLocked}
        ListEmptyComponent={
          activeLocations.length === 0 ? (
            <View style={styles.paddedSection}>
              <CardShell style={styles.emptyCard}>
                <Stack gap="sm" align="center">
                  <AppText variant="h3">No Locations Found</AppText>
                  <AppText variant="body" status="hint" style={styles.centerText}>
                    Check back soon.
                  </AppText>
                </Stack>
              </CardShell>
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerStack: { paddingTop: 12, paddingBottom: 8, width: "100%" },
  paddedSection: { paddingHorizontal: 16 },
  eyebrow: { letterSpacing: 2, marginBottom: 2 },
  cityTitle: { fontSize: 32 },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: tokens.colors.bgElevated,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.sm,
    height: 44,
  },
  searchInput: { flex: 1, color: tokens.colors.text, fontSize: 15 },
  categoryTabContent: { gap: 20, paddingRight: 16 },
  categoryTab: { paddingVertical: 8, alignItems: "center" },
  categoryTabText: { fontSize: 14, fontWeight: "600", color: tokens.colors.text2 },
  categoryTabTextActive: { color: tokens.colors.surf, fontWeight: "700" },
  categoryTabIndicator: {
    marginTop: 6,
    height: 2,
    width: "100%",
    backgroundColor: tokens.colors.surf,
    borderRadius: 1,
  },
  featuredCard: {
    marginHorizontal: 16,
    height: 220,
    borderRadius: tokens.radius.lg,
    overflow: "hidden",
    marginBottom: tokens.space.md,
    backgroundColor: tokens.colors.accent,
  },
  featuredImage: { width: "100%", height: "100%", resizeMode: "cover" },
  featuredPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  featuredOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: tokens.space.md,
    justifyContent: "flex-end",
  },
  featuredBadge: {
    alignSelf: "flex-start",
    backgroundColor: tokens.colors.surf,
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
    overflow: "hidden",
  },
  featuredTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "800", marginBottom: 4 },
  featuredSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 13 },
  sectionLabel: { letterSpacing: 1.5 },
  emptyCard: { marginTop: 20, paddingVertical: 40 },
  centerText: { textAlign: "center" },
});