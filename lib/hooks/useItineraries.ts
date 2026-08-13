import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@blacksands/client";

import { itineraryService } from "@/lib/services/itineraryService";
import { useSession } from "@/lib/providers/SessionProvider";
import type { Itinerary } from "@/lib/models";

export function useItineraries() {
  const { session } = useSession();
  const uid = session.status === "authed" ? session.uid : null;
  const queryClient = useQueryClient();

  const queryKey = ["rotoruaguide", "itineraries", uid];

  const { data: itineraries = [], isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        return await itineraryService.getMyItineraries();
      } catch (e) {
        console.error("[useItineraries] load failed:", e instanceof ApiError ? `status=${e.status} message=${e.message}` : e);
        throw e;
      }
    },
    enabled: !!uid,
  });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Itinerary>) => itineraryService.saveItinerary(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
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