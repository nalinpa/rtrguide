import { useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNetInfo } from "@react-native-community/netinfo";
import { ApiError } from "@blacksands/client";
import * as Sentry from "@sentry/react-native";

import { hooksBag } from "@/lib/hooksBag";
import { itineraryService } from "@/lib/services/itineraryService";
import { useSession } from "@/lib/providers/SessionProvider";
import type { Itinerary } from "@/lib/models";

export function useItineraries() {
  const { session } = useSession();
  const uid = session.status === "authed" ? session.uid : null;
  const queryClient = useQueryClient();
  const { requestReview } = hooksBag.useReviewPrompt();
  const netInfo = useNetInfo();
  const isOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;

  const queryKey = ["rotoruaguide", "itineraries", uid];

  // Skip the fetch entirely while offline: Firebase's getIdToken() needs a
  // network round-trip to refresh an expired cached token, and if that fails
  // offline the shared transport's tokenOrThrow() can't tell the difference
  // from a real revoked session — it throws the same ApiError(401,
  // "unauthorized") either way, which would otherwise surface as a false
  // "Your session expired" message while merely offline.
  const { data: itineraries = [], isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        return await itineraryService.getMyItineraries();
      } catch (e) {
        console.error("[useItineraries] load failed:", e instanceof ApiError ? `status=${e.status} message=${e.message}` : e);
        Sentry.captureException(e);
        throw e;
      }
    },
    enabled: !!uid && !isOffline,
  });

  const preSaveCountRef = useRef(itineraries.length);
  preSaveCountRef.current = itineraries.length;

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Itinerary>) => itineraryService.saveItinerary(data),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey });
      if (!variables.id && preSaveCountRef.current === 0) {
        requestReview();
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => itineraryService.deleteItinerary(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    itineraries,
    loading: isLoading,
    error: error
      ? error instanceof ApiError && error.status === 401
        ? "Your session expired. Please sign in again."
        : "Couldn't load your trips."
      : null,
    refetch,
    saveItinerary: saveMutation.mutateAsync,
    deleteItinerary: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}