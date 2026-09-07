# Remaining work before publish

Snapshot taken 2026-08-28. Tests green (16 suites / 83 tests), typecheck clean.

## Manual QA — 2026-09-05 bug fixes

Code review turned up 12 bugs, each fixed in its own commit (`121e33a`..`ac8df0a`, `59f501a`). None of these have been exercised on a real device yet — check each before shipping.

- [ ] **Delete-trip confirmation** (`121e33a`) — open a trip, tap the header "...", tap "Delete Trip". Confirm a "Delete Trip? This cannot be undone." alert appears before anything is deleted; Cancel keeps the trip, Delete removes it and returns to the trip list.
- [ ] **Account-tab entitlement cap** (`963599f`) — as a non-entitled (non-purchased) account with 1 existing itinerary, confirm the Account tab's "New Itinerary" button is hidden, matching the Plans tab. As an entitled account, confirm you can still create up to `PLANNER.MAX_ITINERARIES` (3) trips from the Account tab.
- [ ] **Failed day-move no longer silently discarded** (`3453691`) — start a day-to-day item move, kill network mid-save (airplane mode), background/foreground the app to trigger a refetch. Confirm the move isn't silently reverted — some error should surface rather than the item quietly snapping back with no explanation. (Awkward to force reliably; a code walkthrough may substitute for a full repro.)
- [ ] **Add Day keeps endDate in sync** (`4c3fde5`) — open a trip, tap "Add Day", then go back to My Trips (need 2+ trips to see the picker). Confirm the trip's displayed date range now includes the newly added day.
- [ ] **Map re-render loop fixed** (`242b30a`) — on the Map tab, search until exactly one result remains. Confirm the map doesn't jank/flicker/reselect repeatedly (Perf monitor or just visual smoothness works).
- [ ] **Saved-site name fallback** (`c7fd99e`) — save a site, then mark that site `active: false` in Firestore (or via an admin script). Confirm the Account tab and the full Saved Places list show "Unavailable" instead of a raw Firestore doc id.
- [ ] **Onboarding tour spotlight for existing trips** (`3b12f9f`) — reset the app-open counter / reinstall on an account that already has 2+ itineraries, trigger the first-open tour, and confirm the "Plan Your Days" step highlights the My Trips header instead of showing a blank centered card.
- [x] **Sentry DSN actually reaches builds** (`cb50ccd`) — confirmed on a real dev-profile EAS build (2026-09-06): manual test event landed in the `patel-td` Sentry org. Test button removed from the Account tab.
- [ ] **Guide not-found state** (`abb3b5a`) — manually navigate to `/guide/does-not-exist` (or an old/removed slug). Confirm a "Guide Not Found" card with a Go Back button appears instead of a blank page.
- [ ] **Inactive-but-saved sites stay reachable** (`4045abf`) — save a site, mark it `active: false`, open the full Saved Places screen (not just the Account tab preview). Confirm the site still appears (name resolved, not id) and swipe-to-remove still un-saves it correctly.
- [ ] **Location-denied banner restored** (`ac8df0a`) — deny location permission for the app, open the Sites tab. Confirm a "Location Disabled" card appears with an "Open Settings" button that opens the OS settings app.
- [ ] **Map marker settle timing rework** (`59f501a`) — on a real device (ideally an older/slower one), open the Map tab and pinch-zoom rapidly and repeatedly across cluster boundaries. Confirm markers/clusters never freeze on a blank or default icon — this replaced a fixed 700ms timer with an onLayout+rAF-based settle, and needs on-device confirmation since it touches native marker rasterization.
- [x] **Clustering silently broken since `96ce2ad`** (found 2026-09-06 on first real device test) — `renderedMarkers` wrapped each site marker in a `SiteMapMarker` component instead of a raw `<Marker coordinate=.../>`. `react-native-map-clustering`'s `isMarker()` check reads `child.props.coordinate` directly off the element passed as a child of `ClusterMapView`, not off whatever that element renders internally — so every marker failed the check and clustering silently no-op'd (all markers rendered individually, ungrouped) for two days across 3 commits before anyone tested on a physical device. Fixed in [components/map/SitesMapView.tsx](components/map/SitesMapView.tsx) by passing `coordinate` through as an explicit prop on `SiteMapMarker` itself. Re-verify clustering visually on-device.

## Content

- [x] Add "Stay" sites (category already exists in `lib/models.ts` — this is data entry, not code)
- [x] Add "Food & Drink" sites (category already exists — data entry)
- [ x ] Set up a photo storage bucket (no Firebase Storage / bucket integration currently in the app — `imageUrl`/`imageThumbnailUrl` on `Site` exist but nothing populates or uploads to a bucket today)
- [x] Source and upload photos for sites, wire into the bucket above
- [x] Rewrite site content (descriptions/copy) now that every site has an entry — all 89/89 descriptions rewritten and pushed to Firestore via `scripts/update-site-descriptions.js` (Fat Dog Cafe filled in and re-pushed). 2nd pass done 2026-09-01.
- [ ] Review all site data in Firestore (descriptions, price, website, category, photos) for accuracy and completeness before launch

## Features

- [x] Add `price` (free text, e.g. "$15" / "Free" / "$$") and `website` fields to `Site` in [lib/models.ts](lib/models.ts) and display on the site detail screen ([app/(app)/(tabs)/sites/[siteId]/index.tsx](app/(app)/(tabs)/sites/%5BsiteId%5D/index.tsx)) — schema + display done, content entry is separate (see below)
- [x] Enter `price` data for sites — 93/93 written via `scripts/update-prices.js` using label tiers (`Free`/`Budget`/`Mid-range`/`High-end`/`Blowout`, matches how `site.price` just renders as raw text on the detail screen).
- [x] Website link UTM params — `utm_source=blacksands.app&utm_medium=rotorua app&utm_campaign=ios_link` appended in `handleOpenWebsite` before `Linking.openURL`
- [x] First-open app tour — spotlight walkthrough across all 4 tabs, triggered on `openCount === 1` (see [lib/tour/](lib/tour/)), no new dependency (react-native-svg mask + reanimated, both already installed). Untested on-device — worth a real run-through before launch to check spotlight/tooltip positioning on an actual phone
- [x] Tour could auto-start over the login screen — `TourAutoStart` only checked `openCount`, not session state. Gated behind a new `TourAutoStartGate` reading `useSession()` (`c330273`, 2026-09-07)
- [x] Guide styling/placement — dropped the separate `GuideCard` account-tab row in favour of the existing hero promo card ("Discover Rotorua / Your guide to...") on the account screen; its CTA now opens `/(app)/guide` instead of Browse All Sites ([account.tsx:56-63](app/(app)/(tabs)/account.tsx#L56-L63)), inheriting the promo card's styling. Guide index/detail screens also got a per-category icon + accent color pass ([guideContent.ts](lib/guideContent.ts), [guide/index.tsx](app/(app)/guide/index.tsx), [guide/[slug].tsx](app/(app)/guide/%5Bslug%5D.tsx)) — no photos (none exist yet), icon+color chips/hero bands only
- [x] Run the transit matrix generator — [assets/data/rotorua-transit.json](assets/data/rotorua-transit.json) is populated (74 sites, real driving times via the Distance Matrix API), `getRequiredTransitSlots` now returns real slot counts instead of the flat 1-slot fallback for any pair in the file

## Free / comp unlock codes

- [x] Admin-mintable free-unlock claim links — `POST /v1/admin/comp-links` in `commerce-api` (2026-09-06), reuses the existing `claimTokens`/`/claim/:token` redemption path this app already handles, zero client changes needed. No admin UI yet — minting one today means calling the endpoint directly (curl/Postman) with an admin bearer token.

## Review prompts

Only trigger today is first itinerary created ([lib/hooks/useItineraries.ts:38-40](lib/hooks/useItineraries.ts#L38-L40)), via `hooksBag.useReviewPrompt().requestReview()` (OS-throttled, so adding more call sites just adds chances, not actual prompt spam). Add:

- [x] First successful purchase — [lib/iap/PurchaseProvider.tsx](lib/iap/PurchaseProvider.tsx) `completePurchase`, success path (~line 88-90)
- [x] First review submitted — site detail screen, `saveReviewToDb` success (`res.ok` branch, ~line 246)
- [~] ~~Share card created/shared~~ — **cancelled**
- [x] 2nd app open — [lib/hooks/useAppOpenCount.ts](lib/hooks/useAppOpenCount.ts) tracks launch count generically (AsyncStorage-persisted), wired into [app/_layout.tsx](app/_layout.tsx); fires `requestReview()` when count hits 2. Kept general-purpose (count, not a boolean) so it can also drive a first-open app tour later (`openCount === 1`) — **tour itself not built yet, only the counter**

## Store compliance (will block App Store / Play review)

- [x] Add an in-app account-deletion flow that also **revokes the Apple token** — client side done: `appleSignIn.ts` now persists the Apple refresh token server-side on sign-in (ca880e1), `userService.deleteAccount` calls the server-side `client.auth.deleteAccount()` instead of client-side `deleteUser` "so Apple revocation always runs" (946fa0d), and it signs out locally after (`auth.signOut()`) since the server-side delete doesn't clear local SDK session state (a721645). Actual revoke-on-Apple's-servers happens in the `enginev1/api` backend — out of scope to verify here ([[feedback_no_cross_repo_edits]]); worth a quick confirm with whoever owns that repo that the revoke call is implemented before relying on this for App Store review.
- [x] Privacy Policy page live at **https://blacksands.app/rotorua-guide#privacy** (`public/rotorua-guide.html` in the `blacksands` repo, deployed) — paste this URL into App Store Connect's Privacy Policy field. No hero screenshot yet (`app-detail-hero__visual` block omitted) — add one later, no restructuring needed. Nothing in the *rotorua-guide* app itself links to this page yet — consider adding a link from the account/settings screen too.
- [x] Terms of Service added at **https://blacksands.app/rotorua-guide#terms** (custom, not just Apple's default EULA — covers the one-time IAP, content accuracy, location-based check-ins, user content, termination, NZ governing law)
- [ ] Confirm IAP products (`expo-iap`) are actually created and approved in App Store Connect / Play Console — `usePurchase(productId)` takes the id from the caller, no product IDs hardcoded here to audit against
- [ ] Test a real purchase end-to-end on a real device — tapping Buy currently does nothing (no spinner, no error). Native IAP doesn't work in Expo Go or the iOS Simulator at all, so this needs a dev-client or TestFlight build on a physical device with a sandbox tester configured in **Settings → App Store → Sandbox Account** (separate from any real Apple ID). Unconfirmed whether the "nothing happens" is just Expo Go/simulator or a real bug — can't tell until tested on a proper build.

## iOS

- [x] `GoogleService-Info.plist` is untracked **and not in `.gitignore`** — one `git add` away from committing a Firebase secret to the repo. Add it to `.gitignore` (CI already injects it from `secrets.GOOGLE_SERVICES_IOS`)
- [x] Fix Sentry org placeholder in [app.config.ts](app.config.ts) — set to `patel-td` (same org as aklguide)
- [x] `EXPO_PUBLIC_SENTRY_DSN` set as a real value — confirmed reaching a real dev-profile EAS build (2026-09-06), test event landed in the `patel-td` Sentry org. See "Sentry DSN actually reaches builds" above for the same confirmation.
- [x] Firebase iOS app registration matches bundle ID — verified `GoogleService-Info.plist` `BUNDLE_ID` = `app.blacksands.rtrguide`, matches `app.config.ts`. 2026-09-06.
- [ ] Associated domains — nothing to build here, `applinks:commerce.blacksands.app` in [app.config.ts](app.config.ts) is already correct (proven working on `commerce-staging.blacksands.app`: resolves, serves a correct AASA with `F2XZ7YY2X7.app.blacksands.rtrguide` + `/claim/*`). Blocked entirely on the commerce-api production deploy (tracked in `enginev1/TASKS.md`, not here) — production `commerce.blacksands.app` doesn't resolve yet, so claim/comp-unlock links open Safari instead of the app until that ships. Once it's deployed and DNS points at it, just re-curl the AASA URL to confirm, no code change expected.

## Observability & security review

- [x] Review Firestore security rules (2026-09-06) — the deployed rules were still Firebase's default test-mode ruleset: open read/write to the entire database for anyone, hard-expiring to deny-all on 2026-10-05. Replaced with real rules ([firestore.rules](firestore.rules)) matching actual access patterns — `users/{uid}` own-doc read/write (the only collection the app writes to directly), `itineraries` own-`userId` read only, `sites`/`siteReviews` public read, everything else (including all writes) deny-by-default since real writes go through `enginev1/api`'s admin-authenticated backend anyway — and deployed via `firebase deploy --only firestore:rules`. Also fixed a bug this exposed in `enginev1/api`'s `getDocument` (403 wasn't handled like 404, would have 500'd `GET /itineraries/:id` for a non-owned id once real rules went live).
- [x] Replace `console.log`/`console.error` calls with Sentry logging now that `EXPO_PUBLIC_SENTRY_DSN` is actually wired up (2026-09-05) — added `Sentry.captureException` alongside the existing console calls in [claim/[token].tsx](app/claim/%5Btoken%5D.tsx) (×2), [useItineraries.ts:24](lib/hooks/useItineraries.ts#L24), and [RestorePurchasesCard.tsx:20](components/account/RestorePurchasesCard.tsx#L20). `appleSignIn.ts`/`shareService.ts` already did both. Also added a temporary "Send test error to Sentry" button on the Home tab (not `__DEV__`-gated, since it needs to work in the preview/production bundle) — confirmed on a real EAS build (2026-09-06, event landed in `patel-td`), button removed (`7100aaf`, 2026-09-07).

## Repo hygiene

- [x] Large uncommitted diff on `main` — reviewed and split into 5 commits (deps, Google Sign-In, sites/map feature work, test coverage, gitignore/tracker)

## Known open issues (carried from memory)

- [ ] `@blacksands/client` package publish is broken in its own CI (403 on `write_package`) — if site content changes require a new `@blacksands/client`/`@blacksands/components`/`@blacksands/hooks`/`@blacksands/ui` version, publishing currently needs a manual step ([[project_blacksands_client_publish_broken]])
- [ ] `useLocation(id)` caches for 14 days (`staleTime`/`gcTime`), no refetch on focus/reconnect, and that cache is persisted to AsyncStorage across app restarts ([@blacksands/hooks index.js:406-409](node_modules/@blacksands/hooks/dist/index.js#L406)) — editing a site's Firestore doc (e.g. adding `price`) won't show up in the app for any user who already opened that site, for up to 14 days, without a reinstall/storage clear. Fine for normal content updates, but worth knowing when testing content changes live.
- [x] Itinerary drag-and-drop cards can visually cover the transit-time blocks — fixed in `enginev1` (`@blacksands/components` `TimelineBlock`/`TransitBlock`), published as `0.6.2`, bumped here 2026-09-05. Cards now sit below `TransitBlock`'s zIndex at rest and only rise above it while actively dragged.

## Branding / assets

- [ ] **Splash screen is empty** — `assets/splash-icon.png` is a 68-byte placeholder (effectively blank), referenced by the `expo-splash-screen` plugin in [app.config.ts](app.config.ts). Needs a real image before launch.
- [ ] **App icon redesign** — current `assets/icon.png` / `assets/adaptive-icon.png` don't fit; want a new design.
- [x] **Login page redesign** — full-bleed hero background replacing the old boxed 260px image, safe-area-aware brand text (`d6ea5bb`, 2026-09-07). Worth a quick on-device look before launch.

## Versioning

- [x] `version` bumped `0.1.0` → `1.0.0` for launch (`8c6e99d`); Android `versionCode: 1` unchanged, correct for a first release
