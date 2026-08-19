import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, Text, TextInput, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import * as Haptics from "expo-haptics";
import BottomSheet from "@gorhom/bottom-sheet";
import { Search, SlidersHorizontal, Crosshair, Layers, AlertCircle } from "lucide-react-native";
import type { MapType } from "react-native-maps";

import { LoadingState, ErrorCard, components } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { hooksBag } from "@/lib/hooksBag";
import { useEntitlementGate } from "@/lib/hooks/useEntitlementGate";
import { useItineraries } from "@/lib/hooks/useItineraries";
import { useSession } from "@/lib/providers/SessionProvider";
import { FULL_GUIDE_PRODUCT_ID } from "@/lib/constants/commerce";
import { PLANNER } from "@/lib/constants/gameplay";
import { SITE_CATEGORIES, type Site, type SiteCategory } from "@/lib/models";
import { distanceMeters } from "@/lib/utils/geoDistance";
import { SitesMapView, initialRegionFrom } from "@/components/map/SitesMapView";
import type { SitesMapViewHandle } from "@/components/map/SitesMapView";
import { MapOverlayCard } from "@/components/map/MapOverlay";
import type { NearbySite, ActiveItineraryItem } from "@/components/map/MapOverlay";
import { AddToTripModal } from "@/components/itinerary/AddToTripModal";
import { CreateItineraryModal } from "@/components/itinerary/CreateItineraryModal";

const ROTORUA_BOUNDS = { minLat: -38.3, maxLat: -37.95, minLng: 176.05, maxLng: 176.45 };

function isInRotorua(lat: number | null | undefined, lng: number | null | undefined): boolean {
  return (
    lat != null &&
    lng != null &&
    lat >= ROTORUA_BOUNDS.minLat &&
    lat <= ROTORUA_BOUNDS.maxLat &&
    lng >= ROTORUA_BOUNDS.minLng &&
    lng <= ROTORUA_BOUNDS.maxLng
  );
}

export default function MapScreen() {
  const { session } = useSession();
  const uid = session.status === "authed" ? session.uid : null;

  const { entitledProductIds, loading: entitlementsLoading } = useEntitlementGate(uid);
  const isSiteLocked = useCallback(
    (site: Site) => !!site.isPremium && !entitledProductIds.has(FULL_GUIDE_PRODUCT_ID),
    [entitledProductIds],
  );

  const { locations, loading, err } = hooksBag.useLocations();
  const { loc, err: locErr, status: locStatus } = hooksBag.useUserLocation({ autoRequest: true });
  const { selectedLocationId: selectedSiteId, setSelectedLocationId: setSelectedSiteId } = hooksBag.useMapStore();
  const { itineraries } = useItineraries();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<SiteCategory | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [mapType, setMapType] = useState<MapType>("standard");

  const mapViewRef = useRef<SitesMapViewHandle>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const [isAddingToTrip, setIsAddingToTrip] = useState(false);
  const [isCreatingItinerary, setIsCreatingItinerary] = useState(false);
  const [showTripChoice, setShowTripChoice] = useState(false);
  const [pendingItineraryId, setPendingItineraryId] = useState<string | null>(null);

  const visibleSites = useMemo(
    () => locations.filter((l) => l.active !== false && !isSiteLocked(l)),
    [locations, isSiteLocked],
  );

  const handleAddToItinerary = useCallback(() => {
    if (!entitledProductIds.has(FULL_GUIDE_PRODUCT_ID)) {
      Alert.alert("Premium Feature", "Building itineraries requires the full guide unlock.");
      return;
    }
    if (itineraries.length === 0) {
      setIsCreatingItinerary(true);
    } else if (itineraries.length < PLANNER.MAX_ITINERARIES) {
      setShowTripChoice(true);
    } else {
      setIsAddingToTrip(true);
    }
  }, [itineraries.length, entitledProductIds]);

  const mapSites = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return visibleSites
      .filter((s) => (!q || s.name.toLowerCase().includes(q)) && (!categoryFilter || s.category === categoryFilter))
      .map((s) => ({
        id: s.id,
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        category: s.category,
      }));
  }, [visibleSites, searchQuery, categoryFilter]);

  useEffect(() => {
    if (searchQuery.trim() && mapSites.length === 1) {
      setSelectedSiteId(mapSites[0].id);
    }
  }, [searchQuery, mapSites, setSelectedSiteId]);

  const hasAutoSelected = useRef(false);
  useEffect(() => {
    if (hasAutoSelected.current || loading || !visibleSites.length || selectedSiteId) return;
    if (!loc && locStatus !== "denied" && !locErr) return;
    hasAutoSelected.current = true;

    const userLat = loc?.coords.latitude;
    const userLng = loc?.coords.longitude;
    const inRotorua = isInRotorua(userLat, userLng);

    if (inRotorua && userLat != null && userLng != null) {
      const nearest = [...visibleSites].sort(
        (a, b) =>
          distanceMeters({ lat: userLat, lng: userLng }, { lat: a.lat, lng: a.lng }) -
          distanceMeters({ lat: userLat, lng: userLng }, { lat: b.lat, lng: b.lng }),
      )[0];
      if (nearest) setSelectedSiteId(nearest.id);
    } else {
      const featured = [...visibleSites].sort((a, b) => (b.featured ?? 0) - (a.featured ?? 0))[0];
      if (featured) setSelectedSiteId(featured.id);
    }
  }, [loading, visibleSites, selectedSiteId, loc, locStatus, locErr, setSelectedSiteId]);

  const selectedSite = useMemo(
    () => visibleSites.find((s) => s.id === selectedSiteId) ?? null,
    [visibleSites, selectedSiteId],
  );

  const initialRegion = useMemo(() => {
    if (loading) return null;
    const userLat = loc?.coords.latitude ?? null;
    const userLng = loc?.coords.longitude ?? null;
    const inBounds = isInRotorua(userLat, userLng);
    return initialRegionFrom(inBounds ? userLat : null, inBounds ? userLng : null, mapSites);
  }, [loading, loc, mapSites]);

  const todayItems = useMemo<ActiveItineraryItem[] | null>(() => {
    if (!itineraries.length) return null;
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    let todayDay = null;
    for (const itin of itineraries) {
      const day = itin.days?.find((day) => day.date === today);
      if (day?.items?.length) {
        todayDay = day;
        break;
      }
    }
    if (!todayDay?.items?.length) return null;
    const result = todayDay.items
      .filter((item) => !!item.siteId && visibleSites.some((s) => s.id === item.siteId))
      .map((item) => {
        const siteData = visibleSites.find((s) => s.id === item.siteId)!;
        return {
          id: item.id,
          siteId: item.siteId,
          siteName: item.siteName,
          timeLabel: item.timeLabel,
          category: siteData.category,
          imageUrl: siteData.imageThumbnailUrl ?? null,
        };
      });
    return result.length > 0 ? result : null;
  }, [itineraries, visibleSites]);

  const hasSnappedForItinerary = useRef(false);
  useEffect(() => {
    if (hasSnappedForItinerary.current || !todayItems?.length) return;
    hasSnappedForItinerary.current = true;
    bottomSheetRef.current?.snapToIndex(2);
  }, [todayItems]);

  const nearbySites = useMemo<NearbySite[]>(() => {
    if (!selectedSite) return [];
    return [...visibleSites]
      .filter((s) => s.id !== selectedSite.id)
      .map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        distanceMeters: distanceMeters({ lat: selectedSite.lat, lng: selectedSite.lng }, { lat: s.lat, lng: s.lng }),
      }))
      .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0))
      .slice(0, 3);
  }, [visibleSites, selectedSite]);

  const overlayDistance = useMemo(() => {
    if (!selectedSite || !loc) return 0;
    return distanceMeters(
      { lat: loc.coords.latitude, lng: loc.coords.longitude },
      { lat: selectedSite.lat, lng: selectedSite.lng },
    );
  }, [selectedSite, loc]);

  const handleSitePress = useCallback(
    (id: string) => {
      Haptics.selectionAsync();
      setSelectedSiteId(id);
      setCategoryFilter(null);
      setSearchQuery("");
      bottomSheetRef.current?.snapToIndex(1);
    },
    [setSelectedSiteId],
  );

  if (loading || entitlementsLoading) {
    return (
      <View style={styles.container}>
        <LoadingState label="Loading map..." />
      </View>
    );
  }
  if (err) {
    return (
      <View style={styles.container}>
        <ErrorCard title="Map Error" message={err} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <SitesMapView
        ref={mapViewRef}
        sites={mapSites}
        initialRegion={initialRegion!}
        selectedSiteId={selectedSiteId}
        mapType={mapType}
        onPressSite={handleSitePress}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Search color="rgba(36,26,18,0.45)" size={18} strokeWidth={1.75} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Rotorua..."
              placeholderTextColor="rgba(36,26,18,0.38)"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                if (text) setCategoryFilter(null);
              }}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.divider} />
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync();
                setShowFilters((p) => !p);
              }}
              style={styles.filterBtn}
            >
              <SlidersHorizontal
                color={categoryFilter ? tokens.colors.accent : "rgba(36,26,18,0.45)"}
                size={18}
                strokeWidth={categoryFilter ? 2.25 : 1.75}
              />
            </TouchableOpacity>
          </View>
        </View>

        {showFilters && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {([{ label: "All", value: null }, ...SITE_CATEGORIES.map((c) => ({ label: c, value: c }))] as {
              label: string;
              value: SiteCategory | null;
            }[]).map((cat) => {
              const active = categoryFilter === cat.value;
              return (
                <TouchableOpacity
                  key={String(cat.value)}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCategoryFilter(cat.value);
                  }}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {locErr && (
          <View style={styles.errorPill}>
            <AlertCircle size={12} color="rgba(255,200,200,1)" strokeWidth={2} />
            <Text style={styles.errorText}>Location unavailable</Text>
          </View>
        )}
      </SafeAreaView>

      <View style={styles.mapControls}>
        <TouchableOpacity
          style={styles.controlBtn}
          onPress={() => {
            Haptics.impactAsync();
            if (loc) mapViewRef.current?.recenter(loc.coords.latitude, loc.coords.longitude);
          }}
        >
          <Crosshair color={tokens.colors.text} size={20} strokeWidth={1.75} />
        </TouchableOpacity>
        <View style={styles.controlDivider} />
        <TouchableOpacity
          style={styles.controlBtn}
          onPress={() => {
            Haptics.impactAsync();
            setMapType((t) => (t === "satellite" ? "standard" : "satellite"));
          }}
        >
          <Layers
            color={mapType === "satellite" ? tokens.colors.accent : tokens.colors.text}
            size={20}
            strokeWidth={1.75}
          />
        </TouchableOpacity>
      </View>

      <MapOverlayCard
        site={selectedSite}
        distanceMeters={overlayDistance}
        onOpen={() => selectedSite && router.push(`/(app)/(tabs)/sites/${selectedSite.id}`)}
        onSelectSite={handleSitePress}
        onAddToItinerary={session.status !== "guest" ? handleAddToItinerary : undefined}
        nearbySites={nearbySites}
        todayItems={todayItems}
        locStatus={locStatus}
        hasLoc={!!loc}
        locError={!!locErr}
        bottomSheetRef={bottomSheetRef}
      />

      <components.TripChoiceSheet
        visible={showTripChoice}
        onClose={() => setShowTripChoice(false)}
        onAddToExisting={() => {
          setShowTripChoice(false);
          setIsAddingToTrip(true);
        }}
        onCreateNew={() => {
          setShowTripChoice(false);
          setIsCreatingItinerary(true);
        }}
      />

      <CreateItineraryModal
        visible={isCreatingItinerary}
        onClose={() => setIsCreatingItinerary(false)}
        onCreated={(id) => {
          setIsCreatingItinerary(false);
          setPendingItineraryId(id);
          setIsAddingToTrip(true);
        }}
      />

      <AddToTripModal
        site={
          isAddingToTrip && selectedSite
            ? { id: selectedSite.id, name: selectedSite.name, imageUrl: selectedSite.imageThumbnailUrl ?? selectedSite.imageUrl ?? undefined }
            : null
        }
        initialItineraryId={pendingItineraryId}
        onClose={() => {
          setIsAddingToTrip(false);
          setPendingItineraryId(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.bgBase },
  safeArea: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 20 },
  searchContainer: { paddingHorizontal: 16, paddingTop: 12 },
  searchBox: {
    flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.97)",
    height: 50, borderRadius: 25, paddingHorizontal: 16, gap: 10,
    shadowColor: "#241A12", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.13, shadowRadius: 20, elevation: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: tokens.colors.text },
  divider: { width: StyleSheet.hairlineWidth, height: 20, backgroundColor: "rgba(36,26,18,0.18)" },
  filterBtn: { padding: 4 },
  chipRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: "row" },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1, borderColor: "rgba(36,26,18,0.14)",
    shadowColor: "#241A12", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  chipActive: { backgroundColor: tokens.colors.accent, borderColor: tokens.colors.accent },
  chipText: { fontSize: 13, fontWeight: "600", color: "rgba(36,26,18,0.7)" },
  chipTextActive: { color: "#FFFFFF" },
  mapControls: {
    position: "absolute", right: 14, top: "40%", backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 20, shadowColor: "#241A12", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1,
    shadowRadius: 16, elevation: 6, zIndex: 20, overflow: "hidden",
  },
  controlBtn: { width: 46, height: 46, alignItems: "center", justifyContent: "center" },
  controlDivider: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(36,26,18,0.12)" },
  errorPill: {
    flexDirection: "row", alignItems: "center", alignSelf: "center", backgroundColor: "rgba(36,26,18,0.82)",
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginTop: 10, gap: 6,
  },
  errorText: { fontSize: 11, fontWeight: "600", color: "rgba(255,200,200,1)", letterSpacing: 0.3 },
});
