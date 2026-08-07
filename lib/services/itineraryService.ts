import { itinerariesApi } from "@/lib/api";
import type { Itinerary } from "@/lib/models";

export const itineraryService = {
  async getMyItineraries(): Promise<Itinerary[]> {
    const { itineraries } = await itinerariesApi.list();
    return itineraries;
  },
  async saveItinerary(itin: Partial<Itinerary>): Promise<string> {
    if (itin.id) {
      const { itinerary } = await itinerariesApi.update(itin.id, itin);
      return itinerary.id;
    }
    const { itinerary } = await itinerariesApi.create({
      title: itin.title,
      startDate: itin.startDate!,
      endDate: itin.endDate!,
      days: itin.days,
    });
    return itinerary.id;
  },
  async deleteItinerary(id: string): Promise<void> {
    await itinerariesApi.remove(id);
  },
};