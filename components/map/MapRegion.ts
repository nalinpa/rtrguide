import type { Region } from "react-native-maps";

const DEFAULT_CENTER: Region = {
  latitude: -38.1368,
  longitude: 176.2497,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

export function initialRegionFrom(
  userLat: number | null,
  userLng: number | null,
  sites: { lat: number; lng: number }[],
): Region {
  if (userLat != null && userLng != null) {
    return {
      latitude: userLat,
      longitude: userLng,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }

  if (sites.length > 0) {
    let minLat = sites[0].lat;
    let maxLat = sites[0].lat;
    let minLng = sites[0].lng;
    let maxLng = sites[0].lng;

    for (const loc of sites) {
      if (loc.lat < minLat) minLat = loc.lat;
      if (loc.lat > maxLat) maxLat = loc.lat;
      if (loc.lng < minLng) minLng = loc.lng;
      if (loc.lng > maxLng) maxLng = loc.lng;
    }

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 1.2, 0.12),
      longitudeDelta: Math.max((maxLng - minLng) * 1.2, 0.12),
    };
  }

  return DEFAULT_CENTER;
}
