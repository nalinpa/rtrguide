# Remaining work before publish

Snapshot taken 2026-08-28. Tests green (16 suites / 83 tests), typecheck clean.

## Full Manual Test Matrix — Guest / Free / Premium

Built 2026-09-10 from reading the actual current code (not guessed), covering every major flow per tier. Where a fuller writeup already exists elsewhere in this file (commit hash, exact repro), this list stays one line and points there instead of duplicating.

**Status after the 2026-09-11/12 device pass:** everything below is checked off as passing except the items still unticked — those are purchases/IAP, claim links, review report/block, the day-move error path, and Sentry on a production build. Account deletion and Apple refresh-token storage both passed on 2026-09-12, clearing the 5.1.1(v) blocker. Ticks reflect what the tester reported on a real device, not a code reading.

**Auth & onboarding**
- [x] Sign up with email/password
- [x] Sign in with email/password
- [x] Forgot-password / reset flow
- [x] Sign in with Apple — native button, credential exchange, **and server-side refresh-token storage all working** (2026-09-12). The ops fix landed: `APPLE_TEAM_ID`/`APPLE_KEY_ID`/`APPLE_PRIVATE_KEY` set on the `blacksands-api` Worker, and `appleSignIn.clientId = app.blacksands.rtrguide` written to the `apps/rotoruaguide` registry doc. Verified on device — `POST /v1/rotoruaguide/auth/apple/link` returned 200 and `appleGrants/{uid}.refreshToken` held a real token. Note a repeat sign-in returns no `authorizationCode` and stores nothing, so re-testing needs an Apple ID that hasn't used the app before.
- [x] Sign in with Google
- [x] Continue as Guest
- [x] First-open tour (4-tab spotlight walkthrough)
- [x] Tour spotlight highlights "My Trips" header for an account with 2+ existing trips (see Manual QA below)
- [x] Tour doesn't auto-start over the login screen before session resolves

**Guest**
- [x] Explore/Sites and Map tabs fully browsable, no login prompt
- [x] Non-premium site detail viewable; premium/locked site shows the buy paywall
- [x] Tapping Save on a site prompts "Sign In Required" (`Alert.alert`, confirmed in `sites/[siteId]/index.tsx`) rather than silently failing or crashing
- [x] Plans tab shows "Sign In to Plan a Trip" card instead of a list
- [x] Account tab shows "Guest Explorer" label, no stats row, no Trips/Saved/Restore/Danger-Zone cards — only the profile card + "Open Guide" promo
- [x] Guide section itself is reachable as a guest (promo card isn't auth-gated)
- [x] Map overlay's "Add to Itinerary" is fully absent for a guest (`onAddToItinerary` only set when `session.status !== "guest"`), not just disabled
- [x] Guest sign-in card on Explore is one compact line (`60963f6`)

**Free / signed-in, non-premium**
- [x] Hard-capped at 1 itinerary — Account-tab "New Itinerary" button hidden once 1 exists (open item below, "Account-tab entitlement cap")
- [x] Single existing trip renders inline on the Plans tab instead of a list
- [x] "1 itinerary allowed on the free plan" copy shown, not "up to 3"
- [x] `CreateItineraryModal` defaults to a free template (not Blank) when locked, blocks submitting Blank
- [x] Dragging/reordering an itinerary item shows the premium upsell modal instead of moving it
- [x] "Add Day" button is hidden entirely (gated on `isEntitled`)
- [ ] Premium/locked site detail shows the blurred-title paywall card, Buy triggers the real IAP sheet — paywall card verified, **Buy untested** (needs a dev-client/TestFlight build + sandbox tester)
- [ ] Restore Purchases button works after a reinstall / on a second device
- [x] Account tab stats row shows correct trip/saved counts

**Premium / entitled**
- [x] Up to 3 itineraries; Account-tab "+ New Itinerary" stays reachable even with exactly 1 trip
- [x] Drag-and-drop reordering an itinerary item actually moves it
- [x] "Add Day" keeps the trip's date range in sync (open item below)
- [x] "Add Day" blocks if it would overlap another trip's dates
- [x] Create-trip date picker selects the exact tapped day, highlight matches
- [x] Create-trip blocks a date range that overlaps an existing trip
- [x] Delete Trip via the "..." menu → confirm modal → removed (see Manual QA below)
- [x] Delete Day removes it and re-dates the remaining days with no gap
- [x] "Switch Trip" popover (2+ trips) opens the trip list correctly
- [x] Premium/locked sites open fully unlocked, no paywall card
- [x] Full Guide content accessible start to finish
- [x] Deleted trip disappears from the Plans list immediately, no lingering card (`10b0dcf`)

**Explore / Map (all tiers, same behavior)**
- [x] Featured site card renders with its drop shadow
- [x] Map category filter button is visually distinct and survives tapping a site
- [x] Search clears the active category filter
- [x] Location-denied card + "Open Settings", now with a "Not Now" dismiss (`60963f6`); enabling location in Settings clears it without an app restart (`8f73ead`)
- [x] Marker clustering groups correctly while zooming (open item below, re-verify)
- [x] Marker settle timing doesn't freeze on blank icons during rapid pinch-zoom (open item below)
- [x] Map's premium banner shows the correct locked-site count and routes to one on tap
- [x] Hot Water Beach shows the walk/boat-only warning before "Add to Itinerary" proceeds
- [x] Typing in map search for 10+ seconds, with and without a category filter, no longer crashes with "Maximum update depth exceeded" (`8f73ead`, `349e6dc`)

**Site detail**
- [x] Hero image + back button render correctly
- [x] Quick actions: Directions opens Maps, Review opens the review modal, Share opens `share-frame` and shows "Shared" after, Save toggles (guest gets the sign-in prompt)
- [x] Website chip opens the browser with UTM params attached
- [x] Reviews summary card + "View All" navigates to the full reviews list
- [x] Reviews screen is titled with the site's name, not "Location" (`7b93184`)
- [x] Report and block on a review — **fixed and verified 2026-09-12**: after `firebase deploy --only firestore:rules`, a report and a block both landed in Firestore (`reports/{reporter}_{reviewId}` with `status: "pending"`, `blocks/{blocker}_{blocked}`), confirmed by querying the live database with the admin SDK. Telegram alert delivery still to be eyeballed. History: **was silently broken** — `enginev1/api`'s `routes/moderation.ts` writes `reports/*` and `blocks/*` under the caller's own id token, not an admin one, so [firestore.rules](firestore.rules) applied and both hit the catch-all deny (verified against the live DB: neither collection exists, so nothing has landed since the real rules shipped in `7932a37`). Rules + visible success/failure feedback added in `11af080`. **Still needs `firebase deploy --only firestore:rules`**, then retest: report a review, block its author, confirm a `reports/` and a `blocks/` doc appear and the blocked author's reviews vanish.
- [x] "Add to Itinerary" is hidden for Accommodation-category sites
- [x] `PurchasePendingBanner` shows correctly if a purchase is mid-flight when the screen opens

**Guide**
- [x] Guide index lists categories with correct icon/color
- [x] A guide category page renders its content
- [x] Bad/removed slug shows "Guide Not Found" with a working Go Back, not a blank page (open item below)
- [x] Guide back button returns to the Account tab, not Explore

**Account tab**
- [x] Saved Sites card + full Saved Places screen, swipe-to-remove works
- [x] Inactive-but-saved site shows a resolved name (or "Unavailable"), not a raw Firestore id (open item below)
- [ ] Restore Purchases flow end to end
- [x] Delete Account danger-zone confirm flow, on-device — 2026-09-12, `DELETE /v1/rotoruaguide/account` → 200, Firebase Auth user gone, Apple grant revoked (see Store compliance)

**Claim / comp codes** — all blocked on the commerce-api production deploy
- [ ] Tapping a real minted claim link actually deep-links into the app (not just the web fallback) — flagged in detail below
- [ ] Sign-in gate on the claim screen works for a not-yet-authed tapper
- [ ] Claiming grants the entitlement immediately, no restart needed

**Cross-cutting**
- [x] Delete-trip confirmation modal (see Manual QA below)
- [x] A failed day-move surfaces a visible error instead of silently reverting — code walkthrough 2026-09-12 confirmed it didn't: all five save paths ignored the result, so a failure rejected unhandled and the edit sat on screen looking saved. Fixed in `710b9b8` (one wrapper: keeps the change dirty for the retry, reports to Sentry, shows one "Couldn't Save Changes" alert). Offline no longer fails at all — those saves queue (`1adf947`). Still worth an opportunistic on-device check if a real server error ever shows up.
- [x] Offline banner appears when the network actually drops
- [ ] Sentry captures real errors on a production-profile build (previously confirmed 2026-09-06 — retest)

**Offline** (2026-09-11/12 pass, fixes `bf6625b` / `1adf947` / `cf97057`)
- [x] Cold launch offline: trips and saved places load from cache, no "Couldn't load your trips" over data that loaded fine, no `[useItineraries] load failed` in the log
- [x] Saved place saved while offline shows its name on the Account tab, not "Unavailable"
- [x] Add to Trip / Create Trip are disabled offline with "Reconnect to …" labels
- [x] Reconnecting refetches on its own
- [ ] Trip edits made offline (reorder, add/delete day, move item) still there after reconnect — reorder reported as not saving, repro case still to be pinned down

## Manual QA — 2026-09-05 bug fixes

Code review turned up 12 bugs, each fixed in its own commit (`121e33a`..`ac8df0a`, `59f501a`). None of these have been exercised on a real device yet — check each before shipping.

- [x] **Delete-trip confirmation** (`121e33a`) — verified on-device 2026-09-10 (superseded by the custom `DeleteTripModal` flow built the same day).
- [x] **Account-tab entitlement cap** (`963599f`) — verified in the 2026-09-11/12 device pass — as a non-entitled (non-purchased) account with 1 existing itinerary, confirm the Account tab's "New Itinerary" button is hidden, matching the Plans tab. As an entitled account, confirm you can still create up to `PLANNER.MAX_ITINERARIES` (3) trips from the Account tab.
- [x] **Failed day-move no longer silently discarded** (`3453691`) — closed by code walkthrough 2026-09-12. The dirty flag already survived a failure, so the move was retried rather than dropped, but nothing was ever shown to the user and the rejection was unhandled; both fixed in `710b9b8`. The airplane-mode repro no longer applies: offline saves queue and send on reconnect (`1adf947`).
- [x] **Add Day keeps endDate in sync** (`4c3fde5`) — verified in the 2026-09-11/12 device pass — open a trip, tap "Add Day", then go back to My Trips (need 2+ trips to see the picker). Confirm the trip's displayed date range now includes the newly added day.
- [x] **Map re-render loop fixed** (`242b30a`) — verified 2026-09-12, but note the real loop was elsewhere: an unstable `locations` array drove react-native-map-clustering into "Maximum update depth exceeded" while searching, fixed in `8f73ead` (plus redundant `Stack.Screen` options in `349e6dc`) — on the Map tab, search until exactly one result remains. Confirm the map doesn't jank/flicker/reselect repeatedly (Perf monitor or just visual smoothness works).
- [x] **Saved-site name fallback** (`c7fd99e`) — verified 2026-09-12; names now come from the cached locations list so they also survive offline (`cf97057`) — save a site, then mark that site `active: false` in Firestore (or via an admin script). Confirm the Account tab and the full Saved Places list show "Unavailable" instead of a raw Firestore doc id.
- [x] **Onboarding tour spotlight for existing trips** (`3b12f9f`) — verified on-device 2026-09-10.
- [x] **Sentry DSN actually reaches builds** (`cb50ccd`) — confirmed on a real dev-profile EAS build (2026-09-06): manual test event landed in the `patel-td` Sentry org. Test button removed from the Account tab.
- [x] **Guide not-found state** (`abb3b5a`) — verified in the 2026-09-11/12 device pass — manually navigate to `/guide/does-not-exist` (or an old/removed slug). Confirm a "Guide Not Found" card with a Go Back button appears instead of a blank page.
- [x] **Inactive-but-saved sites stay reachable** (`4045abf`) — verified in the 2026-09-11/12 device pass — save a site, mark it `active: false`, open the full Saved Places screen (not just the Account tab preview). Confirm the site still appears (name resolved, not id) and swipe-to-remove still un-saves it correctly.
- [x] **Location-denied banner restored** (`ac8df0a`) — verified 2026-09-12, now dismissible (`60963f6`) and clears on return from Settings (`8f73ead`) — deny location permission for the app, open the Sites tab. Confirm a "Location Disabled" card appears with an "Open Settings" button that opens the OS settings app.
- [x] **Map marker settle timing rework** (`59f501a`) — verified in the 2026-09-11/12 device pass — on a real device (ideally an older/slower one), open the Map tab and pinch-zoom rapidly and repeatedly across cluster boundaries. Confirm markers/clusters never freeze on a blank or default icon — this replaced a fixed 700ms timer with an onLayout+rAF-based settle, and needs on-device confirmation since it touches native marker rasterization.
- [x] **Clustering silently broken since `96ce2ad`** (found 2026-09-06 on first real device test) — `renderedMarkers` wrapped each site marker in a `SiteMapMarker` component instead of a raw `<Marker coordinate=.../>`. `react-native-map-clustering`'s `isMarker()` check reads `child.props.coordinate` directly off the element passed as a child of `ClusterMapView`, not off whatever that element renders internally — so every marker failed the check and clustering silently no-op'd (all markers rendered individually, ungrouped) for two days across 3 commits before anyone tested on a physical device. Fixed in [components/map/SitesMapView.tsx](components/map/SitesMapView.tsx) by passing `coordinate` through as an explicit prop on `SiteMapMarker` itself. Re-verify clustering visually on-device.

## Content

- [x] Add "Stay" sites (category already exists in `lib/models.ts` — this is data entry, not code)
- [x] Add "Food & Drink" sites (category already exists — data entry)
- [ x ] Set up a photo storage bucket (no Firebase Storage / bucket integration currently in the app — `imageUrl`/`imageThumbnailUrl` on `Site` exist but nothing populates or uploads to a bucket today)
- [x] Source and upload photos for sites, wire into the bucket above
- [x] Rewrite site content (descriptions/copy) now that every site has an entry — all 89/89 descriptions rewritten and pushed to Firestore via `scripts/update-site-descriptions.js` (Fat Dog Cafe filled in and re-pushed). 2nd pass done 2026-09-01.
- [x] Review all site data in Firestore (descriptions, price, website, category, photos) for accuracy and completeness before launch — done 2026-09-11

## Features

- [x] Add `price` (free text, e.g. "$15" / "Free" / "$$") and `website` fields to `Site` in [lib/models.ts](lib/models.ts) and display on the site detail screen ([app/(app)/(tabs)/sites/[siteId]/index.tsx](app/(app)/(tabs)/sites/%5BsiteId%5D/index.tsx)) — schema + display done, content entry is separate (see below)
- [x] Enter `price` data for sites — 93/93 written via `scripts/update-prices.js` using label tiers (`Free`/`Budget`/`Mid-range`/`High-end`/`Blowout`, matches how `site.price` just renders as raw text on the detail screen).
- [x] Website link UTM params — `utm_source=blacksands.app&utm_medium=rotorua app&utm_campaign=ios_link` appended in `handleOpenWebsite` before `Linking.openURL`
- [x] First-open app tour — spotlight walkthrough across all 4 tabs, triggered on `openCount === 1` (see [lib/tour/](lib/tour/)), no new dependency (react-native-svg mask + reanimated, both already installed). Untested on-device — worth a real run-through before launch to check spotlight/tooltip positioning on an actual phone
- [x] Tour could auto-start over the login screen — `TourAutoStart` only checked `openCount`, not session state. Gated behind a new `TourAutoStartGate` reading `useSession()` (`c330273`, 2026-09-07)
- [x] Guide styling/placement — dropped the separate `GuideCard` account-tab row in favour of the existing hero promo card ("Discover Rotorua / Your guide to...") on the account screen; its CTA now opens `/(app)/guide` instead of Browse All Sites ([account.tsx:56-63](app/(app)/(tabs)/account.tsx#L56-L63)), inheriting the promo card's styling. Guide index/detail screens also got a per-category icon + accent color pass ([guideContent.ts](lib/guideContent.ts), [guide/index.tsx](app/(app)/guide/index.tsx), [guide/[slug].tsx](app/(app)/guide/%5Bslug%5D.tsx)) — no photos (none exist yet), icon+color chips/hero bands only
- [x] Run the transit matrix generator — [assets/data/rotorua-transit.json](assets/data/rotorua-transit.json) is populated (74 sites, real driving times via the Distance Matrix API), `getRequiredTransitSlots` now returns real slot counts instead of the flat 1-slot fallback for any pair in the file

## Site availability / time-constraint warnings (not started — design deferred)

Surfaced 2026-09-08 while fixing the Waiotapu template + transit matrix. No site currently has any hours/schedule data at all — confirmed nothing like `hours`/`schedule` exists in `scripts/sites.json`, timing info only shows up as prose buried in `description` text. Three distinct patterns found so far, all currently un-enforced anywhere in the app:

- **Permit/day-restricted access** — Tarawera Falls needs a forestry permit from the Kawerau i-SITE, only available Sat/Sun/public holidays, forest gate closed after dark. A site could be added to any day of an itinerary today with zero warning.
- **Fixed evening show times** — Te Pā Tū / Mitai Māori Village have real start times (Mitai ~6:30pm, 3hrs) baked into the *templates* (see `lib/itineraryTemplates.ts`) but nothing stops a user manually adding them to the wrong time slot in their own itinerary.
- **Recurring weekly markets** — Rotorua Night Market, Kuirau Park market — don't exist as sites in `sites.json` yet at all (only on certain days/times when added).
- General ask: check opening hours broadly so people can't schedule a site after it's closed.

One `Alert.alert` "walk/boat-only, no road access" pattern already shipped for Hot Water Beach as a one-off (`HOT_WATER_BEACH_ID` hardcoded in both [app/(app)/(tabs)/sites/[siteId]/index.tsx](app/(app)/(tabs)/sites/%5BsiteId%5D/index.tsx) and [app/(app)/(tabs)/map/index.tsx](app/(app)/(tabs)/map/index.tsx)) — explicitly *not* meant to be the general solution, just the immediate fix for that one site.

Classified as an **architectural** change (new site-data schema + enforcement across both "Add to Itinerary" entry points, possibly the itinerary builder's drag/schedule flow too) via `superpowers:brainstorming` — paused before the first design question because scope wasn't decided yet:

- [ ] **Open decision**: does v1 need a general schema covering all time-constraint kinds (permit days, recurring market hours, fixed show times, general open/close) with real data backfilled across many sites — or start narrow with just the named sites (Tarawera Falls, Te Pā Tū, Mitai, night market, Kuirau Park market) and generalize later once a pattern proves out?
- [ ] Once scope is picked, resume brainstorming (data model, where enforcement lives — add-flow warning vs. builder-level validation vs. auto-scheduling — and whether it's a hard block or a dismissible note like the Hot Water Beach one)

## Free / comp unlock codes

- [x] Admin-mintable free-unlock claim links — `POST /v1/admin/comp-links` in `commerce-api` (2026-09-06), reuses the existing `claimTokens`/`/claim/:token` redemption path this app already handles, zero client changes needed. No admin UI yet — minting one today means calling the endpoint directly (curl/Postman) with an admin bearer token.
- [x] Entitlements not reflecting immediately after claim (2026-09-10) — `useEntitlements` (`enginev1/hooks`) caches with a 5-minute `staleTime`, and `app/claim/[token].tsx`'s `handleClaim` never invalidated that query — claim, see "You're all set," Continue into the app, still reads the pre-claim locked state. Fixed: invalidates the `["rotoruaguide","entitlements",uid]` query on successful claim.
- [ ] **Needs a real on-device test** — server (`claimLinks.ts` mint/read/redeem) and client (`app/claim/[token].tsx`) both verified correct by reading the source end-to-end (2026-09-10), but the actual flow has never been run on a physical device. Specifically unverified: does tapping a real `claimUrl` deep-link into the app at all, or does it just open the web fallback page (`claimPage.ts`)? The AASA file resolving via curl only proves the file is correct, not that a real Universal Link tap-through opens the native app. Mint a comp link (see commerce-api section of `enginev1/TASKS.md` or ask for the curl steps again), open it on a phone, confirm: deep-link opens the app, sign-in works, Claim succeeds, and the unlock is visible immediately without a restart. Rework whatever breaks.

## Review prompts

Only trigger today is first itinerary created ([lib/hooks/useItineraries.ts:38-40](lib/hooks/useItineraries.ts#L38-L40)), via `hooksBag.useReviewPrompt().requestReview()` (OS-throttled, so adding more call sites just adds chances, not actual prompt spam). Add:

- [x] First successful purchase — [lib/iap/PurchaseProvider.tsx](lib/iap/PurchaseProvider.tsx) `completePurchase`, success path (~line 88-90)
- [x] First review submitted — site detail screen, `saveReviewToDb` success (`res.ok` branch, ~line 246)
- [~] ~~Share card created/shared~~ — **cancelled**
- [x] 2nd app open — [lib/hooks/useAppOpenCount.ts](lib/hooks/useAppOpenCount.ts) tracks launch count generically (AsyncStorage-persisted), wired into [app/_layout.tsx](app/_layout.tsx); fires `requestReview()` when count hits 2. Kept general-purpose (count, not a boolean) so it can also drive a first-open app tour later (`openCount === 1`) — **tour itself not built yet, only the counter**

## Launch order (decided 2026-09-12)

Ship the iOS app first; the Stripe web storefront follows later. Consequences:

- **commerce-api still needs a production deploy before submitting**, even with Stripe in test mode — the app resolves entitlements against it, so IAP purchases would otherwise be validated against staging. Deploy `enginev1/commerce-api` (`npm run deploy`, env production; the worker doesn't exist yet as of 2026-09-12) and set its secrets. A test-mode `STRIPE_SECRET_KEY` is fine while the storefront is dark.
- **Then switch this app off staging**: `commerceBaseUrl` in [lib/api/index.ts](lib/api/index.ts) and `COMMERCE_BASE_URL` in [app/claim/[token].tsx](app/claim/%5Btoken%5D.tsx) are both hardcoded to `commerce-staging.blacksands.app`. Point both at production (one shared constant) and rebuild — do this *before* the TestFlight IAP test so the real path is what gets tested.
- **Deferred with the storefront**: Stripe account activation, live key + live webhook endpoint, `enginev1/storefront` deploy to `shop.blacksands.app`, and the Resend key that emails claim links to web buyers. Admin-minted comp links don't need Stripe.

## Store compliance (will block App Store / Play review)

- [x] Add an in-app account-deletion flow that also **revokes the Apple token** — client side done: `appleSignIn.ts` now persists the Apple refresh token server-side on sign-in (ca880e1), `userService.deleteAccount` calls the server-side `client.auth.deleteAccount()` instead of client-side `deleteUser` "so Apple revocation always runs" (946fa0d), and it signs out locally after (`auth.signOut()`) since the server-side delete doesn't clear local SDK session state (a721645). Actual revoke-on-Apple's-servers happens in the `enginev1/api` backend (`routes/auth.ts`, `lib/apple.ts`, revoke in `routes/account.ts`). **Verified end-to-end on device 2026-09-12** — the ops setup that was missing on 2026-09-11 is now done (Sign in with Apple `.p8` key created, the three `APPLE_*` Worker secrets set, `appleSignIn.clientId` added to the registry doc). Full pass: sign-in stored a refresh token on `appleGrants/{uid}`, Delete Account returned 200, `refreshToken` was cleared to null, the Firebase Auth user was deleted, and no `apple revoke failed` appeared in `wrangler tail` — meaning Apple's `/auth/revoke` returned 2xx, since `revokeToken` throws on any non-2xx. The Apple ID's "Sign in with Apple" section no longer lists the app. **5.1.1(v) blocker cleared.**

  Debugging note for next time: Worker-side revoke failures are `console.error` and go to `wrangler tail`, **not Sentry**. Revoke is best-effort and never blocks deletion, so the app's UI looks identical whether it worked or not — always check the tail plus `appleGrants/{uid}`.
- [x] Privacy Policy page live at **https://blacksands.app/rotorua-guide#privacy** (`public/rotorua-guide.html` in the `blacksands` repo, deployed) — paste this URL into App Store Connect's Privacy Policy field. No hero screenshot yet (`app-detail-hero__visual` block omitted) — add one later, no restructuring needed. Nothing in the *rotorua-guide* app itself links to this page yet — consider adding a link from the account/settings screen too.
- [x] Terms of Service added at **https://blacksands.app/rotorua-guide#terms** (custom, not just Apple's default EULA — covers the one-time IAP, content accuracy, location-based check-ins, user content, termination, NZ governing law)
- [ ] Confirm IAP products (`expo-iap`) are actually created and approved in App Store Connect (launch is iOS-only; Play Console only matters if Android ships later) — `usePurchase(productId)` takes the id from the caller, no product IDs hardcoded here to audit against
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
- [ ] Dragged itinerary card seen sliding *under* a transit block mid-drag (iOS, 2026-09-11), couldn't reproduce afterward. On `@blacksands/components` 0.6.4 the card should be at zIndex 10 while dragging, above `TransitBlock`'s 1. If it recurs, capture: slow drag or flick, whether it was the first drag after opening the screen, whether it stayed under for the whole slide or only a moment, and a screenshot mid-slide.

## Branding / assets

- [x] **Splash screen** — real 1024x1024 geyser-motif image + wordmark, replacing the 68-byte placeholder (2026-09-07)
- [x] **App icon redesign** — `assets/icon.png` / `assets/adaptive-icon.png` updated to the same geyser motif (2026-09-07). The adaptive-icon artwork runs close to the canvas edge and Android's mask only guarantees the centre ~66%, but launch is iOS-only so this isn't a release check — re-check it if Android ever ships.
- [x] **Login page redesign** — full-bleed hero background replacing the old boxed 260px image, safe-area-aware brand text (`d6ea5bb`, 2026-09-07). Worth a quick on-device look before launch.
- [ ] **Custom alert cards** — replace the native iOS-style `Alert.alert` popups with Rotorua Guide-styled alert cards. 14 calls across 5 files: `app/(app)/(tabs)/sites/[siteId]/index.tsx` (9), `components/itinerary/ItineraryDetailView.tsx` (2), `components/itinerary/EditItemModal.tsx` (1), `app/(app)/(tabs)/map/index.tsx` (1), `app/share-frame.tsx` (1). `DeleteTripModal` is an existing custom modal to follow, and the itinerary note pop-up card should share the same card style.

## Versioning

- [x] `version` bumped `0.1.0` → `1.0.0` for launch (`8c6e99d`); Android `versionCode: 1` unchanged, correct for a first release

## Post-launch

- [ ] **Maybe: keep queued offline itinerary edits across an app restart** — itinerary saves/deletes pause offline and send on reconnect (`networkMode: "online"` + shared `scope` in [useItineraries.ts](lib/hooks/useItineraries.ts)), but the queue is in-memory only: edit offline, then the app gets killed before reconnecting, and the edit is lost. Rare (needs a swipe-away or memory kill while still offline), so only build it if users report lost offline edits. Doing it properly is more than persisting mutations: (1) `setMutationDefaults` + `mutationKey` per mutation and `resumePausedMutations()` after the persisted cache restores, since functions don't serialize; (2) optimistic writes to the `itineraries` query cache on save, because `ItineraryDetailView` holds edits in local state — otherwise after an offline restart the trip shows the pre-edit version until reconnect; (3) a staleness guard (e.g. `updatedAt` check), because each save sends the whole `days` array and an old queued save replaying later could overwrite newer edits from another device.

- [ ] **AuthCard per-instance styling** — `components.AuthCard` (shared `@blacksands/components`, used by Cones/Eats/Rings too) takes no style/color prop at all (checked `AuthCardProps` in `enginev1/components/src/AuthCard.tsx`) — its tabs/inputs/borders just inherit whatever `lib/ui/tokens.ts` colors this app already uses everywhere else (`accent`, `border`, `bgElevated`, `bgCard`). The login screen's card currently only stands out via an external gradient-frame wrapper in `login.tsx` (orange→teal, added 2026-09-08) since there was no other way to add color without touching the shared component. Real fix — giving AuthCard a proper color/style override prop — means editing the shared package and republishing `@blacksands/client`-style (bump + `npm run build` + `npm publish` from `enginev1/components`, then bump the dependency here), which affects every consuming app, so deferring until after launch rather than doing it under time pressure.

- [ ] **Move a purchase to a new account after Delete Account** — found 2026-09-17 in sandbox testing. An IAP is bound to the buying app account: the app sends `appAccountToken = deriveAppAccountToken(uid)` with the purchase, Apple stamps it into the transaction permanently, and commerce-api `iap/register` returns 403 `uid_mismatch` for any other uid. Delete Account (enginev1/api `routes/account.ts`) only revokes Apple Sign In and deletes the Firebase user — `purchases/{id}` stays bound to the dead uid. So pay → delete account → sign up again → Buy/Restore = locked out forever. Launch mitigation (2026-09-17): the 403 message says "linked to another Rotorua Guide account, or one that's been deleted… email support@blacksands.app", the Delete Account confirmation warns the unlock won't carry over, and support re-grants by hand with a comp claim link. Don't auto-rebind on transactionId alone: register only receives a transactionId, so releasing orphaned purchases would let anyone holding a leaked ID claim them. Proper fix: (1) app sends the StoreKit 2 signed transaction JWS (expo-iap `purchaseToken` on iOS) with `register` and Restore — JS-only, OTA-able; (2) commerce-api verifies the JWS (x5c chain to Apple Root CA G3, ES256 signature, bundleId, transactionId match) — first spike (~30 min): does `@apple/app-store-server-library` `SignedDataVerifier` run on Cloudflare Workers? If yes ~1 day total, if hand-rolled cert verification 2–3 days; (3) commerce-api learns the original account is gone — either account deletion calls commerce to release that uid's purchases, or commerce looks the uid up in the app's Firebase Auth; (4) rule: valid device JWS + original uid deleted → rebind `purchases/{id}.uid` and grant; living original uid → keep 403. Tests: sandbox buy → delete → new account → Restore unlocks; a *living* account's purchase still can't be taken over; stale/forged JWS rejected.
