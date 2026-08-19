# Native review prompt — app integration (rotorua-guide) — design

## Context

`@blacksands/hooks` (`enginev1/hooks`) has a `useReviewPrompt` hook, designed
and implemented per
`enginev1/hooks/docs/superpowers/specs/2026-08-18-review-prompt-design.md`.
That spec's "App integration (rotorua-guide)" section sketched this exact
follow-up as a starting point; this spec validates that sketch against the
current state of rotorua-guide's code (confirmed to match) and fixes one
error in it (see Call site below), then locks it in.

The hook is currently unreleased: `enginev1/hooks`'s local `main` is 4
commits ahead of `origin/main` (through `768e454`, "wire useReviewPrompt into
createHooks and export from package root"), still at package version
`0.4.4` with no bump/tag/publish. rotorua-guide's `package.json` pins
`@blacksands/hooks` at `^0.4.4`, so its installed copy doesn't have the hook.

Decisions carried forward from the shared-package brainstorm (not
re-litigated here):

- Trigger: first itinerary created (count 0 → 1) — not check-ins (removed
  per `2026-08-17-remove-completion-gating-design.md`), not a session/app-open
  counter.
- Repeat policy: none app-side. Relies entirely on iOS/Android's own native
  throttling.
- Scope: one trigger only (first itinerary). Additional call sites are
  future, unplanned work — the hook's plain-callable API needs no new
  plumbing to add them later.

## Release: `@blacksands/hooks` 0.4.5

Prerequisite task, before any rotorua-guide code changes.

In `enginev1/hooks`:
1. Bump `package.json` version `0.4.4` → `0.4.5`.
2. Commit (`chore: release 0.4.5 — useReviewPrompt`), tag `v0.4.5`.
3. **Confirm with the user before pushing** — `git push origin main --tags`
   triggers `publish.yml`, a real publish to GitHub Packages. Same gate used
   for the 0.4.2 release (`docs/superpowers/plans/2026-08-12-claim-link-entitlements-hooks.md`).
4. Verify: `npm view @blacksands/hooks versions --registry=https://npm.pkg.github.com`
   lists `0.4.5`.

In `rotorua-guide`:
5. Bump `package.json`'s `@blacksands/hooks` to `^0.4.5`.
6. `npm install`, confirm the installed copy exports `useReviewPrompt`.

## `package.json` / `lib/hooksBag.ts`

Add `expo-store-review` via `npx expo install expo-store-review` (not a
hand-picked version pin — `expo install` resolves the version compatible
with this project's SDK 57, matching how every other `expo-*` dependency in
this `package.json` is pinned).

In `lib/hooksBag.ts`, add the adapter to the existing `createHooks()` config,
alongside `locationSource`/`netInfo`:

```ts
import * as StoreReview from "expo-store-review";
// ...
storeReview: {
  isAvailable: () => StoreReview.isAvailableAsync(),
  requestReview: () => StoreReview.requestReview(),
},
```

Add `useReviewPrompt` to the destructured export block at the bottom of the
file (the block isn't alphabetized — the existing 26 names are in ad hoc
order — so just append it).

## Call site: `lib/hooks/useItineraries.ts`

The design-doc sketch called `hooksBag.useReviewPrompt().requestReview()`
directly inside `saveMutation`'s `onSuccess`. That doesn't work:
`useReviewPrompt` is itself a hook (uses `useCallback` internally) and can
only be called during render, not inside a callback. Fixed shape:

```ts
export function useItineraries() {
  const { session } = useSession();
  const uid = session.status === "authed" ? session.uid : null;
  const queryClient = useQueryClient();
  const { requestReview } = hooksBag.useReviewPrompt();

  const queryKey = ["rotoruaguide", "itineraries", uid];

  const { data: itineraries = [], isLoading, error, refetch } = useQuery({ ... }); // unchanged

  const preSaveCountRef = useRef(itineraries.length);
  preSaveCountRef.current = itineraries.length;

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Itinerary>) => itineraryService.saveItinerary(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey });
      if (!variables.id && preSaveCountRef.current === 0) {
        requestReview();
      }
    },
  });
  // ...
}
```

- `preSaveCountRef` is updated unconditionally on every render (not in a
  `useEffect`) so it always holds the count as of the most recent render
  before `onSuccess` fires — no risk of a stale closure.
- `!variables.id` mirrors `itineraryService.saveItinerary`'s own
  create-vs-update branch (`if (itin.id) { ...update... } else { ...create...
  }`) — a present `id` means update, absent means create. Confirmed this
  stays the single choke point regardless of which screen calls
  `saveItinerary` (itinerary tab, "Add to Trip" from a site detail page,
  `ItinerariesCard` on profile).
- `hooksBag.useReviewPrompt()` requires `import { hooksBag } from
  "@/lib/hooksBag"` — the file currently doesn't import `hooksBag` (it uses
  bare `itineraryService`), so this is a new import.
- `useRef` needs a new import from `"react"`.

## Error handling

None needed at the call site. `useReviewPrompt`'s `requestReview()` already
swallows both `isAvailable()` and `requestReview()` adapter failures
internally (per the shared-package design — native review-prompt failures
are non-fatal and never surface to the caller). The call here is
fire-and-forget: no `await`, no try/catch, and it never blocks or affects
the itinerary-save success path.

## Testing

rotorua-guide has no existing unit-test harness for hook files (unlike
`enginev1/hooks`, which has `test/useReviewPrompt.test.ts` covering the
primitive itself). The branchy logic added here (`!variables.id &&
preSaveCountRef.current === 0`) gets a manual QA pass instead, run once after
implementation:

1. Fresh/guest-converted account, zero itineraries → create first itinerary
   → native review prompt appears (or silently no-ops if the OS has already
   capped this install/device — expected per iOS/Android throttling, not a
   bug).
2. Same account, now with 1+ itineraries → create a second itinerary →
   prompt does not fire again from this app-side condition.
3. Edit an existing itinerary (has `id`) → prompt does not fire.

## Out of scope

- Any change to `@blacksands/hooks` itself beyond the 0.4.5 release — the
  hook's implementation is already merged on that repo's `main`.
- AKL Guide or any other sibling app — `storeReview` adapter stays
  unconfigured there.
- Additional trigger call sites (e.g. after a completed photo share) — not
  wired up by this spec, can be added later as a plain `requestReview()`
  call once that hook is available in a render scope.
- Any app-side "ask once" bookkeeping — deliberately absent, per the
  shared-package design's repeat policy.
