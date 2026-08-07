# Itinerary section — design

## Context

The user wants a trip-planner "Itinerary" feature matching aklguide's, where
users build a multi-day schedule from rotorua-guide's sites: a time-slotted
grid per day, drag-and-drop to reposition stops, auto-computed transit gaps
between them, and an "Add to Itinerary" flow reachable from the site detail
screen.

rotorua-guide already has a stub for this: the tab bar
(`app/(app)/(tabs)/_layout.tsx`) already lists an `itinerary` tab, and
`app/(app)/(tabs)/itinerary/index.tsx` exists as a "Coming soon" placeholder.
This spec replaces that stub.

Full scope was confirmed directly: full time-grid scheduler (not a
simplified ordered list), reusing aklguide's actual algorithm and the
generic `@blacksands/components` scheduling UI.

## Investigation: how aklguide actually built this

Researched `aklguide/mobile` in full (data model, API client, `plans.tsx`,
modals, physics engine, transit matrix, constants). Key findings that shape
this spec:

- **No Firestore involved.** Itineraries go through `@blacksands/client`'s
  `createItinerariesApi(appId, config)` — a REST client, same pattern as
  every other rotorua-guide data type except saved sites. Confirmed the
  `@blacksands/client/itineraries` subpath export resolves correctly in
  rotorua-guide's installed package (`node_modules/@blacksands/client/package.json`
  declares it). No new backend dependency, no security-rules concern like
  saved sites had.
- **The scheduling UI components are generic and already available.**
  `TimelineBlock`, `TransitBlock`, `TripChoiceSheet`, `EmptyItineraryState`
  are exported by `@blacksands/components` — the same shared package
  rotorua-guide already uses — confirmed present in
  `node_modules/@blacksands/components/dist/index.js`. Per direct
  instruction, these are reused as-is rather than rebuilt bespoke (unlike
  `StatusCard`/`ActionsCard` in the sites-restyle spec, these aren't tied to
  any "gamified checklist" framing — they're neutral grid/sheet UI, and will
  inherit the new palette once the theme plan lands).
  `ItineraryHeader` is also exported but aklguide never actually uses it
  (`plans.tsx` builds its header inline) — not used here either, for the
  same reason.
- **aklguide's `plans.tsx` is one large file** that is simultaneously the
  trip list, the "my trips" picker, and the day-timeline view, switched by
  local state (`selectedTripId`) rather than routing. This spec splits that
  into two focused routes instead (see Screens below) — this is new code,
  not a legacy file being preserved, so it follows this repo's existing
  one-screen-per-route convention rather than aklguide's single-file
  approach.
- **The physics/scheduling engine is pure, destination-agnostic logic.**
  `itineraryPhysics.ts`'s `runPhysicsEngine` (forward-cascade positions,
  clamps against the grid ceiling, reverse-cascades to resolve the clamp,
  relabels times) doesn't reference Auckland-specific data anywhere — it
  operates purely on slot indices and durations. Ports directly.
- **Transit time is a precomputed lookup, not live routing**, and it's
  Auckland-CBD-specific data rotorua-guide doesn't have. Per direct
  instruction, this spec uses a flat default gap for every stop pair —
  which is exactly aklguide's own fallback behavior for any pair *not* in
  its matrix, just applied universally instead of as a fallback. Same
  function signature, so a real matrix can be dropped in later without
  touching any call site.

## Scope

New:
- Data layer: `Itinerary`/`ItineraryDay`/`ItineraryItem` types, API client wiring, service, hook.
- `app/(app)/(tabs)/itinerary/index.tsx` — trip list/picker (replaces the stub).
- `app/(app)/(tabs)/itinerary/[itineraryId].tsx` — day timeline/scheduling grid.
- Modals: create trip, add-to-trip, edit item.
- "Add to Itinerary" integration on the site detail screen — real flow, not the placeholder.
- `lib/utils/itineraryPhysics.ts`, `lib/utils/transitMatrix.ts`.
- New dependency: `react-native-ui-datepicker`.

Explicitly out of scope (see Out of scope):
- A real Rotorua transit-time matrix.
- A Rotorua trip template.

Supersedes: the `Alert.alert` "+ Add to Itinerary" placeholder in the
sites-list-detail-restyle plan's Task 10
(`docs/superpowers/plans/2026-08-07-sites-list-detail-restyle.md`, not yet
executed). When both land, this feature's real flow replaces that
placeholder button.

## Data model

Add to `lib/models.ts` (same shape as aklguide's, verbatim — confirmed
accurate against `@blacksands/client`'s copy too, aside from two
server/admin-only fields aklguide's own frontend doesn't expose either):

```ts
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
```

## Data layer

- `lib/api/index.ts` — add:
  ```ts
  import { createItinerariesApi } from "@blacksands/client/itineraries";
  export const itinerariesApi = createItinerariesApi("rotoruaguide", { getToken });
  ```
  Standalone, same as aklguide — not folded into `hooksBag`.

- `lib/services/itineraryService.ts` — thin wrapper, same pattern as aklguide's:
  ```ts
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
  ```

- `lib/hooks/useItineraries.ts` — react-query hook, same returned shape as aklguide's:
  ```ts
  {
    itineraries: Itinerary[];
    loading: boolean;
    error: string | null;
    saveItinerary: (data: Partial<Itinerary>) => Promise<string | undefined>;
    deleteItinerary: (id: string) => Promise<void>;
    isSaving: boolean;
  }
  ```
  Query key `["rotoruaguide", "itineraries", uid]`, `enabled: !!uid` (guest
  users see the empty state, same as aklguide — itineraries require an
  account, matching how saved sites and reviews already work).

- `lib/constants/gameplay.ts` — new file:
  ```ts
  export const PLANNER = {
    SLOT_HEIGHT: 60,
    MAX_GRID_SLOTS: 28, // 8AM-10PM in 30-minute slots
    MAX_ITINERARIES: 3,
  } as const;
  ```
  Identical values to aklguide's — generic UX constants (grid time-window,
  max concurrent trips), no Rotorua-specific reason to change them.

- `lib/utils/transitMatrix.ts`:
  ```ts
  export function getRequiredTransitSlots(fromSiteId: string, toSiteId: string): number {
    if (fromSiteId === toSiteId) return 0;
    return 1; // flat default (30 min) -- see Out of scope
  }
  ```
  Same signature as aklguide's, so a real precomputed matrix can replace the
  body later without touching any caller.

- `lib/utils/itineraryPhysics.ts` — port aklguide's file directly at plan
  time (read `aklguide/mobile/lib/utils/itineraryPhysics.ts` and copy it in
  full — it's pure logic with no Auckland-specific data, only its import of
  `getRequiredTransitSlots` needs to resolve to rotorua-guide's version
  above). Contract:
  ```ts
  function slotsToDurationLabel(durationSlots: number): string; // "N Hour(s)"
  function slotIndexToTimeLabel(slotIndex: number): string;     // slot 0 = 8:00 AM, 30-min steps
  function runPhysicsEngine(items: ItineraryItem[]): ItineraryItem[];
  ```
  `runPhysicsEngine` is the core algorithm: forward-cascades sorted items
  (pushing each item's `slotIndex` right if the previous item's end time +
  transit gap overlaps it), clamps the last item to `MAX_GRID_SLOTS` if the
  cascade pushed it past the grid, reverse-cascades to resolve that clamp
  without dropping below slot 0, then relabels every item's `timeLabel`
  from its final position. Always returns the same number of items it was
  given (never drops one) and assumes the input is pre-sorted by
  `slotIndex`.

## Trip list/picker screen (`itinerary/index.tsx`)

Replaces the "Coming soon" stub. States:
- `itineraries.length === 0` → `components.EmptyItineraryState`, "Create Your First Trip" opens the create-trip modal.
- `itineraries.length === 1` → redirect straight into `itinerary/[itineraryId].tsx` for that trip (no picker step for the common case).
- `itineraries.length > 1` → a picker: cards per trip (title, date range, day count), tap to open `itinerary/[itineraryId].tsx`; "Create new trip" if under `PLANNER.MAX_ITINERARIES`.

New modal — `components/itinerary/CreateItineraryModal.tsx`:
- Props: `{ visible, onClose, onCreated: (id: string) => void }`.
- Trip name (optional, sensible default), start date via `react-native-ui-datepicker`, day count stepper (1–14) — no template option (see Out of scope).
- Client-side validates the new trip's date range doesn't overlap an existing trip's; also handles a 409 from the API as a fallback, same as aklguide.
- Calls `saveItinerary({ title, startDate, endDate, days })`, then `onCreated(id)`.

## Day timeline screen (`itinerary/[itineraryId].tsx`)

- Header: trip title, date range, a menu (switch trip / delete trip via `Alert.alert` confirmation).
- Horizontal day tabs (add/delete day; can't delete the only remaining day).
- Vertical slot grid for the selected day, `PLANNER.MAX_GRID_SLOTS` slots at `PLANNER.SLOT_HEIGHT`px each (8AM–10PM): `components.TimelineBlock` per item (drag-and-drop via its built-in `PanResponder` — `onDrop(itemId, requestedSlotIndex) => finalSlotIndex`, where this screen recomputes placement via `runPhysicsEngine` and returns the actual landing slot), `components.TransitBlock` rendered between consecutive items (returns `null` internally when the gap is 0, so no visual clutter for adjacent same-site-ish stops).
- Tapping an item opens the edit modal.
- Local-state-with-flush pattern, same as aklguide: drag/edit operations mutate local day/item state immediately (so the UI never stutters waiting on a network round-trip), and are flushed to `saveItinerary` on blur, on backgrounding, and on day switch — not on every single drag frame.
- On load, if the loaded trip has overlapping slots or unresolved dates, silently re-run `runPhysicsEngine` and re-save once (same auto-repair aklguide does, guarded so it only runs once per trip load).

New modal — `components/itinerary/EditItemModal.tsx`:
- Props: `{ item: ItineraryItem | null, currentDayId: string, availableDays: { id: string; label: string }[], onClose, onSave: (itemId: string, newDurationSlots: number) => void, onRemove: (itemId: string) => void, onMoveDay: (itemId: string, newDayId: string) => void }`.
- Shows the site's image/name, a link to its detail screen, a duration stepper, a "move to another day" picker (excludes the current day and any day already at capacity), Save/Remove.

## Add-to-Itinerary integration (site detail screen)

Replaces the placeholder from the sites-restyle plan. Same branching logic
as aklguide's site detail FAB:
- 0 itineraries → open `CreateItineraryModal` directly; on create, open `AddToTripModal` for the new trip.
- 1 to `MAX_ITINERARIES - 1` itineraries → open `components.TripChoiceSheet` ("add to existing" vs "create new"), branching into the appropriate modal.
- `MAX_ITINERARIES` itineraries → open `AddToTripModal` directly (no room to create another).

New modal — `components/itinerary/AddToTripModal.tsx`:
- Props: `{ site: { id: string; name: string; imageUrl?: string } | null, onClose, initialItineraryId?: string }`.
- Pick itinerary (if more than one), pick day, pick a rough time-of-day (morning/midday/afternoon/evening → fixed starting slot, same mapping as aklguide's), duration stepper.
- Builds the new `ItineraryItem`, inserts it into the day, runs `runPhysicsEngine`, rejects with an inline error if the trip is already full past `MAX_GRID_SLOTS`.
- On success, navigates to `itinerary/[itineraryId]` with params to jump/scroll to the new item's day and slot.

## New dependency

`react-native-ui-datepicker` — added per direct instruction, used only in
`CreateItineraryModal` for start-date selection.

## Out of scope

- A real Rotorua site-to-site transit-time matrix — `getRequiredTransitSlots` uses a flat default for every pair (see Data layer). Swappable later without touching call sites.
- A curated Rotorua trip template — `CreateItineraryModal` only offers manual day-count entry, no template picker.
- Amending the sites-list-detail-restyle plan's file to remove its placeholder — that plan hasn't executed yet; when both are implemented, wire this feature's real flow in place of that plan's `Alert.alert` placeholder instead of editing the unexecuted plan document.
- `ItineraryHeader` from `@blacksands/components` — unused, matching aklguide's own choice (its header is hand-built inline).

## Verification

No automated tests apply to this scheduling UI. Manual walk after
implementation:
- Create a trip, add several sites via "Add to Itinerary" from different site detail screens, confirm branching logic (create/choice-sheet/add-directly) matches trip count.
- Drag items within the grid: overlapping placements resolve via the physics engine without items disappearing or duplicating; dragging past the grid ceiling clamps and reflows correctly.
- Transit blocks render between consecutive items with the flat default gap; don't render (return `null`) when the gap is 0.
- Edit an item's duration, move it to another day, remove it — grid updates correctly in all three cases.
- Kill and reopen the app mid-trip-edit: unsaved local changes flushed on backgrounding are present; changes made and immediately backgrounded without waiting are not lost.
- Delete a day (when more than one exists); confirm the last remaining day can't be deleted.
- Switch trips and delete a trip; confirm the picker/redirect-to-single-trip logic in `itinerary/index.tsx` behaves correctly as trip count changes (0 → 1 → many → back down).
- Guest session sees the empty state / sign-in prompt rather than a crash (itineraries require an account).
