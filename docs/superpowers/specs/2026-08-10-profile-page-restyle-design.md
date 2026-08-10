# Profile Page Restyle — Design

**Goal:** Rebuild rotorua-guide's account/profile screen to match aklguide's editorial visual language (hero + promo card + stats row + sectioned cards), the same way the sites list/detail screens were already restyled to match aklguide. The saved-places screen itself already exists (`app/(app)/saved-sites.tsx`, built in `2026-08-07-sites-list-detail-restyle`) — this spec adds a profile-page entry point into it, it does not rebuild it.

**Reference:** `aklguide/mobile/app/(app)/(tabs)/account.tsx` and `aklguide/mobile/components/account/*` — read for structure, not copied verbatim (different design system: aklguide uses `kitten-theme`, rotorua uses `lib/ui/tokens.ts` + `lib/uiKit.ts`).

## Architecture

`app/(app)/(tabs)/account.tsx` becomes a hero-shell screen, matching aklguide's own file split:

- The screen shell (hero bar, promo card, rounded sheet, stats row) stays inline in `account.tsx` — it's page-specific chrome, not reusable.
- Four new components under `components/account/` hold the sectioned content, one per card, mirroring aklguide's component boundaries exactly.

All new styling is hand-rolled `StyleSheet` + `tokens` (`lib/ui/tokens.ts`), the same approach the sites-restyle plan used for hero/layout code. Interactive elements (buttons, body text) reuse `lib/uiKit.ts` primitives (`AppButton`, `AppText`, `Row`) wherever aklguide's own components already do.

No new dependencies. No new routes — `/(app)/saved-sites` and `/(app)/(tabs)/itinerary/[itineraryId]` already exist.

## Color mapping (aklguide `kitten-theme` → rotorua `tokens.colors`)

| aklguide (`theme.colors.*`) | rotorua (`tokens.colors.*`) | Use |
|---|---|---|
| `onSurface` | `text` | primary text |
| `onSurfaceVariant` | `text2` | secondary text |
| `outline` | `textMuted` | chevrons, disabled |
| `outlineVariant` | `border` | dividers |
| `surface` | `bgCard` | sheet background |
| `background` | `bgBase` | screen background |
| `primary` | `accent` | CTA, links, terracotta |
| `secondary` | `surf` | count badges, index numbers, forest green |
| `error` | `danger` | delete account |

`theme.spacing.marginMobile` → `tokens.space.md` (16). `theme.typography.labelCaps` has no rotorua equivalent — hand-roll the eyebrow style inline: `{ fontSize: 11, fontWeight: "800", letterSpacing: 3, textTransform: "uppercase" }`.

Hero background uses `tokens.colors.surf` (forest green) in place of aklguide's navy `#001233`. Promo card uses `tokens.colors.accent` (terracotta) in place of aklguide's blue `#005EB8`. Same two-tone hero/promo relationship, Rotorua's own palette instead of a copied one.

## Screen structure (`account.tsx`)

1. **Hero bar** (`surf` background): wordmark `"ROTORUAGUIDE"` (left) + signed-in email or `"Guest Explorer"` (right), matching aklguide's top bar.
2. **Promo card** (`accent` background, inside hero): eyebrow `"DISCOVER ROTORUA"`, headline `"Your guide to the\nLand of Geysers"`, body `"Geothermal wonders, Māori culture, and adventure — all in one place."`, CTA button `"Browse All Sites"` → `router.push("/(app)/(tabs)/sites")`.
3. **Rounded white sheet** (`bgCard`, rounded top corners, negative margin overlapping the hero — same visual trick as aklguide).
4. **Stats row** (authed only): trip count from `useItineraries().itineraries.length`, saved count from `useSavedSites().savedSiteIds.size`.
5. Cards in order: `UserInfoCard` (always) → `ItinerariesCard`, `SavedSitesCard`, `DangerZoneCard` (authed only) — same conditional structure as aklguide.

Loading state (`session.status === "loading"`) keeps using `LoadingState` from `lib/uiKit.ts`, not aklguide's raw view.

## New components

### `components/account/UserInfoCard.tsx`
Authed: sign-out row. Guest/unauthed: body copy + `AppButton variant="primary"` "Sign In / Create Account".
Reuses the existing `handleLogout`/`handleSignIn` logic already in current `account.tsx` (`disableGuest()` → `auth.signOut()` → `router.replace("/(auth)/login")`) — not aklguide's `/login` path, which doesn't exist in this app's route tree.

### `components/account/ItinerariesCard.tsx`
Numbered list of trips (title + date range) from `useItineraries()`, tapping a row routes to `/(app)/(tabs)/itinerary/${itinerary.id}` (not aklguide's `/plans`, which doesn't exist here). "New Itinerary" button opens `components/itinerary/CreateItineraryModal` (already built for the itinerary tab) when under `PLANNER.MAX_ITINERARIES` (`lib/constants/gameplay.ts`), else shows the limit-reached text aklguide uses.

### `components/account/SavedSitesCard.tsx`
Last 3 saved site names (most-recently-saved first) from `useSavedSites().savedSiteIds` resolved against `hooksBag.useLocations()` (rotorua's data source — aklguide uses its own `useAppData().sitesData`, which doesn't exist here). Tapping a row routes to `/(app)/(tabs)/sites/${id}`. "View All Saved Places" / "Manage Saved Places" button routes to `/(app)/saved-sites` (existing route).

### `components/account/DangerZoneCard.tsx`
Delete-account card + confirm modal, restyled to aklguide's layout (icon chip, inline description, outlined delete button, centered modal). Reuses the existing `handleDeleteAccount` logic and copy already in current `account.tsx` (`userService.deleteAccount`, `auth/requires-recent-login` handling, "Permanently remove your visit history and reviews..." wording) — keep rotorua's existing copy, don't replace it with aklguide's generic text.

## Error handling

No new error paths. Existing error states carry over unchanged: itinerary load error (`useItineraries().error`), delete-account error (`requires-recent-login` vs generic), saved-sites query has no error surface today (matches aklguide, which also doesn't surface one).

## Testing

No test framework in this repo (confirmed by the prior theme-update plan). Verification is `npm run typecheck` per task plus a manual walkthrough: guest state, authed state with 0/1/many itineraries, 0/some saved places, delete-account flow (cancel path only, not executed against a real account).

## Out of scope

- Rebuilding `app/(app)/saved-sites.tsx` itself — it already exists and matches this palette.
- Any change to `components/itinerary/CreateItineraryModal.tsx` or `lib/hooks/useItineraries.ts`/`useSavedSites.ts` — consumed as-is.
- Auth screens, tab bar, other tabs.
