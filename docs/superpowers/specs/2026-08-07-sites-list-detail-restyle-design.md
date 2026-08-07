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
- New saved-sites feature (data + screen)

Placeholder only (UI affordance, no real logic):
- Region filter
- Itinerary

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
  consumes it beyond the placeholder icon. Tighten to a union later if a
  real region filter gets built.

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
are itinerary/booking-specific fields tied to aklguide's trip-planner feature.
Not carried over here — the itinerary feature in this spec is a placeholder
only (see below), nothing reads these fields yet. `SiteCompletionWrite`,
`SiteReviewWrite`, `Itinerary*` types are aklguide's Firestore write/itinerary
shapes, out of scope — rotorua's check-in/review writes already go through
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

1. App bar — eyebrow "Explore" + "Rotorua" title, plus three icon buttons: search (real), saved sites (real, see Saved sites section), region filter (placeholder, see Region filter below).
2. Search row — hidden until the search icon is tapped; a `TextInput` that filters `rows` by `name.toLowerCase().includes(query.toLowerCase())`, combined with the active category filter. Clearing the text (✕ button) hides the row again.
3. Category tab bar — horizontal scroll, `SITE_CATEGORIES` + "All", underline-indicator on active tab, client-side filter over already-loaded `locations`.
4. Featured card — highest `featured` value (fallback: nearest site), full-bleed image with gradient overlay and title/description, or a plain accent-colored card with a large icon when no image exists yet.
5. Section label — category name or "Places to Visit".
6. List — `SiteListItem` cards (excludes the featured site).

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

### Region filter — placeholder only

A "Region" icon button sits in the list app bar next to search/saved.
Tapping it shows a lightweight "Coming soon" affordance (a small popover or
`Alert.alert` — implementer's choice, no new screen). No filtering logic, no
region taxonomy defined. `Site.region` stays a loose optional `string` (see
Data model) so the field exists once a real taxonomy and filter get designed.

## Detail screen (`sites/[siteId]/index.tsx`)

Structure mirrors aklguide: photo hero with parallax scroll (falls back to a
gradient + large icon when no image exists), bottom-sheet-style content card
with drag handle, then the same three panels as today — status, reviews,
actions — two of them rebuilt, plus a new save toggle and an itinerary
placeholder:

New files:
- `components/site/detail/SiteHero.tsx` — replaces `components.LocationHero`. Props: `title, description, completed, imageUrl?, imageThumbnailUrl?` (adds the two image props; drops `meta`/`metaSecondary`/`children`, unused at today's call site).
- `components/site/detail/CheckInStatusCard.tsx` — replaces `components.StatusCard`. Same prop subset actually used today: `id, title, completed, loc, locStatus, distanceMeters, isTargetingThis, isTrackingSomethingElse, trackingTargetName, onStartTracking, onStopTracking, onSwitchTarget`. Same state machine (waiting-for-GPS / ready-to-track / live-tracking / completed), rebuilt in the bespoke card language (rounded white card, warm shadow, ember accent).
- `components/site/detail/SiteActionsBar.tsx` — replaces `components.ActionsCard`. Same prop subset used today (`id, title, completed, completionMode, isSyncing, locStatus, hasLoc, canCheckIn, hasReview, myReviewRating, myReviewText, onOpenReview, onCheckIn, shareBonus, onShareBonus`) plus two new props: `isSaved: boolean, onToggleSave: () => void` (see Saved sites section). Same primary Check-In CTA (gated on `canCheckIn`, disabled states for denied/unavailable location), same syncing/completed states, same review/share sections, plus a Heart save toggle.

Also in the route (inline JSX, not a new component file):
- A disabled-looking "+ Add to Itinerary" button below `SiteActionsBar`, matching aklguide's FAB placement, showing a "Coming soon" `Alert.alert` on tap (see Itinerary section below).

Unchanged in the route: `components.ReviewsSummaryCard` and
`components.ReviewModal` stay exactly as wired today — only the surrounding
imports swap from `components.LocationHero/StatusCard/ActionsCard` to the
new local components.

## Saved sites — real, backend-synced (mirrors aklguide exactly)

**Architecture note**: rotorua-guide's entire data layer (locations,
completions, reviews, blocking) goes through `@blacksands/client` — an HTTP
API client, not direct Firestore access. `lib/firebase.ts` today only sets up
Firebase Auth (`auth`), no Firestore. aklguide's saved-sites feature bypasses
its equivalent shared layer entirely and writes straight to Firestore
(`users/{uid}.savedSites`, `arrayUnion`/`arrayRemove`) via
`@react-native-firebase/firestore`. Per direct instruction, rotorua-guide
does the same — direct Firestore access, added fresh, using the modular JS
SDK (`firebase/firestore`) since that's the package already in
`package.json` (rotorua-guide uses `firebase`, not
`@react-native-firebase/*`). Same Firestore API shape either way (`doc`,
`getDoc`, `setDoc`, `arrayUnion`, `arrayRemove` all exist identically in the
modular JS SDK), so this is a straight port, not a redesign.

**External dependency**: this requires the app's Firestore security rules to
allow an authenticated user to read/write their own `users/{uid}` document
(specifically the `savedSites` field). Rules aren't in this repo — flagged
as a dependency, not implemented here. aklguide's working feature confirms
the underlying Firestore project supports this shape; rotorua-guide's rules
need to permit it too.

New/modified files:
- Modify `lib/firebase.ts` — add `export const db = getFirestore(app);` (import `getFirestore` from `firebase/firestore`).
- New `lib/constants/firestore.ts`:
  ```ts
  export const COL = { users: "users" } as const;
  ```
  (Only `users` — sites/completions/reviews/blocks still go through `@blacksands/client`, not Firestore directly. Not copying aklguide's full `COL` map, which lists collections this app doesn't touch via Firestore.)
- New `lib/hooks/useSavedSites.ts` — same shape as aklguide's hook (`@tanstack/react-query`, already a dependency): a query reading the `savedSites` array off the user's doc (`Set<string>`, defaults to empty when guest/no doc), and a mutation that writes via
  ```ts
  setDoc(doc(db, COL.users, uid), { savedSites: isSaving ? arrayUnion(siteId) : arrayRemove(siteId) }, { merge: true })
  ```
  with the same optimistic-update pattern as aklguide (update the query cache immediately, roll back on error). Returns `{ savedSiteIds, toggleSavedSite, isToggling }`. No separate `userService` wrapper file — the Firestore call lives directly in the mutation, since it's the only Firestore write in the app right now.
- Modify `components/site/detail/SiteActionsBar.tsx` (defined above) — `isSaved`/`onToggleSave` props already listed in the Detail screen section; implementation is a Heart icon action (filled + rose-colored when saved), same pattern as aklguide's `ActionsCard`.
- Modify `sites/[siteId]/index.tsx` — call `useSavedSites()`, pass `isSaved`/`onToggleSave` through to `SiteActionsBar`.
- New `app/(app)/saved-sites.tsx` — swipeable list (swipe-to-remove via `react-native-gesture-handler`'s `Swipeable`, already a dependency), reusing `SiteListItem`, header with a count badge, empty state ("No saved places yet — tap the bookmark icon on any place to save it here"). Same structure as aklguide's `saved-sites.tsx`, ported to `lib/uiKit.ts`'s `AppText`/`LoadingState`/`ErrorCard` and the new `tokens.colors`.
- Entry point: a bookmark icon button in the list screen's app bar (next to search), navigating to `/(app)/saved-sites`. Rotorua-guide's account tab isn't in scope for this spec, so the entry point lives in the sites app bar rather than requiring account-screen changes.

## Itinerary — placeholder only

Note: `@blacksands/client` already ships a generic, fully-built itineraries
REST client (`createItinerariesApi`, with `list`/`get`/`create`/`update`/`remove`
— see `node_modules/@blacksands/client/dist/itineraries.d.ts`), unused by
rotorua-guide's `hooksBag` today. A real itinerary feature later is more
"wire up the client + build the planner UI" than "build a backend too" — but
the planner UI itself (multi-day, drag/drop, slot assignment, like aklguide's
`plans` tab) is still a large, separate feature, not something this spec
builds.

For now: the disabled "+ Add to Itinerary" button described in the Detail
screen section shows a "Coming soon" `Alert.alert` on tap. No itinerary
data, no new routes, no `@blacksands/client` wiring.

## Out of scope

- Region filter logic and taxonomy — placeholder UI only (see Region filter section above).
- Itinerary feature — placeholder UI only (see Itinerary section above).
- `@blacksands/admin` changes to populate `category`/`imageUrl`/`featured`
  on real site documents — external dependency, tracked not implemented.
- Firestore security rules permitting `users/{uid}` read/write — external
  dependency for Saved sites, tracked not implemented.
- Cross-account cleanup (e.g. purging `savedSites` on account deletion) —
  aklguide has this via its account-deletion flow; rotorua-guide's account
  deletion (if any) isn't in this spec's scope.

## Verification

No automated tests apply to layout/visual work like this. Manual walk after
implementation:
- List: category tabs filter correctly, search filters by name and combines
  with the active category, featured card renders (with and without an
  image — test both by toggling a site's `imageUrl` in Firestore), list
  items show placeholder tiles gracefully when no image.
- Detail: hero renders with and without an image, parallax scroll doesn't
  jank, check-in flow behaves identically to today (GPS-gated, syncing
  state, completed state) — this is the part most likely to regress since
  the state machine is being rebuilt, not just retheme.
- Saved sites: toggling save/unsave on the detail screen updates
  `saved-sites.tsx` immediately (optimistic update), persists across app
  restart, and the empty state shows correctly with zero saved sites.
- Region and itinerary placeholders show their "coming soon" affordance and
  do nothing else (no crash, no navigation to a dead route).
