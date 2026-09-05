# Remaining work before publish

Snapshot taken 2026-08-28. Tests green (16 suites / 83 tests), typecheck clean.

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
- [x] Guide styling/placement — dropped the separate `GuideCard` account-tab row in favour of the existing hero promo card ("Discover Rotorua / Your guide to...") on the account screen; its CTA now opens `/(app)/guide` instead of Browse All Sites ([account.tsx:56-63](app/(app)/(tabs)/account.tsx#L56-L63)), inheriting the promo card's styling. Guide index/detail screens also got a per-category icon + accent color pass ([guideContent.ts](lib/guideContent.ts), [guide/index.tsx](app/(app)/guide/index.tsx), [guide/[slug].tsx](app/(app)/guide/%5Bslug%5D.tsx)) — no photos (none exist yet), icon+color chips/hero bands only
- [x] Run the transit matrix generator — [assets/data/rotorua-transit.json](assets/data/rotorua-transit.json) is populated (74 sites, real driving times via the Distance Matrix API), `getRequiredTransitSlots` now returns real slot counts instead of the flat 1-slot fallback for any pair in the file

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
- [ ] `EXPO_PUBLIC_SENTRY_DSN` set as a real value — added to `.env` locally, and the actual value is live as an EAS environment variable across production/preview/development (`eas env:set`, confirmed via `eas env:list`). The `eas.json` build profiles previously "referenced" it via `"@EXPO_PUBLIC_SENTRY_DSN"`, but that's stale `eas secret:create` dereference syntax the current EAS CLI doesn't support — `buildProfile.env` values are used as literal strings and are merged **on top of** the real server-side env vars, so every build was actually shipping the literal string `"@EXPO_PUBLIC_SENTRY_DSN"` as its DSN. Removed those `env` blocks from `eas.json` (2026-09-05); profile names already auto-map to the right environment, so the real DSN should now come through. Unverified — needs a real build checked against Sentry to confirm events actually arrive.
- [ ] `usesAppleSignIn: true` + associated domains — confirm Firebase iOS app registration matches (per [[project_apple_signin_firebase_ios_app_registration]], already resolved once, just re-verify before submit)

## Observability & security review

- [ ] Review Firestore security rules — haven't located/audited the actual rules file for the `rotoruaguide-d8274` project during this session's debugging (only ever queried via the admin SDK, which bypasses rules entirely, or the API's own user-token-scoped path). Worth confirming rules actually match intended access (e.g. users can only read/write their own `itineraries`/`users` docs, `siteReviews` write is scoped to the authenticated author) before launch.
- [ ] Replace `console.log`/`console.error` calls with Sentry logging now that `EXPO_PUBLIC_SENTRY_DSN` is actually wired up (2026-09-05) — Sentry only auto-captures unhandled/thrown errors, so existing `console.error` call sites (e.g. [useItineraries.ts:24](lib/hooks/useItineraries.ts#L24), [claim/[token].tsx](app/claim/%5Btoken%5D.tsx)) don't reach Sentry at all today. Audit call sites and swap to `Sentry.captureException`/`captureMessage` where the error is actually worth alerting on (skip expected/handled cases like offline network errors).

## Repo hygiene

- [x] Large uncommitted diff on `main` — reviewed and split into 5 commits (deps, Google Sign-In, sites/map feature work, test coverage, gitignore/tracker)

## Known open issues (carried from memory)

- [ ] `@blacksands/client` package publish is broken in its own CI (403 on `write_package`) — if site content changes require a new `@blacksands/client`/`@blacksands/components`/`@blacksands/hooks`/`@blacksands/ui` version, publishing currently needs a manual step ([[project_blacksands_client_publish_broken]])
- [ ] `useLocation(id)` caches for 14 days (`staleTime`/`gcTime`), no refetch on focus/reconnect, and that cache is persisted to AsyncStorage across app restarts ([@blacksands/hooks index.js:406-409](node_modules/@blacksands/hooks/dist/index.js#L406)) — editing a site's Firestore doc (e.g. adding `price`) won't show up in the app for any user who already opened that site, for up to 14 days, without a reinstall/storage clear. Fine for normal content updates, but worth knowing when testing content changes live.
- [ ] Itinerary drag-and-drop cards can visually cover the transit-time blocks — root cause is in `@blacksands/components`'s `TimelineBlock` (`zIndex: 10`, hardcoded) vs `TransitBlock` (`zIndex: 1`), so a card's shadow/padding always paints over an adjacent transit block regardless of position. This app's own scheduling logic ([itineraryPhysics.ts](lib/utils/itineraryPhysics.ts)) is correct — no logical slot overlap, purely a shared-component z-index/spacing issue. Needs a fix in `enginev1` (the source repo) — hasn't been done since that's a cross-repo edit ([[feedback_no_cross_repo_edits]]), waiting on the go-ahead to do it there.

## Versioning

- [ ] `version: "0.1.0"`, Android `versionCode: 1` — fine for a first release, just confirm this is intentional and not a leftover dev value
