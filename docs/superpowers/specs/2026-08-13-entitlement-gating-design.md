# Entitlement gating — design

## Context

Purchase → entitlement plumbing is live end-to-end (storefront → commerce-api
webhook → purchase doc → claim-link email → `app/claim/[token].tsx` →
entitlement doc at `apps/rotoruaguide/entitlements/{uid}`), confirmed with a
real Stripe test-mode purchase and a real device claim. Nothing in the app
actually reads it yet. This spec wires it into the real screens.

Already built and ready to use, no changes needed to any of these:

- `useEntitlements(uid)` (`@blacksands/hooks`) → `{ loading, err,
  entitledProductIds: Set<string> }`, already re-exported from
  `rotorua-guide/lib/hooksBag.ts` as `hooksBag.useEntitlements`.
- `RequirePurchaseCard` (`@blacksands/components`), already registered in
  `createComponents.ts` and available as `components.RequirePurchaseCard`
  via `lib/uiKit.ts`. Presentational gate: renders `children` if
  `entitledProductIds.has(productId)`, else a lock card with a buy CTA.
- `client.entitlements.list()` / `.claim(token)` (`@blacksands/client`).

Single SKU throughout — "full guide unlock" — not multiple products/tiers.

## Purchase flow boundary (out of scope here)

**Native in-app purchase (StoreKit) is required** — Apple guideline 3.1.1
blocks linking out to web checkout for unlocking in-app digital content.
That integration (client-side StoreKit + App Store Connect setup) is a
separate spec. commerce-api's IAP backend already exists
(`routes/iap.ts`, `webhooksApple.ts`) so that spec doesn't need new backend
work either.

This spec treats every `onBuy` callback as a stub:

```ts
() => Alert.alert("Unlock Full Guide", "Purchasing from the app is coming soon.")
```

Same idiom already used in this codebase for unbuilt actions (see
`openRegionPlaceholder` in `sites/index.tsx`). No purchase trigger, no
checkout link, no StoreKit call is designed here — this is just the seam the
IAP spec wires into later.

## Shared constant

New file `lib/constants/commerce.ts`:

```ts
export const FULL_GUIDE_PRODUCT_ID = "full-guide-unlock";
```

Placeholder id — the real Stripe/IAP product id is confirmed by the IAP
spec; this spec only needs a stable string to check `entitledProductIds`
against.

## Gate 1 — Itinerary (whole-tab gate)

Screens: `itinerary/index.tsx`, `itinerary/[itineraryId].tsx`.

Both already call `useSession()`. Add `hooksBag.useEntitlements(uid)`
(`uid = session.status === "authed" ? session.uid : null`). Check order,
each screen:

1. `session.status === "loading"` → existing loading spinner (unchanged).
2. `session.status === "guest"` → existing "Sign In to Plan a Trip" card
   (unchanged) — entitlement is meaningless without an account.
3. `entitlementsLoading` → same loading spinner as (1) (see Loading UX below).
4. `!entitledProductIds.has(FULL_GUIDE_PRODUCT_ID)` → wrap the screen's real
   content in `components.RequirePurchaseCard` (`productId:
   FULL_GUIDE_PRODUCT_ID`, `onBuy`: the stub above). The whole trip
   list/timeline is the gated content — not a per-action gate.
5. Otherwise → renders exactly as today.

## Gate 2 — Saved sites (action-point gate, not screen-level)

Only one call site ever passes `isSaving: true` to `toggleSavedSite`:
`sites/[siteId]/index.tsx:216`, `SiteActionsBar`'s `onToggleSave`. That's the
single choke point — gate the action, not the screen.

```ts
onToggleSave={() => {
  if (!isSaved && !entitledProductIds.has(FULL_GUIDE_PRODUCT_ID)) {
    Alert.alert("Premium Feature", "Saving sites requires the full guide unlock.");
    return;
  }
  toggleSavedSite({ siteId: id, isSaving: !isSaved });
}}
```

- Only the save direction is gated. Un-saving (`isSaving: false` — swipe-to-
  remove in `saved-sites.tsx`) is never blocked.
- `saved-sites.tsx` itself gets **no changes**. Non-entitled users simply
  can never add anything, so the screen naturally shows its existing empty
  state. No `RequirePurchaseCard`, no entitlement check added there.
- `account.tsx` and `SavedSitesCard` only read `savedSiteIds` — unaffected.

## Gate 3 — Site-level (`isPremium`)

### Data model

`lib/models.ts`, add one optional field to `Site`:

```ts
export type Site = {
  // ...existing fields
  isPremium?: boolean;
};
```

No API change — site docs are schema-less Firestore passthrough
(`enginev1/api/src/routes/locations.ts`), so this is additive only.
Existing docs without the field are treated as free (falsy). Docs are
edited directly (same as every other site field today — no CMS/admin UI
exists or is being built here).

### List / map / search — teaser stays visible

Locked sites keep showing in list, map, and search with full name,
thumbnail, and category — never hidden. Add a small lock badge:

- `SiteListItem` gets a new `isPremium?: boolean` prop → renders a small
  lock icon/pill on the card when true, so a user can tell before tapping.
- Callers (`sites/index.tsx` via `SitesListView`, `saved-sites.tsx`) pass
  `site.isPremium` through.
- Map pins: no change. Cosmetic-only concern, deferred — the real gate is
  enforced at the detail screen regardless of entry point (list, map, saved,
  or a deep link all route through `sites/${id}`), so an un-badged pin is
  not a gating gap, just a slightly less informative pin.

### Detail screen — locked content swap

`sites/[siteId]/index.tsx` doesn't call `hooksBag.useEntitlements` yet —
add it alongside the existing hooks (`uid` from `session`, same as other
screens).

After the existing `entityLoading || compsLoading || session.status ===
"loading"` guard (extended to include `entitlementsLoading` — see Loading
UX), add:

```ts
const isLocked = site.isPremium && !entitledProductIds.has(FULL_GUIDE_PRODUCT_ID);
```

When `isLocked`, render the hero image and site name (so the screen doesn't
feel broken) plus `components.RequirePurchaseCard` as the paywall, and
**nothing else** — no description, no `ReviewsSummaryCard`, no
`SiteActionsBar` (no check-in, no save, no share), no "Add to Itinerary".
When not locked, the screen renders exactly as it does today.

### Reviews route — same lock, reachable independently

`sites/[siteId]/reviews.tsx` is a separate route
(`sites/${id}/reviews`) and doesn't fetch the site doc today — under normal
navigation it's only reached via the detail screen's `ReviewsSummaryCard`,
which is already hidden when locked, but it's a real route and can be
reached by a direct/deep link, so it needs the same check independently
rather than relying on the detail screen to gatekeep it.

Add `hooksBag.useLocation(id)` and `hooksBag.useEntitlements(uid)` to this
screen. If `site.isPremium && !entitledProductIds.has(FULL_GUIDE_PRODUCT_ID)`,
redirect back (`goBack()`, already defined) instead of rendering the review
list.

## Loading UX

Block, don't flash. Every gate above folds `entitlementsLoading` into the
screen's existing top-level loading condition (the same `LoadingState`
already shown for `session.status === "loading"` / other in-flight data) —
gated content and the paywall card only ever render once the entitlement
check has resolved. No optimistic render-then-revoke.

## Out of scope

- Building the actual purchase trigger (StoreKit, checkout, `onBuy`
  behavior) — separate IAP spec.
- Any admin/CMS tooling for setting `isPremium` — direct Firestore edit,
  same as every other site field.
- Map pin lock badges — cosmetic follow-up, not a gating requirement.
- Gating `map/index.tsx` itself — it only navigates to the site detail
  route, which already enforces the gate.
