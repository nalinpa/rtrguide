// components/map/MapOverlay.tsx
import React, { useRef, useEffect } from "react";
import {
  StyleSheet,
  ActivityIndicator,
  Pressable,
  View,
  Text,
  Platform,
  ImageBackground,
  useWindowDimensions,
  Linking,
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { Navigation, ChevronRight, CalendarPlus } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatDistanceMeters } from "@blacksands/hooks";
import { CATEGORY_CONFIG } from "@/components/map/SiteMarker";
import type { Site, SiteCategory } from "@/lib/models";

export type NearbySite = {
  id: string;
  name: string;
  category: SiteCategory;
  distanceMeters: number | null;
};

export type ActiveItineraryItem = {
  id: string;
  siteId: string;
  siteName: string;
  timeLabel: string;
  category: SiteCategory;
  imageUrl?: string | null;
};

interface MapOverlayProps {
  site: Site | null;
  distanceMeters: number;
  onOpen: () => void;
  onSelectSite: (id: string) => void;
  onAddToItinerary?: () => void;
  nearbySites: NearbySite[];
  todayItems: ActiveItineraryItem[] | null;
  locStatus: "unknown" | "granted" | "denied";
  hasLoc: boolean;
  locError?: boolean;
  refreshingGPS?: boolean;
  bottomSheetRef: React.RefObject<BottomSheet | null>;
}

const SNAP_DEFAULT = ["12%", "22%", "40%"];

const SheetBackground = ({ style }: { style?: any }) => (
  <LinearGradient
    colors={["#001233", "#001233", "#F8FAFC"]}
    locations={[0, 0.32, 1]}
    style={style as any}
  />
);

const SERIF = Platform.OS === "ios" ? "Georgia" : "serif";

// ponytail: lib/utils/navigation.ts (and its getDirections export) doesn't exist in this
// repo — the brief's premise about sites/[siteId]/index.tsx having a handleDirections to
// port from doesn't hold either (no directions handler exists anywhere in this codebase).
// Universal Google Maps directions URL works cross-platform (opens the Maps app if
// installed, else browser) — no Platform branching needed.
function getDirections(lat: number, lng: number, _label: string) {
  Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
}

function timeLabelToMinutes(label: string): number {
  const match = label.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export function MapOverlayCard({
  site,
  onOpen,
  onSelectSite,
  onAddToItinerary,
  nearbySites,
  todayItems,
  locStatus,
  hasLoc,
  locError = false,
  distanceMeters,
  refreshingGPS = false,
  bottomSheetRef,
}: MapOverlayProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const carouselRef = useRef<any>(null);
  const hasAutoScrolled = useRef(false);

  useEffect(() => {
    if (hasAutoScrolled.current || !todayItems?.length) return;
    hasAutoScrolled.current = true;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let nearestIndex = 0;
    let minDiff = Infinity;
    todayItems.forEach((item, i) => {
      const diff = Math.abs(timeLabelToMinutes(item.timeLabel) - currentMinutes);
      if (diff < minDiff) {
        minDiff = diff;
        nearestIndex = i;
      }
    });

    const cardCenterX = 20 + nearestIndex * (128 + 10) + 64;
    const scrollX = Math.max(0, cardCenterX - windowWidth / 2);

    setTimeout(() => {
      carouselRef.current?.scrollTo({ x: scrollX, animated: true });
    }, 400);
  }, [todayItems, windowWidth]);

  const isDenied = locStatus === "denied";
  const isRequesting = !isDenied && !locError && !hasLoc;

  const renderCard = () => {
    if (!site) return null;

    if (isRequesting || refreshingGPS) {
      return (
        <>
          <View style={styles.header}>
            <View style={styles.loadingRow}>
              <ActivityIndicator color="rgba(255,255,255,0.7)" size="small" />
              <Text style={styles.loadingLabel}>CALIBRATING GPS</Text>
            </View>
            <Text style={styles.siteName} numberOfLines={2}>
              {site.name}
            </Text>
          </View>
          <View style={styles.actions}>
            <Pressable onPress={onOpen} style={styles.btnDetails}>
              <Text style={styles.btnDetailsText}>View Details</Text>
            </Pressable>
          </View>
        </>
      );
    }

    const metaLine = [site.category, site.region]
      .filter(Boolean)
      .join(" · ")
      .toUpperCase();
    const distanceLabel = formatDistanceMeters(distanceMeters);

    return (
      <>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.siteName} numberOfLines={2}>
                {site.name}
              </Text>
              {metaLine ? <Text style={styles.siteMeta}>{metaLine}</Text> : null}
            </View>
            {hasLoc && (
              <View style={styles.distancePill}>
                <Navigation size={10} color="rgba(255,255,255,0.85)" strokeWidth={2} />
                <Text style={styles.distancePillText}>{distanceLabel}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable onPress={onOpen} style={styles.btnDetails}>
            <Text style={styles.btnDetailsText}>Details</Text>
          </Pressable>
          <Pressable
            onPress={() => getDirections(site.lat, site.lng, site.name)}
            style={styles.btnDirections}
          >
            <Navigation size={14} color="#FFF" strokeWidth={2} />
            <Text style={styles.btnDirectionsText}>Directions</Text>
          </Pressable>
        </View>
        {onAddToItinerary && (
          <View style={styles.actionsSecondary}>
            <Pressable onPress={onAddToItinerary} style={styles.btnAddToTrip}>
              <CalendarPlus size={15} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.btnAddToTripText}>Add to Itinerary</Text>
            </Pressable>
          </View>
        )}
      </>
    );
  };

  const isBaseState = !!site && !isRequesting && !refreshingGPS;
  const showItinerary = isBaseState && !!todayItems?.length;
  const showNearby = isBaseState && !showItinerary && nearbySites.length > 0;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={1}
      snapPoints={SNAP_DEFAULT}
      enablePanDownToClose={false}
      backgroundComponent={SheetBackground}
      backgroundStyle={styles.sheetBgStyle}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) },
        ]}
      >
        {renderCard()}

        {showItinerary && todayItems && (
          <View style={styles.nearbySection}>
            <View style={styles.nearbySep} />
            <Text style={styles.nearbySectionTitle}>TODAY'S PLAN</Text>
            <ScrollView
              ref={carouselRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
            >
              {todayItems.map((item) => {
                const dotColor = (CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.other).color;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => onSelectSite(item.siteId)}
                    style={styles.carouselCard}
                  >
                    {item.imageUrl ? (
                      <ImageBackground
                        source={{ uri: item.imageUrl }}
                        style={styles.cardImageBg}
                        imageStyle={styles.cardImage}
                      >
                        <LinearGradient
                          colors={["transparent", "rgba(0,10,30,0.82)"]}
                          locations={[0.35, 1]}
                          style={StyleSheet.absoluteFill}
                        />
                        <Text style={styles.cardTime}>{item.timeLabel}</Text>
                        <View style={styles.cardBottom}>
                          <Text style={styles.cardName} numberOfLines={2}>
                            {item.siteName}
                          </Text>
                          <View style={[styles.cardDot, { backgroundColor: dotColor }]} />
                        </View>
                      </ImageBackground>
                    ) : (
                      <View style={[styles.cardImageBg, styles.cardFallback, { borderLeftColor: dotColor }]}>
                        <Text style={styles.cardTime}>{item.timeLabel}</Text>
                        <View style={styles.cardBottom}>
                          <Text style={styles.cardName} numberOfLines={2}>
                            {item.siteName}
                          </Text>
                          <View style={[styles.cardDot, { backgroundColor: dotColor }]} />
                        </View>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {showNearby && (
          <View style={styles.nearbySection}>
            <View style={styles.nearbySep} />
            <Text style={styles.nearbySectionTitle}>NEARBY</Text>
            {nearbySites.map((nearby) => (
              <Pressable
                key={nearby.id}
                onPress={() => onSelectSite(nearby.id)}
                style={styles.nearbyRow}
              >
                <View
                  style={[
                    styles.nearbyDot,
                    { backgroundColor: (CATEGORY_CONFIG[nearby.category] ?? CATEGORY_CONFIG.other).color },
                  ]}
                />
                <Text style={styles.nearbyName} numberOfLines={1}>
                  {nearby.name}
                </Text>
                <Text style={styles.nearbyDist}>
                  {formatDistanceMeters(nearby.distanceMeters)}
                </Text>
                <ChevronRight size={14} color="rgba(255,255,255,0.4)" strokeWidth={2} />
              </Pressable>
            ))}
          </View>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBgStyle: { borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  handle: { backgroundColor: "rgba(255,255,255,0.28)", width: 40, height: 4 },
  scrollContent: {},
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 6 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  headerLeft: { flex: 1, gap: 3 },
  siteName: { fontFamily: SERIF, fontSize: 24, fontWeight: "700", color: "#FFFFFF", letterSpacing: -0.3, lineHeight: 30 },
  siteMeta: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.5)", letterSpacing: 2 },
  distancePill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, marginTop: 2,
  },
  distancePillText: { fontSize: 12, fontWeight: "600", color: "#FFFFFF" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 4 },
  loadingLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 2, color: "rgba(255,255,255,0.5)" },
  actions: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingBottom: 8 },
  btnDetails: {
    flex: 1, paddingVertical: 14, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center",
  },
  btnDetailsText: { fontSize: 14, fontWeight: "600", color: "#001233", letterSpacing: 0.1 },
  btnDirections: {
    flex: 1, flexDirection: "row", gap: 6, paddingVertical: 14, borderRadius: 10,
    backgroundColor: "#005EB8", alignItems: "center", justifyContent: "center",
  },
  btnDirectionsText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF", letterSpacing: 0.1 },
  actionsSecondary: { paddingHorizontal: 20, paddingBottom: 8, marginTop: 20 },
  btnAddToTrip: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 13, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
  },
  btnAddToTripText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF", letterSpacing: 0.1 },
  nearbySection: { paddingTop: 4 },
  nearbySep: {
    height: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.12)",
    marginHorizontal: 20, marginBottom: 20, marginTop: 8,
  },
  nearbySectionTitle: {
    fontSize: 10, fontWeight: "700", letterSpacing: 2.5, color: "rgba(255,255,255,0.5)",
    paddingHorizontal: 20, marginBottom: 8,
  },
  nearbyRow: {
    flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 13,
    marginHorizontal: 12, marginBottom: 6, borderRadius: 12, backgroundColor: "rgba(0,18,51,0.55)",
  },
  nearbyDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  nearbyName: { flex: 1, fontSize: 14, fontWeight: "600", color: "#FFFFFF", letterSpacing: -0.1 },
  nearbyDist: { fontSize: 12, fontWeight: "500", color: "rgba(255,255,255,0.55)" },
  carouselContent: { paddingLeft: 20, paddingRight: 12, gap: 10, paddingBottom: 4 },
  carouselCard: { width: 128, height: 168, borderRadius: 14, overflow: "hidden" },
  cardImageBg: { width: 128, height: 168, justifyContent: "space-between", padding: 10 },
  cardImage: { borderRadius: 14 },
  cardFallback: { backgroundColor: "rgba(0,18,51,0.7)", borderLeftWidth: 3 },
  cardTime: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, color: "rgba(255,255,255,0.65)", textTransform: "uppercase" },
  cardBottom: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  cardName: { flex: 1, fontSize: 13, fontWeight: "700", color: "#FFFFFF", letterSpacing: -0.1, lineHeight: 17, marginRight: 6 },
  cardDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0, marginBottom: 2 },
});
