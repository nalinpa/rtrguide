import { useMemo } from "react";
import { createHooks } from "@blacksands/hooks";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as StoreReview from "expo-store-review";
import NetInfo from "@react-native-community/netinfo";
import { client } from "@/lib/api";
import type { Site } from "@/lib/models";

export const QUERY_KEY_PREFIX = ["rotoruaguide"];

export const hooksBag = createHooks<Site>(client, {
  appId: "rotoruaguide",
  queryKeyPrefix: QUERY_KEY_PREFIX,
  storage: AsyncStorage,
  locationSource: {
    requestPermission: async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      return perm.status === "granted";
    },
    getCurrent: async () => {
      const cur = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      return { coords: cur.coords };
    },
    watchPosition: async (onUpdate) => {
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 1 },
        (loc) => onUpdate({ coords: loc.coords }),
      );
      return () => sub.remove();
    },
  },
  netInfo: {
    fetch: async () => {
      const state = await NetInfo.fetch();
      return { isConnected: state.isConnected, isInternetReachable: state.isInternetReachable };
    },
    addEventListener: (cb) =>
      NetInfo.addEventListener((state) =>
        cb({ isConnected: state.isConnected, isInternetReachable: state.isInternetReachable }),
      ),
  },
  storeReview: {
    isAvailable: () => StoreReview.isAvailableAsync(),
    requestReview: () => StoreReview.requestReview(),
  },
});

// Only active sites should ever be listed; inactive ones stay reachable by
// direct id (useLocation), or via useAllLocations, for things like existing
// itinerary entries and saved sites the user already added.
export const useAllLocations = hooksBag.useLocations;
hooksBag.useLocations = () => {
  const result = useAllLocations();
  const locations = useMemo(() => result.locations.filter((l) => l.active), [result.locations]);
  return { ...result, locations };
};

export const {
  useMyCompletions,
  useCheckIn,
  useOfflineQueue,
  useMyReviews,
  useSubmitReview,
  useGPSGate,
  useDraftsStore,
  useTrackingStore,
  useGuestStore,
  useMapStore,
  useAppSettingsStore,
  useLocation,
  useLocations,
  usePublicReviews,
  useReportContent,
  useBlockUser,
  useBlockedUsers,
  useNearestUnvisited,
  useSortedRows,
  useNearestCheckpoint,
  useUserLocation,
  useLocationStore,
  useSyncManager,
  useMyReview,
  useLocationReviewsSummary,
  useEntitlements,
  useReviewPrompt,
} = hooksBag;
