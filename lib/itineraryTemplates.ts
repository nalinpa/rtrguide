// Curated trip templates a user can turn into their own itinerary from
// CreateItineraryModal's "Suggested Itinerary" picker. Read-only, dateless,
// no userId — real dates and slot corrections happen once copied into a
// real Itinerary. Site ids/names below are pulled from scripts/sites.json
// (same data useLocations() serves) — keep in sync if those sites change.
// slotIndex/durationSlots are pre-baked against the real transit matrix
// (assets/data/rotorua-transit.json) via scripts/audit-templates.js, so
// what's shown here already matches what the itinerary physics engine
// would compute — no silent re-shuffle the first time the trip is opened.
// Re-run that script (and re-paste its output here) if the transit matrix
// or these sites' locations change.

export type ItineraryTemplateItem = {
  siteId: string;
  siteName: string;
  slotIndex: number;
  durationSlots: number;
};

export type ItineraryTemplateDay = {
  items: ItineraryTemplateItem[];
};

export type ItineraryTemplate = {
  key: string;
  label: string;
  description: string;
  days: ItineraryTemplateDay[];
  // Selectable without the full guide unlock. Defaults to premium-only.
  free?: boolean;
};

// The template key to preselect in CreateItineraryModal's picker. Locked
// (non-premium) users can't leave this on "Blank" — that option is gated
// behind the same free flag as the templates — so default them onto the
// first free template instead.
export function defaultTemplateKey(locked: boolean): string | null {
  if (!locked) return null;
  return ITINERARY_TEMPLATES.find((t) => t.free)?.key ?? null;
}

export const ITINERARY_TEMPLATES: ItineraryTemplate[] = [
  {
    key: "geothermal-highlights",
    label: "Geothermal Highlights",
    description: "A free thermal park, Te Puia's living geothermal valley, a soak at Polynesian Spa, and lunch at Eat Streat.",
    days: [
      {
        items: [
          { siteId: "5d7c5092ea59432fb72e", siteName: "Kuirau Park", slotIndex: 3, durationSlots: 3 },
          { siteId: "a95ac72ad27d46a7804a", siteName: "Te Puia", slotIndex: 7, durationSlots: 4 },
          { siteId: "c12ea6fb79de46afbc59", siteName: "Polynesian Spa", slotIndex: 12, durationSlots: 4 },
          { siteId: "589202139fe44e94ab32", siteName: "Eat Streat", slotIndex: 17, durationSlots: 4 },
        ],
      },
    ],
  },
  {
    key: "rotorua-weekend",
    label: "Rotorua Weekend",
    description: "A living geothermal village, forest walks, a Māori hangi evening, then a day south to Waiotapu.",
    days: [
      {
        items: [
          { siteId: "0947007f6e384dac88eb", siteName: "Whakarewarewa", slotIndex: 2, durationSlots: 4 },
          { siteId: "96d0c070bf394c99a293", siteName: "Redwoods Treewalk", slotIndex: 7, durationSlots: 3 },
          { siteId: "3b59c87f607c461397b8", siteName: "Mr Wolf", slotIndex: 11, durationSlots: 2 },
          { siteId: "83e1ee584eeb41cda3ef", siteName: "Government Gardens", slotIndex: 14, durationSlots: 3 },
          { siteId: "4c06795965b945c081ad", siteName: "Lady Janes Ice Cream Parlour", slotIndex: 18, durationSlots: 1 },
          { siteId: "947fd665e1644456bcaa", siteName: "Mitai Māori Village", slotIndex: 21, durationSlots: 6 },
        ],
      },
      {
        items: [
          { siteId: "c3c4dc378c704bbc92d9", siteName: "Waiotapu Mud Pools", slotIndex: 2, durationSlots: 1 },
          { siteId: "014e8cdb95c1464fb2b9", siteName: "Waiotapu Thermal Wonderland", slotIndex: 4, durationSlots: 4 },
          { siteId: "d82ee40acb364116b23a", siteName: "Kerosene Creek", slotIndex: 9, durationSlots: 3 },
          { siteId: "580781cca4e44f3aa7e1", siteName: "Waikite Valley Thermal Pools", slotIndex: 13, durationSlots: 4 },
          { siteId: "589202139fe44e94ab32", siteName: "Eat Streat", slotIndex: 20, durationSlots: 4 },
        ],
      },
    ],
  },
  {
    key: "rotorua-splurge",
    label: "Rotorua Splurge",
    description: "A scenic flight, a luxury lakefront soak, and an award-winning hangi evening.",
    days: [
      {
        items: [
          { siteId: "3b59c87f607c461397b8", siteName: "Mr Wolf", slotIndex: 1, durationSlots: 1 },
          { siteId: "a95ac72ad27d46a7804a", siteName: "Te Puia", slotIndex: 3, durationSlots: 4 },
          { siteId: "67448da5a42b40dfa2ec", siteName: "Wai Ariki Hot Springs", slotIndex: 8, durationSlots: 3 },
          { siteId: "fd944c29cbbb427b9c1f", siteName: "Volcanic Air", slotIndex: 12, durationSlots: 5 },
          { siteId: "5ba5916b583e4fa6a2b2", siteName: "Te Pā Tū", slotIndex: 19, durationSlots: 8 },
        ],
      },
    ],
  },
  {
    key: "rotorua-town-basics",
    label: "Rotorua Town Basics",
    free: true,
    description: "A free, walkable day around the CBD — thermal parks, a historic lakeside village, and Eat Streat.",
    days: [
      {
        items: [
          { siteId: "5d7c5092ea59432fb72e", siteName: "Kuirau Park", slotIndex: 3, durationSlots: 3 },
          { siteId: "ce5c2c9c86cc4b84ae70", siteName: "Ohinemutu", slotIndex: 7, durationSlots: 2 },
          { siteId: "83e1ee584eeb41cda3ef", siteName: "Government Gardens", slotIndex: 10, durationSlots: 3 },
          { siteId: "fb6094b4f8d54e3d9a4f", siteName: "Sulphur Point", slotIndex: 14, durationSlots: 2 },
          { siteId: "589202139fe44e94ab32", siteName: "Eat Streat", slotIndex: 17, durationSlots: 5 },
          { siteId: "4c06795965b945c081ad", siteName: "Lady Janes Ice Cream Parlour", slotIndex: 23, durationSlots: 1 },
        ],
      },
    ],
  },
  {
    key: "free-budget-family",
    label: "Free & Budget Family Weekend",
    free: true,
    description: "Two days of free thermal parks, lake walks, and cheap eats — nature-based family fun, no big spend.",
    days: [
      {
        items: [
          { siteId: "5d7c5092ea59432fb72e", siteName: "Kuirau Park", slotIndex: 2, durationSlots: 3 },
          { siteId: "83e1ee584eeb41cda3ef", siteName: "Government Gardens", slotIndex: 6, durationSlots: 3 },
          { siteId: "fb6094b4f8d54e3d9a4f", siteName: "Sulphur Point", slotIndex: 10, durationSlots: 2 },
          { siteId: "e286efcf2e254f2d9902", siteName: "Redwoods Circuit", slotIndex: 14, durationSlots: 2 },
          { siteId: "b43757aa6608498cb66b", siteName: "Eastwood", slotIndex: 17, durationSlots: 2 },
        ],
      },
      {
        items: [
          { siteId: "f4e13763eabd44288bf8", siteName: "Blue Lake Circuit", slotIndex: 2, durationSlots: 3 },
          { siteId: "80efc2e11c174143ac29", siteName: "Okere Falls Track", slotIndex: 6, durationSlots: 4 },
          { siteId: "bd58e93080bb4b95bb08", siteName: "Okere Falls Store", slotIndex: 11, durationSlots: 2 },
          { siteId: "27c8ec876bf747c29f97", siteName: "Hamurana Springs Walk", slotIndex: 15, durationSlots: 3 },
          { siteId: "589202139fe44e94ab32", siteName: "Eat Streat", slotIndex: 20, durationSlots: 4 },
        ],
      },
    ],
  },
  {
    key: "best-of-rotorua-1day",
    label: "Best of Rotorua (1 Day)",
    description: "The essential Rotorua day: Te Puia's geysers, the Redwoods Treewalk, lunch, and Polynesian Spa.",
    days: [
      {
        items: [
          { siteId: "a95ac72ad27d46a7804a", siteName: "Te Puia", slotIndex: 3, durationSlots: 4 },
          { siteId: "96d0c070bf394c99a293", siteName: "Redwoods Treewalk", slotIndex: 8, durationSlots: 3 },
          { siteId: "589202139fe44e94ab32", siteName: "Eat Streat", slotIndex: 12, durationSlots: 4 },
          { siteId: "c12ea6fb79de46afbc59", siteName: "Polynesian Spa", slotIndex: 17, durationSlots: 5 },
        ],
      },
    ],
  },
  {
    key: "best-of-rotorua-2day",
    label: "Best of Rotorua (2 Days)",
    description: "Te Puia and the Redwoods, then Whakarewarewa village and an award-winning hangi evening.",
    days: [
      {
        items: [
          { siteId: "a95ac72ad27d46a7804a", siteName: "Te Puia", slotIndex: 3, durationSlots: 4 },
          { siteId: "96d0c070bf394c99a293", siteName: "Redwoods Treewalk", slotIndex: 8, durationSlots: 3 },
          { siteId: "589202139fe44e94ab32", siteName: "Eat Streat", slotIndex: 12, durationSlots: 4 },
          { siteId: "c12ea6fb79de46afbc59", siteName: "Polynesian Spa", slotIndex: 17, durationSlots: 5 },
        ],
      },
      {
        items: [
          { siteId: "0947007f6e384dac88eb", siteName: "Whakarewarewa", slotIndex: 0, durationSlots: 4 },
          { siteId: "5b4584fcf1334e0d84f4", siteName: "Pohutu Geyser Lookout Track (Pohaturoa Track)", slotIndex: 5, durationSlots: 4 },
          { siteId: "b041f037681b4c61ac92", siteName: "Secret Spot Hot Tubs", slotIndex: 11, durationSlots: 2 },
          { siteId: "83e1ee584eeb41cda3ef", siteName: "Government Gardens", slotIndex: 15, durationSlots: 3 },
          { siteId: "5ba5916b583e4fa6a2b2", siteName: "Te Pā Tū", slotIndex: 20, durationSlots: 8 },
        ],
      },
    ],
  },
  {
    key: "best-of-rotorua-3day",
    label: "Best of Rotorua (3 Days)",
    description: "Te Puia and the Redwoods, Whakarewarewa and a hangi evening, then a day trip south to Waimangu.",
    days: [
      {
        items: [
          { siteId: "a95ac72ad27d46a7804a", siteName: "Te Puia", slotIndex: 3, durationSlots: 4 },
          { siteId: "96d0c070bf394c99a293", siteName: "Redwoods Treewalk", slotIndex: 8, durationSlots: 3 },
          { siteId: "589202139fe44e94ab32", siteName: "Eat Streat", slotIndex: 12, durationSlots: 4 },
          { siteId: "c12ea6fb79de46afbc59", siteName: "Polynesian Spa", slotIndex: 17, durationSlots: 5 },
        ],
      },
      {
        items: [
          { siteId: "0947007f6e384dac88eb", siteName: "Whakarewarewa", slotIndex: 0, durationSlots: 4 },
          { siteId: "5b4584fcf1334e0d84f4", siteName: "Pohutu Geyser Lookout Track (Pohaturoa Track)", slotIndex: 5, durationSlots: 4 },
          { siteId: "83e1ee584eeb41cda3ef", siteName: "Government Gardens", slotIndex: 11, durationSlots: 3 },
          { siteId: "5ba5916b583e4fa6a2b2", siteName: "Te Pā Tū", slotIndex: 19, durationSlots: 8 },
        ],
      },
      {
        items: [
          { siteId: "6cd1c7c855ce4e3a90b2", siteName: "Waimangu Volcanic Valley", slotIndex: 3, durationSlots: 5 },
          { siteId: "c3c4dc378c704bbc92d9", siteName: "Waiotapu Mud Pools", slotIndex: 9, durationSlots: 1 },
          { siteId: "580781cca4e44f3aa7e1", siteName: "Waikite Valley Thermal Pools", slotIndex: 11, durationSlots: 4 },
          { siteId: "589202139fe44e94ab32", siteName: "Eat Streat", slotIndex: 18, durationSlots: 4 },
          { siteId: "4c06795965b945c081ad", siteName: "Lady Janes Ice Cream Parlour", slotIndex: 23, durationSlots: 1 },
        ],
      },
    ],
  },
];
