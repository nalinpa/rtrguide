export type TourTabKey = "sites" | "itinerary" | "map" | "account";

export type TourStep = {
  id: string;
  tabKey?: TourTabKey;
  title: string;
  body: string;
};

// Each step with a tabKey needs a matching useTourTarget(step.id) call on
// that tab's screen. Steps without a tabKey (welcome) show a centered card
// with no spotlight.
export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Quick Tour",
    body: "Let's get you oriented — four taps and you're set.",
  },
  {
    id: "explore",
    tabKey: "sites",
    title: "Browse by Category",
    body: "Filter by category, or search for something specific.",
  },
  {
    id: "plans",
    tabKey: "itinerary",
    title: "Plan Your Days",
    body: "Build a day-by-day itinerary — we handle the timing between stops.",
  },
  {
    id: "map",
    tabKey: "map",
    title: "Find What's Nearby",
    body: "Recenter on your location, or switch to satellite view.",
  },
  {
    id: "home",
    tabKey: "account",
    title: "Read the Guide",
    body: "Booking tips, hot pool safety, and etiquette — before you go.",
  },
];

export const TOUR_TAB_ROUTES: Record<TourTabKey, string> = {
  sites: "/(app)/(tabs)/sites",
  itinerary: "/(app)/(tabs)/itinerary",
  map: "/(app)/(tabs)/map",
  account: "/(app)/(tabs)/account",
};
