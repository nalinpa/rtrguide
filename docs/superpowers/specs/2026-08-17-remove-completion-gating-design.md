# Remove completion/check-in gating — design

## Context

The completion/check-in system (`useMyCompletions`, `useCheckIn`, `useGPSGate`,
`useTrackingStore`, `useNearestUnvisited` — all from the shared
`@blacksands/hooks` package, re-exported unchanged via `lib/hooksBag.ts`)
currently drives, across five files:

- `components/site/detail/SiteActionsBar.tsx` — the GPS check-in button
  ("I'm Here" / "Mark as Done"), the "Completed" card, review-gating, and the
  "Share a Photo" button.
- `app/(app)/(tabs)/sites/[siteId]/index.tsx` — `useMyCompletions`
  (`completedLocationIds`/`pendingLocationIds`/`sharedLocationIds`),
  `useCheckIn` + `handleCheckIn` (GPS accuracy gate, offline sync),
  `useTrackingStore` (`isTracking`/`startTracking`/`stopTracking`/
  `triggerSuccessUI` — the check-in animation), the `isSyncing` offline-sync
  banner.
- `app/(app)/(tabs)/sites/index.tsx` — `useMyCompletions` loading state on
  the list screen.
- `app/(app)/(tabs)/map/index.tsx` — `completedLocationIds` driving pin
  coloring (`pinCompleted` style) and `useNearestUnvisited` routing.
- `lib/hooksBag.ts` — re-exports the above from `@blacksands/hooks`.

This spec removes RTR's app-side usage and UI for all of it. **Constraint:**
`@blacksands/hooks` is shared with sibling apps (e.g. AKL Guide) — it is not
touched, and its hooks are allowed to become unused/unimported in this app.
`lib/hooksBag.ts` itself needs no edits (its re-export list stays as-is;
several hooks such as `useGPSGate` and `useNearestCheckpoint` stay exported
for other/no current use).

There's a separate worktree/branch (`worktree-photo-share`) building a real
photo-share feature on top of the completion-gated Share button. Per
decision, this spec proceeds independently and ignores that branch — it will
reconcile separately when it merges.

Decisions made during brainstorming:

- GPS check-in is removed entirely — no button, no gating, no hook calls, no
  animation. Not "kept but ungated."
- Review submission becomes always available (no completion prerequisite).
- The "Share a Photo" button is kept, but always enabled — no "already
  shared" success state (that data no longer exists app-side).
- The map keeps its "nearest location" overlay card, simplified rather than
  removed — pins render uniformly (no completed/uncompleted distinction).

## `components/site/detail/SiteActionsBar.tsx`

Currently a three-state component: not-completed (check-in button),
syncing (offline banner), completed (review + share card). Collapses to one
steady state — every visitor sees the same UI regardless of visit history.

New props (drops `id`, `title` — already unused in the current component
body — plus every completion/check-in prop):

```ts
type SiteActionsBarProps = {
  hasReview: boolean;
  myReviewRating?: number;
  myReviewText?: string;
  onOpenReview: () => void;
  onShareBonus: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
};
```

Removed: `completed`, `completionMode`, `isSyncing`, `locStatus`, `hasLoc`,
`canCheckIn`, `onCheckIn`, `shareBonus`.

Render structure: the save row (unchanged) followed by a single card
containing:

1. The review box — unchanged internal logic (`hasReview` ? show rating +
   text : "+ Log your review & rating" button calling `onOpenReview`).
2. A "Share" row — always renders the primary "Share a Photo" button
   (`Camera` icon, calls `onShareBonus`), never disabled, never shows the
   `CheckCircle`/"Photo Successfully Shared" state.

The outer "Completed" header (`CheckCircle` icon + "Completed" title) is
deleted outright, not replaced — it announced check-in state that no longer
exists, and is redundant with the review box's own "Your Experience" label.
The `isSyncing` offline-sync banner branch is deleted entirely (dead: nothing
produces that state anymore).

## `app/(app)/(tabs)/sites/[siteId]/index.tsx`

Removed entirely, plus everything downstream of each:

- `hooksBag.useMyCompletions(uid)` and its results (`completedLocationIds`,
  `pendingLocationIds`, `sharedLocationIds`, `compsLoading`) — including
  `compsLoading` from the top-level loading gate (currently `entityLoading
  || compsLoading || session.status === "loading" || entitlementsLoading`).
- `isCompleted`, `isSyncing`, `hasShareBonus` derived constants.
- `hooksBag.useUserLocation()` (`userCoords`, `locErr`, `refreshLocation`)
  and the derived `locStatus` — nothing on this screen needs location once
  check-in is gone.
- `hooksBag.useGPSGate(site, userCoords)` (`gate`) — only ever fed
  check-in.
- `hooksBag.useCheckIn()` (`checkIn`), `checkInInFlight` ref, the
  `handleCheckIn` function.
- `hooksBag.useTrackingStore()` destructure (`isTracking`, `targetId`,
  `targetName`, `startTracking`, `stopTracking`, `triggerSuccessUI`), plus
  `isTargetingThis`, `isTrackingSomethingElse`, and `handleStartTracking`
  (already dead — defined but never called in the current file).
- The `AppState` "refetch location on foreground" `useEffect` and
  `MAX_ACCURACY_METERS` constant — both existed only to keep GPS accuracy
  fresh for check-in.
- The `err` state, its 10-second auto-clear `useEffect`, and the
  "Check-in Issue" `ErrorCard` render — the only thing that ever set `err`
  was `handleCheckIn`.

Kept, with one change: `components.ReviewsSummaryCard` gets `isCompleted={true}`
(a literal, always-true value — reviews are now always available) in place
of the removed `isCompleted={isCompleted}`. `hasUserReviewed`, `onAddReview`,
`onViewAll`, `ratingCount`, `avgRating` stay as they are.

`SiteActionsBar` call site shrinks to match its new prop type: `hasReview`,
`myReviewRating`, `myReviewText`, `onOpenReview`, `onShareBonus` (still
routes to `/share-frame` with `entityId`/`entityName`), `isSaved`,
`onToggleSave` (its premium-entitlement check is unrelated to completion and
is untouched).

## `app/(app)/(tabs)/sites/index.tsx`

One-line change: drop the `hooksBag.useMyCompletions(...)` call and remove
`compLoading` from the top-level loading condition (currently
`entitiesLoading || session.status === "loading" || compLoading ||
entitlementsLoading`).

## `app/(app)/(tabs)/map/index.tsx`

Drop `const { completedLocationIds } = hooksBag.useMyCompletions(uid);`.

`useNearestUnvisited` still gets called (kept per decision) but with a
stable empty set instead of real completion data, so the overlay card
becomes "nearest location" rather than "nearest unvisited location":

```ts
const NO_COMPLETIONS = new Set<string>(); // module scope, stable reference
// ...
const nearestUnvisited = hooksBag.useNearestUnvisited(visibleLocations, NO_COMPLETIONS, loc);
```

`TrackedMarker`'s `completed` prop is required (not optional) on the shared
component, so it's passed as a literal `completed={false}` for every marker
instead of `completedLocationIds.has(location.id)`. The `renderMarker`
callback drops its `state.completed && styles.pinCompleted` conditional, and
the now-unreachable `pinCompleted` style is deleted from the stylesheet. All
pins render identically.

## `lib/hooksBag.ts`

No changes. `useMyCompletions`, `useCheckIn`, `useTrackingStore` become
unused/unimported by the app; `useGPSGate` stays imported (still used by
`map/index.tsx` for the selected-marker distance overlay, unrelated to
check-in gating); `useNearestUnvisited` stays imported (now fed an empty
set); `useNearestCheckpoint` was already unused before this change and stays
that way.

## Out of scope

- `app/share-frame.tsx` and its route registration in `app/_layout.tsx` —
  unaffected either way, since the Share button is kept (always enabled),
  not removed.
- The `worktree-photo-share` branch — proceeds independently, reconciles
  separately when it merges.
- Any change to `@blacksands/hooks` or `@blacksands/components` (sibling
  package, used by other apps).
- Server-side/API completion tracking (whatever backs `useMyCompletions`/
  `useCheckIn` remotely) — this spec is app-side UI/usage only.
