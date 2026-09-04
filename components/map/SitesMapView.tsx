// components/map/SitesMapView.tsx
import React, {
  useRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import { StyleSheet, View, Text } from "react-native";
import ClusterMapView from "react-native-map-clustering";
import MapView, { Marker, Region, MapType } from "react-native-maps";

import { SiteMarker } from "@/components/map/SiteMarker";
import { tokens } from "@/lib/ui/tokens";
import type { SiteCategory } from "@/lib/models";
export { initialRegionFrom } from "./MapRegion";

// Loose bounding box around Rotorua township and its lakes.
const DEFAULT_MAP_BOUNDS = {
  northEast: { latitude: -37.95, longitude: 176.45 },
  southWest: { latitude: -38.3, longitude: 176.05 },
};

export type SiteMapPoint = {
  id: string;
  name?: string;
  lat: number;
  lng: number;
  category?: SiteCategory;
  completed?: boolean;
};

export type SitesMapViewHandle = {
  recenter: (lat: number, lng: number) => void;
  focusOn: (lat: number, lng: number) => void;
};

// react-native-maps rasterizes a non-tracked marker's children into a bitmap
// once, at mount. If that happens before the SVG icon has finished its first
// paint, the marker freezes on a blank/default look until re-selected. Keep
// tracksViewChanges on for a brief settle window after mount so every marker
// gets at least one real paint before freezing.
const MARKER_SETTLE_MS = 700;

function SiteMapMarker({
  loc,
  selected,
  onPress,
}: {
  loc: SiteMapPoint;
  selected: boolean;
  onPress: () => void;
}) {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSettled(true), MARKER_SETTLE_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <Marker
      coordinate={{ latitude: loc.lat, longitude: loc.lng }}
      onPress={onPress}
      tracksViewChanges={selected || !settled}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={selected ? 2 : 1}
    >
      <SiteMarker selected={selected} completed={loc.completed} category={loc.category} />
    </Marker>
  );
}

const SitesMapViewInner = forwardRef<
  SitesMapViewHandle,
  {
    sites: SiteMapPoint[];
    initialRegion: Region;
    selectedSiteId: string | null;
    mapType: MapType;
    onPressSite: (id: string) => void;
  }
>(function SitesMapView(
  { sites, initialRegion, selectedSiteId, mapType, onPressSite },
  ref,
) {
  const mapRef = useRef<MapView>(null);
  const currentRegionRef = useRef<Region | null>(null);
  const focusedSiteIdRef = useRef<string | null>(null);

  useImperativeHandle(ref, () => ({
    recenter: (lat, lng) => {
      mapRef.current?.animateToRegion(
        { latitude: lat, longitude: lng, latitudeDelta: 0.03, longitudeDelta: 0.03 },
        400,
      );
    },
    focusOn: (lat, lng) => {
      mapRef.current?.animateToRegion(
        { latitude: lat, longitude: lng, latitudeDelta: 0.008, longitudeDelta: 0.008 },
        400,
      );
    },
  }));

  useEffect(() => {
    if (!selectedSiteId || !mapRef.current) return;
    // Only auto-focus on an actual new selection — re-running this because `sites`
    // refetched (e.g. cache refresh on focus) must not fight the user's manual zoom.
    if (focusedSiteIdRef.current === selectedSiteId) return;
    focusedSiteIdRef.current = selectedSiteId;

    const siteData = sites.find((loc) => loc.id === selectedSiteId);
    if (!siteData) return;

    const current = currentRegionRef.current;
    if (current) {
      const { latitude, longitude, latitudeDelta, longitudeDelta } = current;
      const inBounds =
        Math.abs(siteData.lat - latitude) < latitudeDelta / 2 &&
        Math.abs(siteData.lng - longitude) < longitudeDelta / 2;
      if (inBounds && latitudeDelta <= 0.003) return;

      mapRef.current.animateToRegion(
        {
          latitude: siteData.lat,
          longitude: siteData.lng,
          latitudeDelta: Math.min(latitudeDelta, 0.004),
          longitudeDelta: Math.min(longitudeDelta, 0.004),
        },
        400,
      );
    } else {
      mapRef.current.animateToRegion(
        {
          latitude: siteData.lat,
          longitude: siteData.lng,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        500,
      );
    }
  }, [selectedSiteId, sites]);

  const handleMapReady = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.setMapBoundaries(
        DEFAULT_MAP_BOUNDS.northEast,
        DEFAULT_MAP_BOUNDS.southWest,
      );
    }
  }, []);

  const renderedMarkers = useMemo(() => {
    return sites.map((loc) => {
      const selected = selectedSiteId === loc.id;
      return (
        <SiteMapMarker
          key={loc.id}
          loc={loc}
          selected={selected}
          onPress={() => onPressSite(loc.id)}
        />
      );
    });
  }, [sites, selectedSiteId, onPressSite]);

  return (
    <ClusterMapView
      ref={mapRef}
      style={styles.flex1}
      initialRegion={initialRegion}
      mapType={mapType}
      showsUserLocation
      showsMyLocationButton={false}
      toolbarEnabled={false}
      onMapReady={handleMapReady}
      onRegionChangeComplete={(region: Region) => {
        currentRegionRef.current = region;
      }}
      minZoomLevel={10}
      maxZoomLevel={20}
      moveOnMarkerPress={false}
      showsTraffic={false}
      showsBuildings={false}
      showsPointsOfInterests={false}
      pointsOfInterestFilter={[]}
      renderCluster={(cluster: any) => {
        const { id, geometry, onPress, properties } = cluster;
        const { point_count } = properties;
        const [lng, lat] = geometry.coordinates;
        return (
          <Marker
            key={`cluster-${id}`}
            coordinate={{ latitude: lat, longitude: lng }}
            onPress={onPress}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.cluster}>
              <Text style={styles.clusterText}>{point_count}</Text>
            </View>
          </Marker>
        );
      }}
    >
      {renderedMarkers}
    </ClusterMapView>
  );
});

export const SitesMapView = React.memo(SitesMapViewInner);

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  cluster: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tokens.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 4,
  },
  clusterText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
