# Remaining work before publish

Snapshot taken 2026-08-28. Tests green (16 suites / 83 tests), typecheck clean.

## Content

- [ ] Add "Stay" sites (category already exists in `lib/models.ts` — this is data entry, not code)
- [ ] Add "Food & Drink" sites (category already exists — data entry)
- [ x ] Set up a photo storage bucket (no Firebase Storage / bucket integration currently in the app — `imageUrl`/`imageThumbnailUrl` on `Site` exist but nothing populates or uploads to a bucket today)
- [ ] Source and upload photos for sites, wire into the bucket above

## Features

- [x] Add `price` (free text, e.g. "$15" / "Free" / "$$") and `website` fields to `Site` in [lib/models.ts](lib/models.ts) and display on the site detail screen ([app/(app)/(tabs)/sites/[siteId]/index.tsx](app/(app)/(tabs)/sites/%5BsiteId%5D/index.tsx)) — both are frontend-only additions, the `@blacksands/client` API passes through arbitrary Firestore fields so no backend change needed, just content entry
- [ ] Website link needs UTM params appended before opening (`Linking.openURL`, same pattern as the existing directions link) — **need utm_source/utm_medium/utm_campaign values from user, not yet specified**
- [ ] First-open app tour — not started; `useAppOpenCount` (see Review prompts) already exposes `openCount === 1` as the trigger point, just needs the tour UI itself

## Review prompts

Only trigger today is first itinerary created ([lib/hooks/useItineraries.ts:38-40](lib/hooks/useItineraries.ts#L38-L40)), via `hooksBag.useReviewPrompt().requestReview()` (OS-throttled, so adding more call sites just adds chances, not actual prompt spam). Add:

- [x] First successful purchase — [lib/iap/PurchaseProvider.tsx](lib/iap/PurchaseProvider.tsx) `completePurchase`, success path (~line 88-90)
- [x] First review submitted — site detail screen, `saveReviewToDb` success (`res.ok` branch, ~line 246)
- [ ] Share card created/shared — share-frame flow (`hasShareBonus` / share bonus completion)
- [x] 2nd app open — [lib/hooks/useAppOpenCount.ts](lib/hooks/useAppOpenCount.ts) tracks launch count generically (AsyncStorage-persisted), wired into [app/_layout.tsx](app/_layout.tsx); fires `requestReview()` when count hits 2. Kept general-purpose (count, not a boolean) so it can also drive a first-open app tour later (`openCount === 1`) — **tour itself not built yet, only the counter**

## Store compliance (will block App Store / Play review)

- [ ] Add an in-app account-deletion flow that also **revokes the Apple token** — `userService.deleteAccount` only calls Firebase `deleteUser`, doesn't revoke Sign in with Apple ([[project_apple_revoke_on_delete_missing]] — needs a backend call, JS SDK can't revoke client-side)
- [ ] Add a Privacy Policy link/screen — none found anywhere in the app; both stores require this, especially with location + Sign in with Apple/Google
- [ ] Consider a Terms of Service / EULA screen if IAP subscriptions are sold
- [ ] Confirm IAP products (`expo-iap`) are actually created and approved in App Store Connect / Play Console — `usePurchase(productId)` takes the id from the caller, no product IDs hardcoded here to audit against

## iOS

- [x] `GoogleService-Info.plist` is untracked **and not in `.gitignore`** — one `git add` away from committing a Firebase secret to the repo. Add it to `.gitignore` (CI already injects it from `secrets.GOOGLE_SERVICES_IOS`)
- [ ] Fix Sentry org placeholder in [app.config.ts](app.config.ts#L65) — still `"REPLACE_ME_SENTRY_ORG"`
- [ ] Confirm `EXPO_PUBLIC_SENTRY_DSN` is set as a real secret (referenced in `app/_layout.tsx`, not seen in CI env or `.env`)
- [ ] `usesAppleSignIn: true` + associated domains — confirm Firebase iOS app registration matches (per [[project_apple_signin_firebase_ios_app_registration]], already resolved once, just re-verify before submit)

## Repo hygiene

- [ ] Large uncommitted diff on `main` (16 files: app.config.ts, tab layout, map/site screens, login, icons, models.ts, package.json/lock) — review and commit before anything else lands on top
- [ ] Several new test directories are untracked (`lib/api/__tests__`, `lib/auth/__tests__`, `lib/hooks/__tests__`, `lib/iap/__tests__`, `lib/providers/__tests__`, `lib/services/__tests__`) — get these committed, they're not doing anything sitting untracked
- [ ] `lib/auth/googleSignIn.ts` is untracked — confirm it's actually wired in and not a leftover WIP file

## Known open issues (carried from memory)

- [ ] Apple revoke-on-delete (see Store compliance above) — [[project_apple_revoke_on_delete_missing]]
- [ ] `@blacksands/client` package publish is broken in its own CI (403 on `write_package`) — if site content changes require a new `@blacksands/client`/`@blacksands/components`/`@blacksands/hooks`/`@blacksands/ui` version, publishing currently needs a manual step ([[project_blacksands_client_publish_broken]])

## Versioning

- [ ] `version: "0.1.0"`, Android `versionCode: 1` — fine for a first release, just confirm this is intentional and not a leftover dev value
