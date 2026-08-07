import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { itineraryService } from "@/lib/services/itineraryService";
import { useSession } from "@/lib/providers/SessionProvider";
import type { Itinerary } from "@/lib/models";

export function useItineraries() {
  const { session } = useSession();
  const uid = session.status === "authed" ? session.uid : null;
  const queryClient = useQueryClient();

  const queryKey = ["rotoruaguide", "itineraries", uid];

  const { data: itineraries = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: () => itineraryService.getMyItineraries(),
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
    error: error ? "Couldn't load your trips." : null,
    saveItinerary: saveMutation.mutateAsync,
    deleteItinerary: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}