import { useLocalSearchParams } from "expo-router";

import { ItineraryDetailView } from "@/components/itinerary/ItineraryDetailView";

export default function ItineraryDetailPage() {
  const { itineraryId, jumpToDay, jumpToSlot } = useLocalSearchParams<{
    itineraryId: string;
    jumpToDay?: string;
    jumpToSlot?: string;
  }>();

  return <ItineraryDetailView tripId={itineraryId} jumpToDay={jumpToDay} jumpToSlot={jumpToSlot} />;
}
