# Sites list/detail restyle — design

## Context

rotorua-guide's sites list and detail screens currently render through the
generic, shared `@blacksands/components` library — the same components used
unmodified by cones, rings, and other apps generated from the same template.
The user wants these two screens to look like aklguide's instead: an
editorial, image-driven guide app (featured hero card, category tabs, photo
hero, bottom-sheet-style detail) rather than a generic gamified checklist.

This spec assumes the app-wide theme update
(`2026-08-07-app-theme-update-design.md`) has landed — `lib/ui/tokens.ts`
already carries the light Rotorua palette, and every `@blacksands/ui` /
`@blacksands/components` primitive inherits it automatically.

## Investigation: what actually needs rebuilding

Reading the compiled `@blacksands/components` source (`node_modules/@blacksands/components/dist/index.js`)
shows two different situations:

- **`LocationHero`, `LocationListItem`, `LocationListView`, `LocationListHeader`**
  have no image support at all — no `imageUrl` prop, no `<Image>` anywhere in
  their render trees, no concept of a featured card or category tabs. No
  amount of retheming fixes this; the layout itself can't produce aklguide's
  look. These get rebuilt.
- **`StatusCard`, `ActionsCard`** are prop-driven and pull every color from
  `tokens.colors` — structurally they're reasonable (rounded cards, clear
  states), but their shape (dense sectioned stacks, generic "gamified
  checklist" framing) still doesn't read as an editorial guide app even once
  recolored. Per direct feedback, these get rebuilt too, matching aklguide's
  own choice to hand-build its `ActionsCard` locally rather than use the
  shared one.
- **`ReviewsSummaryCard`, `ReviewModal`, `ReviewListItem`, `ReviewOptionsMenu`,
  `ReviewsHeader`, `ReviewsEmptyState`** — aklguide itself kept these on the
  shared library (see `aklguide/mobile/lib/uiComponents.ts`). Same call here:
  no rebuild, they inherit the new palette for free. This means
  `sites/[siteId]/reviews.tsx` needs **no changes** — it exclusively uses
  these shared components already.

## Scope

Rebuilt:
- `sites/index.tsx` (list) — full rewrite
- `sites/[siteId]/index.tsx` (detail) — full rewrite
- New bespoke components (below)

Unchanged:
- `sites/[siteId]/reviews.tsx` — no changes needed
- Reviews flow inside the detail screen keeps using `components.ReviewsSummaryCard` / `components.ReviewModal`

## Data model

New file `lib/models.ts`, shaped like aklguide's `lib/models.ts` (same field
set: `slug`, `lat`/`lng`/`radiusMeters`/`checkpoints`, `category`, `region`,
image fields, `featured`), with two deliberate differences:

- `category` uses Rotorua-appropriate values (agreed earlier), not
  Auckland's Attraction/Food/Coffee/Stay/Shopping/Bar.
- `region` is kept as a loose optional `string`, not a strict union — no
  Rotorua region taxonomy has been defined and nothing in this spec's UI
  consumes it. Tighten to a union later if a region filter gets built.

```ts
// lib/models.ts
export const SITE_CATEGORIES = [
  "Geothermal",
  "Māori Culture",
  "Adventure",
  "Walks & Nature",
  "Lake & Water",
  "Food & Drink",
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
  category: SiteCategory;
  region?: string;
  imageUrl?: string | null;
  imageThumbnailUrl?: string | null;
  featured?: number;
};
```

`vibe`, `bookingLink`, `recommendedDurationSlots` from aklguide's `Site` type
are itinerary/booking-specific fields tied to aklguide's trip-planner feature,
which rotorua-guide doesn't have — not carried over, since nothing in this
spec (or the app) would read them. `SiteCompletionWrite`, `SiteReviewWrite`,
`Itinerary*` types are aklguide's Firestore write/itinerary shapes, out of
scope — rotorua's check-in/review writes already go through
`@blacksands/hooks`' generic `useCheckIn`/`saveReview`, untyped against a
local model.

**External dependency**: `category`, `region`, `imageUrl`, `imageThumbnailUrl`,
`featured` must exist on site documents. That data is owned by
`@blacksands/admin`, not built here — this spec documents the field contract
as a dependency. Until populated: list/detail render with placeholder tiles,
category tabs simply show fewer/no results for categories with no matching
data yet, and "featured" falls back to the nearest site.

## List screen (`sites/index.tsx`)

Composite header (mirrors aklguide's inline-header pattern), all built from
plain `View`/`Image`/`Pressable` plus `AppText`/`Pill`/`AppIcon` reused from
`lib/uiKit.ts` for text/badges — no new typography scale needed, everything
inherits `lib/ui/tokens.ts` colors:

1. App bar — eyebrow "Explore" + "Rotorua" title, search/filter icon button (reserved, no-op for now — no search feature requested).
2. Category tab bar — horizontal scroll, `SITE_CATEGORIES` + "All", underline-indicator on active tab, client-side filter over already-loaded `locations`.
3. Featured card — highest `featured` value (fallback: nearest site), full-bleed image with gradient overlay and title/description, or a plain accent-colored card with a large icon when no image exists yet.
4. Section label — category name or "Places to Visit".
5. List — `SiteListItem` cards (excludes the featured site).

New files:
- `components/site/list/SiteListItem.tsx` — image-left card (thumbnail or icon-tile placeholder when `imageUrl`/`imageThumbnailUrl` absent), name, description (2 lines), distance badge. Same prop shape as aklguide's `SiteListItem`: `id, name, description?, distanceMeters?, imageUrl?, onPress, index`.
- `components/site/list/SitesListView.tsx` — `@shopify/flash-list` wrapper (header slot, item separator, `renderItem`). Same shape as aklguide's `SitesListView`, typed against `SortedRow<Site>` from `@blacksands/hooks`.

Deleted:
- `components/sites/FiltersCard.tsx` — the generator's placeholder filter card, superseded by category tabs.

Dependency housekeeping: `@shopify/flash-list` is already resolvable at
runtime (a transitive dependency of `@blacksands/components`, and already
imported directly in `reviews.tsx`) but isn't declared in `package.json`.
Add it explicitly — fixes a latent gap, doesn't introduce a new dependency
in practice.

## Detail screen (`sites/[siteId]/index.tsx`)

Structure mirrors aklguide: photo hero with parallax scroll (falls back to a
gradient + large icon when no image exists), bottom-sheet-style content card
with drag handle, then the same three panels as today — status, reviews,
actions — just two of them rebuilt:

New files:
- `components/site/detail/SiteHero.tsx` — replaces `components.LocationHero`. Props: `title, description, completed, imageUrl?, imageThumbnailUrl?` (adds the two image props; drops `meta`/`metaSecondary`/`children`, unused at today's call site).
- `components/site/detail/CheckInStatusCard.tsx` — replaces `components.StatusCard`. Same prop subset actually used today: `id, title, completed, loc, locStatus, distanceMeters, isTargetingThis, isTrackingSomethingElse, trackingTargetName, onStartTracking, onStopTracking, onSwitchTarget`. Same state machine (waiting-for-GPS / ready-to-track / live-tracking / completed), rebuilt in the bespoke card language (rounded white card, warm shadow, ember accent).
- `components/site/detail/SiteActionsBar.tsx` — replaces `components.ActionsCard`. Same prop subset used today: `id, title, completed, completionMode, isSyncing, locStatus, hasLoc, canCheckIn, hasReview, myReviewRating, myReviewText, onOpenReview, onCheckIn, shareBonus, onShareBonus`. Same primary Check-In CTA (gated on `canCheckIn`, disabled states for denied/unavailable location), same syncing/completed states, same review/share sections.

Unchanged in the route: `components.ReviewsSummaryCard` and
`components.ReviewModal` stay exactly as wired today — only the surrounding
imports swap from `components.LocationHero/StatusCard/ActionsCard` to the
three new local components.

## Out of scope

- Search (the app-bar icon button is a placeholder, no-op).
- Region filter/taxonomy (field exists on `Site` for shape parity, unused).
- Saved sites / itineraries — aklguide-only features, no equivalent in
  rotorua-guide's gameplay, not requested.
- `@blacksands/admin` changes to populate `category`/`imageUrl`/`featured`
  on real site documents — external dependency, tracked not implemented.

## Verification

No automated tests apply to layout/visual work like this. Manual walk after
implementation:
- List: category tabs filter correctly, featured card renders (with and
  without an image — test both by toggling a site's `imageUrl` in Firestore),
  list items show placeholder tiles gracefully when no image.
- Detail: hero renders with and without an image, parallax scroll doesn't
  jank, check-in flow behaves identically to today (GPS-gated, syncing
  state, completed state) — this is the part most likely to regress since
  the state machine is being rebuilt, not just retheme.
