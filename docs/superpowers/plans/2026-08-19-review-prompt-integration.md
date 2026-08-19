# Review Prompt App Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the native App Store review prompt into rotorua-guide, firing once when a user creates their first itinerary.

**Architecture:** `@blacksands/hooks`' `useReviewPrompt` hook (already implemented on that repo's `main`, unreleased) gets released as `0.4.5`, pulled into rotorua-guide, wired to an `expo-store-review` adapter in `lib/hooksBag.ts`, and called from `lib/hooks/useItineraries.ts`'s `saveMutation.onSuccess` when the save was a create (no `id` in the mutation arg) and the pre-mutation itinerary count was 0.

**Tech Stack:** TypeScript, Expo SDK 57, `expo-store-review`, `@tanstack/react-query` (`useMutation`), `@blacksands/hooks`.

**Spec:** `rotorua-guide/docs/superpowers/specs/2026-08-19-review-prompt-integration-design.md`

## Global Constraints

- Trigger is first-itinerary-created (count 0 → 1) only. No other call sites in this plan.
- No app-side "ask once" bookkeeping — rely entirely on OS-native throttling.
- `useReviewPrompt()` must be called during render (it's a hook), never inside `onSuccess`/callbacks — hoist it to the top of `useItineraries()` and close over the returned `requestReview` function.
- `requestReview()` already swallows all its own errors (verified in `@blacksands/hooks`'s `useReviewPrompt.ts`) — no try/catch, no `await`, no error UI needed at any call site in this plan.
- This repo (`rotorua-guide`) has no test harness (no `jest`/`vitest`, no `test` script, no `*.test.*` files) — verification here is manual QA + `tsc --noEmit`, not automated tests. `@blacksands/hooks`'s own `useReviewPrompt` already has unit test coverage in that repo; this plan doesn't duplicate it.

---

### Task 1: Release `@blacksands/hooks` 0.4.5

**Repo:** `c:\Users\User\source\enginev1\hooks` (NOT rotorua-guide — different repo, different working directory for every command in this task).

**Files:**
- Modify: `enginev1/hooks/package.json:3` (`"version"`)

**Interfaces:**
- Produces: `@blacksands/hooks@0.4.5` published to `https://npm.pkg.github.com`, containing `useReviewPrompt` (already implemented on `main` as of commit `768e454`) and the `storeReview`/`StoreReviewSource` types.

- [ ] **Step 1: Confirm local `main` has the hook and is ahead of `origin/main`**

```bash
cd "c:\Users\User\source\enginev1\hooks"
git log --oneline -5
git log origin/main..HEAD --oneline
```

Expected: `HEAD` is `768e454` ("feat: wire useReviewPrompt into createHooks and export from package root"), and the second command lists 4 commits (this one plus 3 earlier ones) not yet on `origin/main`. If `origin/main..HEAD` is empty, stop — the release has already shipped by other means; re-check `npm view @blacksands/hooks versions --registry=https://npm.pkg.github.com` before proceeding.

- [ ] **Step 2: Bump the version**

In `package.json`, change:
```json
  "version": "0.4.4",
```
to:
```json
  "version": "0.4.5",
```

- [ ] **Step 3: Commit and tag**

```bash
git add package.json
git commit -m "chore: release 0.4.5 — useReviewPrompt"
git tag v0.4.5
```

- [ ] **Step 4: Confirm with the user, then publish**

**Stop and confirm with the user before running the push below.** `git push origin main --tags` triggers this repo's `publish.yml` and publishes a real, visible package version to GitHub Packages. Do not push without explicit confirmation.

```bash
git push origin main --tags
```

- [ ] **Step 5: Verify the publish**

```bash
npm view @blacksands/hooks versions --registry=https://npm.pkg.github.com
```

Expected: `0.4.5` present in the output list.

---

### Task 2: Bump rotorua-guide's `@blacksands/hooks` dependency

**Depends on:** Task 1 (0.4.5 must exist on the registry before `npm install` can resolve it).

**Files:**
- Modify: `rotorua-guide/package.json:15`

**Interfaces:**
- Consumes: `@blacksands/hooks@0.4.5` from the registry (Task 1's output).
- Produces: `node_modules/@blacksands/hooks` containing `useReviewPrompt`, consumed by Task 3.

- [ ] **Step 1: Bump the version range**

In `rotorua-guide/package.json`, change:
```json
    "@blacksands/hooks": "^0.4.4",
```
to:
```json
    "@blacksands/hooks": "^0.4.5",
```

- [ ] **Step 2: Install**

```bash
cd "c:\Users\User\source\rotorua-guide"
npm install
```

- [ ] **Step 3: Verify the installed copy has the hook**

```bash
node -e "console.log(require('./node_modules/@blacksands/hooks/package.json').version)"
node -e "console.log(typeof require('./node_modules/@blacksands/hooks/dist/index.cjs').useReviewPrompt)"
```

Expected: first command prints `0.4.5`; second prints `function` (`useReviewPrompt` is a direct named export from the package root, per `enginev1/hooks/src/index.ts`, not only reachable via `createHooks()`'s returned object).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: bump @blacksands/hooks to 0.4.5"
```

---

### Task 3: Add `expo-store-review` and wire the adapter in `lib/hooksBag.ts`

**Depends on:** Task 2.

**Files:**
- Modify: `rotorua-guide/package.json` (new dependency, via `expo install` — don't hand-edit the version)
- Modify: `rotorua-guide/lib/hooksBag.ts`

**Interfaces:**
- Produces: `hooksBag.useReviewPrompt` — returns `{ requestReview: () => Promise<void> }`. Consumed by Task 4.

- [ ] **Step 1: Install `expo-store-review`**

```bash
cd "c:\Users\User\source\rotorua-guide"
npx expo install expo-store-review
```

This resolves and pins the version compatible with this project's Expo SDK 57 (matching how every other `expo-*` dependency in `package.json` is pinned) and adds it to `package.json` automatically.

- [ ] **Step 2: Add the adapter to `createHooks()`**

In `lib/hooksBag.ts`, add the import at the top (alongside the other `expo-*` imports):

```ts
import * as StoreReview from "expo-store-review";
```

Add `storeReview` to the `createHooks<Site>(client, { ... })` config object, after the existing `netInfo` block (before the closing `});`):

```ts
  netInfo: {
    fetch: async () => {
      const state = await NetInfo.fetch();
      return { isConnected: state.isConnected, isInternetReachable: state.isInternetReachable };
    },
    addEventListener: (cb) =>
      NetInfo.addEventListener((state) =>
        cb({ isConnected: state.isConnected, isInternetReachable: state.isInternetReachable }),
      ),
  },
  storeReview: {
    isAvailable: () => StoreReview.isAvailableAsync(),
    requestReview: () => StoreReview.requestReview(),
  },
});
```

- [ ] **Step 3: Export the hook**

In the destructured export block at the bottom of `lib/hooksBag.ts`, add `useReviewPrompt` as a new line (the block isn't alphabetized — just append):

```ts
export const {
  useMyCompletions,
  useCheckIn,
  useOfflineQueue,
  useMyReviews,
  useSubmitReview,
  useGPSGate,
  useDraftsStore,
  useTrackingStore,
  useGuestStore,
  useMapStore,
  useAppSettingsStore,
  useLocation,
  useLocations,
  usePublicReviews,
  useReportContent,
  useBlockUser,
  useBlockedUsers,
  useNearestUnvisited,
  useSortedRows,
  useNearestCheckpoint,
  useUserLocation,
  useLocationStore,
  useSyncManager,
  useMyReview,
  useLocationReviewsSummary,
  useEntitlements,
  useReviewPrompt,
} = hooksBag;
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: no errors referencing `hooksBag.ts` or `storeReview`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json lib/hooksBag.ts
git commit -m "feat: wire storeReview adapter and useReviewPrompt into hooksBag"
```

---

### Task 4: Fire the review prompt on first itinerary creation

**Depends on:** Task 3 (`hooksBag.useReviewPrompt` must exist).

**Files:**
- Modify: `rotorua-guide/lib/hooks/useItineraries.ts`

**Interfaces:**
- Consumes: `hooksBag.useReviewPrompt()` → `{ requestReview: () => Promise<void> }` (Task 3).
- Consumes: `itineraryService.saveItinerary(data: Partial<Itinerary>)` — existing, unchanged. A present `data.id` means update, absent means create (`lib/services/itineraryService.ts:9-21`).

- [ ] **Step 1: Add imports**

In `lib/hooks/useItineraries.ts`, change:

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@blacksands/client";

import { itineraryService } from "@/lib/services/itineraryService";
import { useSession } from "@/lib/providers/SessionProvider";
import type { Itinerary } from "@/lib/models";
```

to:

```ts
import { useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@blacksands/client";

import { hooksBag } from "@/lib/hooksBag";
import { itineraryService } from "@/lib/services/itineraryService";
import { useSession } from "@/lib/providers/SessionProvider";
import type { Itinerary } from "@/lib/models";
```

- [ ] **Step 2: Hoist `useReviewPrompt` and track the pre-mutation count**

Change:

```ts
export function useItineraries() {
  const { session } = useSession();
  const uid = session.status === "authed" ? session.uid : null;
  const queryClient = useQueryClient();

  const queryKey = ["rotoruaguide", "itineraries", uid];

  const { data: itineraries = [], isLoading, error, refetch } = useQuery({
```

to:

```ts
export function useItineraries() {
  const { session } = useSession();
  const uid = session.status === "authed" ? session.uid : null;
  const queryClient = useQueryClient();
  const { requestReview } = hooksBag.useReviewPrompt();

  const queryKey = ["rotoruaguide", "itineraries", uid];

  const { data: itineraries = [], isLoading, error, refetch } = useQuery({
```

Then, right after the `useQuery` block closes (after its `enabled: !!uid,\n  });`), add the ref, updated unconditionally every render:

```ts
  const preSaveCountRef = useRef(itineraries.length);
  preSaveCountRef.current = itineraries.length;
```

- [ ] **Step 3: Fire `requestReview()` on first-create in `onSuccess`**

Change:

```ts
  const saveMutation = useMutation({
    mutationFn: (data: Partial<Itinerary>) => itineraryService.saveItinerary(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
```

to:

```ts
  const saveMutation = useMutation({
    mutationFn: (data: Partial<Itinerary>) => itineraryService.saveItinerary(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey });
      if (!variables.id && preSaveCountRef.current === 0) {
        requestReview();
      }
    },
  });
```

`deleteMutation` is untouched — the trigger only applies to creates.

- [ ] **Step 4: Typecheck**

```bash
cd "c:\Users\User\source\rotorua-guide"
npm run typecheck
```

Expected: no errors. In particular, confirm `variables` in `onSuccess` is inferred as `Partial<Itinerary>` (the `mutationFn`'s parameter type) so `variables.id` type-checks without a cast.

- [ ] **Step 5: Manual QA**

No test harness exists in this repo (see Global Constraints), so verify by running the app (`npx expo start`, per this repo's `run` skill if one exists, otherwise `npm run ios`/`npm run android`):

1. Fresh or guest-converted account with zero itineraries → create the first itinerary → native review prompt appears (or silently no-ops if the OS/device has already hit its own throttle cap — expected, not a bug; check device console/Metro logs for a silently-caught error only if the itinerary UI itself misbehaves).
2. Same account, now with 1+ itineraries → create a second itinerary → prompt does not fire again from this condition.
3. Edit an existing itinerary (has `id`) → prompt does not fire.

- [ ] **Step 6: Commit**

```bash
git add lib/hooks/useItineraries.ts
git commit -m "feat: request native review prompt on first itinerary created"
```

---

## Self-Review Notes

- **Spec coverage:** Release (spec §"Release: @blacksands/hooks 0.4.5") → Task 1–2. Adapter wiring (spec §"package.json / lib/hooksBag.ts") → Task 3. Call site (spec §"Call site: lib/hooks/useItineraries.ts") → Task 4. Error handling (spec) → covered by Global Constraints, no dedicated task needed (nothing to build). Testing (spec) → Task 4 Step 5.
- **Placeholder scan:** no TBD/TODO; every step has literal code or an exact command.
- **Type consistency:** `requestReview: () => Promise<void>` used consistently between Task 3 (produced) and Task 4 (consumed). `hooksBag.useReviewPrompt()` return shape matches `enginev1/hooks/src/useReviewPrompt.ts`'s `{ requestReview }`.
- **Verified during drafting:** `useReviewPrompt` is exported two ways from `@blacksands/hooks` — directly from the package root (`enginev1/hooks/src/index.ts:41`, takes a `StoreReviewSource` adapter as its argument) and via `createHooks()`'s returned object (`hooksBag.useReviewPrompt`, reads `config.storeReview`, throws if unconfigured). Task 2 Step 3 checks the direct export as a lightweight "does this build include the symbol" smoke test; Task 4 uses the `hooksBag` form, matching every other hook call site in this app.
