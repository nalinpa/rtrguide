# App-wide theme update — design

## Context

rotorua-guide currently renders with the same dark, generic palette shared by
the other apps generated from the same template (cones, rings, etc.):
near-black backgrounds, steel-blue accent. The goal is a Rotorua-appropriate
light palette across the whole app, as the foundation for a later, separate
restyle of the sites list/detail screens (tracked as its own spec).

## Scope

- Swap the color palette in `lib/ui/tokens.ts`.
- Update `app.config.ts` splash/adaptive-icon `backgroundColor` to match.
- Verify every screen still reads correctly against the new palette.

Out of scope (explicitly, per user decision):
- Recoloring `assets/icon.png` / `assets/splash-icon.png` artwork.
- Any layout/structural change to screens or components.
- The sites list/detail bespoke rebuild (separate spec, comes after this).

## Why this is a single-file change

`lib/ui/tokens.ts` is the only place color is defined in the app. It's
consumed directly by `createUI()` (`@blacksands/ui`) and `createComponents()`
(`@blacksands/components`) in `lib/uiKit.ts`, which produce every primitive
used across the app (`Screen`, `AppButton`, `AppText`, `CardShell`, `Pill`,
`Row`, `Stack`, `Section`, `ErrorCard`, `LoadingState`, `RatingStars`,
`OfflineBanner`, `CheckInAction`, plus the `components.*` set: `LocationHero`,
`StatusCard`, `ActionsCard`, `ReviewModal`, etc.). A repo-wide grep confirms
no screen hardcodes a color outside this file — no dark hex values appear
anywhere else in `app/`, `components/`, or `lib/`. Spacing, radius, border,
and tap-target scales are untouched — they're not brand-related.

## New palette

Replacing `colors` in `lib/ui/tokens.ts`:

| Key | Current (dark) | New (Rotorua) | Notes |
|---|---|---|---|
| bgBase | `#1A1A1A` | `#FBF7F1` | warm cream |
| bgSurface | `#212121` | `#F5EDE1` | |
| bgCard | `#2A2A2A` | `#FFFFFF` | |
| bgElevated | `#333333` | `#F0DEC9` | |
| borderSubtle | `#242424` | `#F0DEC9` | |
| border | `#3A3A3A` | `#DCC9AE` | |
| borderStrong | `#484848` | `#B49B7A` | |
| accent | `#3C6EA0` | `#C1571C` | ember orange (primary) |
| accentDim | `rgba(60,110,160,0.15)` | `rgba(193,87,28,0.12)` | |
| accentWarm | `#4A82BC` | `#8C3D10` | pressed/emphasis shade of accent |
| surf | `#489B8E` | `#1F4B3D` | deep native-bush green (secondary accent) |
| surfDim | `rgba(72,155,142,0.12)` | `rgba(31,75,61,0.12)` | |
| success | `#489B8E` | `#1F4B3D` | reuses `surf` — "completed"/visited state |
| successDim | `rgba(72,155,142,0.12)` | `rgba(31,75,61,0.10)` | |
| warning | `#C78B1A` | `#C78B1A` | unchanged, reads fine on light bg |
| warningDim | `rgba(199,139,26,0.12)` | `#FFF6E0` | |
| danger | `#CC3528` | `#DC2626` | |
| dangerDim | `rgba(204,53,40,0.12)` | `#FEF2F2` | |
| text | `#F0EDE6` | `#241A12` | warm near-black |
| text2 | `#DDD4CC` | `#6B5A48` | |
| textMuted | `#5E5650` | `#8C7A63` | |

`surf` and `success` intentionally share a value (both `#1F4B3D`) — same
relationship as the current dark palette, where `surf` and `success` are
already identical.

## Config changes

`app.config.ts`:
- `splash.backgroundColor`: `"#000000"` → `"#FBF7F1"` (prevents a black
  flash on launch before the app mounts).
- `android.adaptiveIcon.backgroundColor`: `"#000000"` → `"#FBF7F1"`.

## Status bar

`@blacksands/ui`'s `Screen` component already defaults
`statusBarStyle="dark-content"` (dark icons/text) — confirmed by reading the
compiled package. That's already correct for a light background, so no
screen needs an explicit override.

## Verification

No unit-testable surface here — this is a visual color swap. Verification is
manual: run the app and check every screen (map, sites list, sites detail,
sites reviews, account, auth/login, plus loading/error/empty states) against
the new palette for contrast issues, particularly:
- Disabled/pending states (e.g. syncing check-ins)
- Placeholder/hint text (`text2`, `textMuted`)
- Warning/danger banners on the new light background
- The launch splash screen and Android adaptive icon background

## Follow-up (separate spec)

Once this lands, the sites list/detail restyle (aklguide visual language —
bespoke hero, category tabs, featured card, check-in flow reskinned) is
planned separately and will build on this palette.
