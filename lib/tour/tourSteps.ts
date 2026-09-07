export type TourTabKey = "sites" | "itinerary" | "map" | "account";

export type TourStep = {
  id: string;
  tabKey?: TourTabKey;
  // Route to push to when this step needs a screen that isn't a static tab
  // (e.g. a specific site's detail page) — the actual route is supplied at
  // runtime by whichever screen knows it, via useTourStepRoute(key, route).
  dynamicRouteKey?: string;
  // Overrides the overlay's default scrim opacity (0.82). Used when a step
  // wants the real screen visible underneath instead of dimmed out.
  dim?: number;
  // Forces the caption card above/below its target instead of letting the
  // overlay pick based on available space — needed for targets pinned near
  // a screen edge, where "whichever side fits" isn't actually the right side.
  tooltipPosition?: "above" | "below";
  // Nudges the registered target rect down (px) before it's used for the
  // cutout/tooltip. An escape hatch for targets whose measured position ends
  // up off from where they visually read, without touching useTourTarget.
  targetOffsetY?: number;
  // Shrinks (negative) or grows (positive) the target rect's height (px)
  // before it's used for the cutout, independent of its vertical position.
  targetHeightDelta?: number;
  title: string;
  body: string;
};

// Each step with a tabKey needs a matching useTourTarget(step.id) call on
// that tab's screen. Steps without a tabKey stay on whatever screen the
// previous step landed on. Steps with no registered target show a centered
// card with no spotlight cutout.
export const TOUR_STEPS: TourStep[] = [
  {
    id: "home",
    tabKey: "account",
    title: "Read the Guide",
    body: "Booking tips, hot pool safety and local etiquette.",
  },
  {
    id: "exploreIntro",
    tabKey: "sites",
    dim: 0.4,
    title: "Explore Rotorua",
    body: "Every site, walk and hidden gem in the guide.",
  },
  {
    id: "explore",
    title: "Browse by Category",
    body: "Or search, if you already know what you are after.",
  },
  {
    id: "exploreFeatured",
    title: "Tap Through for More",
    body: "Every card is a real place. Tap for photos, hours and details.",
  },
  {
    id: "detailIntro",
    dynamicRouteKey: "site-detail",
    title: "Everything in One Place",
    body: "Hours, directions and reviews on a single screen.",
  },
  {
    id: "detailSave",
    title: "Save for Later",
    body: "Tap the heart to add it to your list.",
  },
  {
    id: "detailAddToItinerary",
    tooltipPosition: "above",
    title: "Add to Your Plan",
    body: "Drop it straight into any day of your trip.",
  },
  {
    id: "plansPreview",
    tabKey: "itinerary",
    title: "Plan Your Days",
    body: "Build a day by day itinerary. We handle the timing between stops.",
  },
  {
    id: "mapIntro",
    tabKey: "map",
    dim: 0.25,
    title: "Find What's Nearby",
    body: "Every site on the map, closest first.",
  },
  {
    id: "mapPremium",
    tooltipPosition: "below",
    targetOffsetY: 6,
    targetHeightDelta: -7,
    title: "Unlock the Full Guide",
    body: "One unlock gets every premium location, itinerary planning and drag to reorder.",
  },
];

export const TOUR_TAB_ROUTES: Record<TourTabKey, string> = {
  sites: "/(app)/(tabs)/sites",
  itinerary: "/(app)/(tabs)/itinerary",
  map: "/(app)/(tabs)/map",
  account: "/(app)/(tabs)/account",
};
