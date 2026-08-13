# Changes since plop generation

Baseline: `fffa294` "Initial commit" (plop/blacksands scaffold, 2026-08-05).
Everything below was added by hand after that.

## Committed (25 commits, `fffa294..HEAD`)

**Profile / Account restyle**
- `32c9db6` restyle profile page to match aklguide's editorial layout
- `b95167a` add DangerZoneCard
- `0a3b89e` add SavedSitesCard
- `b7c1015` add ItinerariesCard
- `7f2a373` add UserInfoCard
- `2a82070`, `0c8d708` design spec + implementation plan docs

**Itinerary feature**
- `42d0985` wire real Add to Itinerary flow, replacing placeholder
- `f007214` add AddToTripModal
- `36f84eb` add EditItemModal, wire into timeline screen
- `588c99f` wire drag-and-drop, save-flush, auto-repair into timeline screen
- `45963bf` add day timeline screen (static grid rendering)
- `d45c89a` replace itinerary stub with trip list/picker screen
- `642d064` add CreateItineraryModal
- `3d2162b` add deps: expo-crypto, react-native-ui-datepicker, dayjs
- `a3ef421` add itinerary API client, service, useItineraries hook
- `9c914b9` port itinerary scheduling physics engine + transit matrix
- `21592f4` add itinerary data model + planner constants
- `421876b`, `1cfed50` implementation plan + design spec docs

**Theme**
- `e775978` swap app color palette to light Rotorua theme
- `ed3b7bb` match splash/adaptive-icon background to new theme
- `38cccbc` design spec doc

**Sites list/detail restyle (spec only, committed)**
- `ebc9287` update spec: real search + saved sites, region/itinerary placeholders
- `0dde95d` design spec doc

## Uncommitted (working tree)

**Tracked file changes**
- `app/(app)/(tabs)/_layout.tsx` — normalize route names (strip `/index`) so tab-bar active-state and navigation match nested routes
- `app/(app)/(tabs)/itinerary/[itineraryId].tsx`, `itinerary/index.tsx` — tweaks
- `app/(app)/(tabs)/map/index.tsx` — +118 lines
- `app/(app)/(tabs)/sites/index.tsx` — +310 lines (real search / saved sites wiring per spec above)
- `eas.json` — new, EAS build config
- `lib/firebase.ts` — add Firestore (`export const db = getFirestore(app)`)
- `lib/providers/AppProviders.tsx` — exclude `savedSites` query from AsyncStorage persistence (its data is a `Set`, which JSON can't round-trip through the persister — was rehydrating as `{}`, breaking `.has()`/`.size` app-wide after relaunch)
- `lib/hooks/useItineraries.ts` — expose `refetch` from the query; log real error + distinguish 401 ("session expired") from generic load failure (was swallowing every error into one generic message)
- `lib/hooksBag.ts` — type `createHooks<Site>` instead of untyped
- `lib/uiKit.ts` — export `boundingRegionFrom` from `@blacksands/components`
- `package.json` / `package-lock.json` — dependency changes

**Untracked (new) files**
- `app/(app)/(tabs)/sites/[siteId]/reviews.tsx` — reviews screen
- `app/(app)/saved-sites.tsx` — saved sites screen
- `components/site/detail/SiteHero.tsx`, `SiteActionsBar.tsx`
- `components/site/list/SiteListItem.tsx`, `SitesListView.tsx`
- `lib/constants/firestore.ts`
- `lib/hooks/useSavedSites.ts`
- `docs/superpowers/plans/2026-08-07-app-theme-update.md`
- `docs/superpowers/plans/2026-08-07-sites-list-detail-restyle.md`

## Known issues / action items

**Itinerary list fails to load ("Couldn't load your trips")**
- Root cause: `enginev1/api` (blacksands backend, separate repo) — `GET /v1/:appId/itineraries` runs a Firestore query filtering `userId ==` and ordering by `updatedAt DESC`; Firestore needs a composite index for that combination and it doesn't exist yet. Confirmed via backend logs: `Error: firestore runQuery 400`.
- Not fixable from this repo — no code change needed either, just infra.
- Fix: Firebase Console → Firestore → Indexes → Composite → Add Index
  - Collection: `itineraries` (check `cfg.collections.itineraries` in that app's config; falls back to `"itineraries"`)
  - Fields: `userId` Ascending, `updatedAt` Descending
  - Query scope: Collection

## Summary by area
- **Auth/scaffold** (login, `_layout`, firebase config) — from plop, largely untouched.
- **Profile/Account** — fully restyled, componentized (Danger Zone, Saved Sites, Itineraries, User Info cards).
- **Itinerary** — built out from stub to full feature: data model, physics/scheduling engine, transit matrix, CRUD hooks, trip list, day timeline w/ drag-and-drop, add/edit modals.
- **Theme** — palette swapped app-wide to light Rotorua theme; icons/splash matched.
- **Sites** — list/detail restyle in progress (uncommitted): search, saved sites, reviews screen, new `components/site/*` split.
- **Infra** — Firestore added, EAS build config added, misc dependency/type bumps.
