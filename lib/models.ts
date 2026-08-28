export const SITE_CATEGORIES = [
  "Geothermal",
  "Walks",
  "Attractions",
  "Cultural",
  "Hotpools",
  "Adventure",
  "Food & Drink",
  "Stay",
] as const;
export type SiteCategory = (typeof SITE_CATEGORIES)[number];

export type Checkpoint = {
  id?: string;
  label?: string;
  lat: number;
  lng: number;
  radiusMeters: number;
};

export type Site = {
  id: string;
  name: string;
  slug: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  checkpoints?: Checkpoint[];
  description: string;
  active: boolean;
  category: SiteCategory[];
  region?: string;
  price?: string;
  website?: string;
  imageUrl?: string | null;
  imageThumbnailUrl?: string | null;
  featured?: number;
  isPremium?: boolean;
};

export type ItineraryItem = {
  id: string;
  siteId: string;
  siteName: string;
  slotIndex: number;
  timeLabel: string;
  durationLabel: string;
  durationSlots: number;
  imageUrl?: string;
};

export type ItineraryDay = {
  id: string;
  date: string;
  items: ItineraryItem[];
};

export type Itinerary = {
  id: string;
  userId: string;
  title: string;
  startDate: string;
  endDate: string;
  days: ItineraryDay[];
  createdAt: string;
  updatedAt: string;
};
