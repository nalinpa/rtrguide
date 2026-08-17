import { useCallback, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Stack, router } from "expo-router";
import MapView from "react-native-maps";
import * as Haptics from "expo-haptics";
import { Screen, LoadingState, ErrorCard, components, boundingRegionFrom } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { hooksBag } from "@/lib/hooksBag";
import { useEntitlementGate } from "@/lib/hooks/useEntitlementGate";
import { useSession } from "@/lib/providers/SessionProvider";
import { FULL_GUIDE_PRODUCT_ID } from "@/lib/constants/commerce";

// NOTE: react-native-maps is a peerDependency of @blacksands/components
// (TrackedMarker) but @blacksands/create-app doesn't install it
// automatically. Run `npx expo install react-native-maps` first if this
// screen fails to bundle.

const DEFAULT_REGION = { latitude: -36.8485, longitude: 174.7633, latitudeDelta: 0.15, longitudeDelta: 0.15 };
const NO_COMPLETIONS = new Set<string>();

export default function MapScreen() {
  const { session } = useSession();
  const uid = session.status === "authed" ? session.uid : null;

  const { locations, loading, err } = hooksBag.useLocations();
  const { entitledProductIds, loading: entitlementsLoading } = useEntitlementGate(uid);
  const visibleLocations = useMemo(
    () => locations.filter((l) => !l.isPremium || entitledProductIds.has(FULL_GUIDE_PRODUCT_ID)),
    [locations, entitledProductIds],
  );
  const { loc } = hooksBag.useUserLocation({ autoRequest: true });
  const { selectedLocationId, setSelectedLocationId } = hooksBag.useMapStore();

  const nearestUnvisited = hooksBag.useNearestUnvisited(visibleLocations, NO_COMPLETIONS, loc);

  const selectedLocation = useMemo(
    () => visibleLocations.find((l) => l.id === selectedLocationId) ?? null,
    [visibleLocations, selectedLocationId],
  );
  const gate = hooksBag.useGPSGate(selectedLocation, loc);

  const initialRegion = useMemo(() => {
    if (loading || visibleLocations.length === 0) return DEFAULT_REGION;
    return boundingRegionFrom(visibleLocations.map((l) => ({ lat: l.lat, lng: l.lng }))) ?? DEFAULT_REGION;
  }, [loading, visibleLocations]);

  const handlePressMarker = useCallback(
    (id: string) => {
      Haptics.selectionAsync();
      setSelectedLocationId(id);
    },
    [setSelectedLocationId],
  );

  if (loading || entitlementsLoading) {
    return (
      <Screen>
        <LoadingState label="Loading map..." />
      </Screen>
    );
  }
  if (err) {
    return (
      <Screen>
        <ErrorCard title="Map Error" message={err} />
      </Screen>
    );
  }

  const activeLocation = selectedLocation ?? nearestUnvisited?.location ?? null;
  const overlayDistance = selectedLocation && gate ? gate.distanceMeters : nearestUnvisited?.distanceMeters;

  // GAP: real map screens (cones/rings/eats) show a richer overlay below
  // with an inline GPS-gated "I'm here" check-in button (MapOverlayCard,
  // @gorhom/bottom-sheet). That component isn't in @blacksands/components
  // yet -- components/task-progress.md flags it explicitly: "inlines a
  // full check-in flow ... needs the check-in flow extracted to
  // @blacksands/hooks first." This reuses NearestUnvisitedCard
  // (view-details only) as a working stand-in. hooksBag.useCheckIn and
  // the `gate` above (already wired) are what a richer overlay needs
  // once that extraction happens.
  return (
    <Screen padded={false}>
      <Stack.Screen options={{ title: "Map", headerTransparent: true }} />

      <View style={styles.flex1}>
        <MapView style={styles.flex1} initialRegion={initialRegion}>
          {visibleLocations.map((location) => (
            <components.TrackedMarker
              key={location.id}
              data={{ id: location.id, lat: location.lat, lng: location.lng }}
              selected={location.id === selectedLocationId}
              completed={false}
              onPress={handlePressMarker}
              renderMarker={(_data, state, onMarkerReady) => (
                <View
                  style={[styles.pin, state.selected && styles.pinSelected]}
                  onLayout={onMarkerReady}
                />
              )}
            />
          ))}
        </MapView>

        {activeLocation && (
          <View style={styles.overlay}>
            <components.NearestUnvisitedCard
              location={activeLocation}
              distanceMeters={overlayDistance}
              locStatus={loc ? "granted" : "unknown"}
              onOpenLocation={(id) => router.push(`/(app)/(tabs)/sites/${id}`)}
            />
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  overlay: { position: "absolute", bottom: 24, left: 16, right: 16 },
  pin: { width: 16, height: 16, borderRadius: 8, backgroundColor: tokens.colors.accent, borderWidth: 2, borderColor: tokens.colors.bgCard },
  pinSelected: { width: 20, height: 20, borderRadius: 10 },
});
