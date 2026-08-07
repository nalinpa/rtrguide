# Itinerary Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full time-grid itinerary/trip-planner feature — create trips, drag-and-drop schedule sites into 30-minute slots across multiple days, with auto-repositioning around collisions and transit gaps — replacing the "Coming soon" stub already wired into the tab bar, and replacing the itinerary placeholder on the site detail screen with the real add-to-trip flow.

**Architecture:** Ports aklguide's actual implementation (`aklguide/mobile`, read in full: `app/(app)/(tabs)/plans.tsx`, `lib/utils/itineraryPhysics.ts`, `lib/utils/transitMatrix.ts`, `lib/constants/gameplay.ts`, `components/plans/CreateItineraryModal.tsx`, `components/plans/EditItemModal.tsx`) onto rotorua-guide's existing patterns: `@blacksands/client`'s REST itineraries API (no Firestore involved), `@blacksands/components`' generic `TimelineBlock`/`TransitBlock`/`TripChoiceSheet`/`EmptyItineraryState` (reused as-is, confirmed present in this repo's installed package), `lib/uiKit.ts` primitives, and `lib/ui/tokens.ts` colors. Deviates from aklguide in one structural way: aklguide's single `plans.tsx` (list + picker + timeline, switched by local state) is split here into two routes — `itinerary/index.tsx` (list/picker/create/delete) and `itinerary/[itineraryId].tsx` (day timeline) — since this is fresh code, not a legacy file being preserved.

**Tech Stack:** React Native / Expo Router, TypeScript, `@blacksands/client` (REST itineraries API), `@blacksands/components` (`TimelineBlock`, `TransitBlock`, `TripChoiceSheet`, `EmptyItineraryState`), `@tanstack/react-query`, `react-native-ui-datepicker` + `dayjs` (new), `expo-crypto` (new).

## Global Constraints

- **Depends on both prior plans having executed**: `docs/superpowers/plans/2026-08-07-app-theme-update.md` (palette in `lib/ui/tokens.ts`) and `docs/superpowers/plans/2026-08-07-sites-list-detail-restyle.md` (creates `lib/models.ts` with `Site`/`Checkpoint`/`SiteCategory`, and rewrites `sites/[siteId]/index.tsx` into the bespoke form with `SiteActionsBar` and the `Alert.alert` "+ Add to Itinerary" placeholder this plan replaces). Task 1 appends to `lib/models.ts`, it does not create it. Task 11 modifies `sites/[siteId]/index.tsx` assuming its post-restyle form. If either prior plan hasn't run, run it first.
- Templates and a real transit-time matrix are explicitly out of scope (per the spec) — `CreateItineraryModal` has no template picker, `getRequiredTransitSlots` returns a flat default for every non-identical site pair.
- No test framework exists in this repo. Every task's verification step is `npm run typecheck`; final behavior is confirmed in Task 12's manual walkthrough.
- Colors come from `tokens` (`@/lib/ui/tokens`) throughout — same flat palette every other rotorua-guide screen uses, not a separate theme file. Text/buttons/cards reuse `AppText`/`AppButton`/`CardShell`/`Stack`/`Row` from `lib/uiKit.ts` wherever they fit.
- `TimelineBlock`, `TransitBlock`, `TripChoiceSheet`, `EmptyItineraryState` come from `components` (`@/lib/uiKit`'s re-export of `@blacksands/components`) — used as-is, not rebuilt. Confirmed prop signatures by reading the compiled source directly (`node_modules/@blacksands/components/dist/index.js`).
- Itineraries require an authenticated account (`useItineraries` is `enabled: !!uid`) — guests see a sign-in prompt, matching how saved sites and reviews already handle guests.
- Spec: `docs/superpowers/specs/2026-08-07-itinerary-design.md`

---

### Task 1: Data model + gameplay constants

**Files:**
- Modify: `lib/models.ts` (append)
- Create: `lib/constants/gameplay.ts`

**Interfaces:**
- Produces: `Itinerary`, `ItineraryDay`, `ItineraryItem` types; `PLANNER` constant (`SLOT_HEIGHT`, `MAX_GRID_SLOTS`, `MAX_ITINERARIES`) — used by every later task.

- [ ] **Step 1: Append itinerary types to `lib/models.ts`**

Add to the end of `lib/models.ts` (after the existing `Site`/`Checkpoint`/`SiteCategory` exports from the sites-restyle plan):

```ts
export type ItineraryItem = {
  id: string;
  siteId: string;
  siteName: string;
  slotIndex: number;
  timeLabel: string;
  durationLabel: string;
  durationSlots: number;
  imageUrl?: string;
};

export type ItineraryDay = {
  id: string;
  date: string;
  items: ItineraryItem[];
};

export type Itinerary = {
  id: string;
  userId: string;
  title: string;
  startDate: string;
  endDate: string;
  days: ItineraryDay[];
  createdAt: string;
  updatedAt: string;
};
```

- [ ] **Step 2: Create `lib/constants/gameplay.ts`**

```ts
export const PLANNER = {
  // Height of one 30-minute slot in pixels — must stay in sync with the timeline grid
  SLOT_HEIGHT: 60,
  // Total 30-min slots from 8:00 AM to 10:00 PM
  MAX_GRID_SLOTS: 28,
  MAX_ITINERARIES: 3,
} as const;
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add lib/models.ts lib/constants/gameplay.ts
git commit -m "feat: add itinerary data model and planner constants"
```

---

### Task 2: Scheduling utilities — transit matrix + physics engine

**Files:**
- Create: `lib/utils/transitMatrix.ts`
- Create: `lib/utils/itineraryPhysics.ts`

**Interfaces:**
- Consumes: `PLANNER.MAX_GRID_SLOTS` (Task 1), `ItineraryItem` (Task 1).
- Produces: `getRequiredTransitSlots(fromSiteId, toSiteId): number`, `slotsToDurationLabel(durationSlots): string`, `slotIndexToTimeLabel(slotIndex): string`, `runPhysicsEngine(items): ItineraryItem[]` — consumed by Tasks 7, 8, and 10 (the screens/modal that actually schedule items; Task 5's `CreateItineraryModal` doesn't need them since it only creates empty days).

- [ ] **Step 1: Create `lib/utils/transitMatrix.ts`**

Flat default per the spec — no Rotorua-specific matrix data. Same signature as aklguide's version (which itself falls back to `1` for any pair not in its Auckland matrix — this is that fallback, applied universally):

```ts
export function getRequiredTransitSlots(fromSiteId: string, toSiteId: string): number {
  if (fromSiteId === toSiteId) return 0;
  return 1; // flat default (30 min) -- no precomputed matrix yet, see spec
}
```

- [ ] **Step 2: Create `lib/utils/itineraryPhysics.ts`**

Ported directly from `aklguide/mobile/lib/utils/itineraryPhysics.ts` — pure scheduling logic, no Auckland-specific data, only the import path changes:

```ts
import { getRequiredTransitSlots } from "./transitMatrix";
import { PLANNER } from "@/lib/constants/gameplay";
import type { ItineraryItem } from "@/lib/models";

const { MAX_GRID_SLOTS } = PLANNER;

// Grid starts at 8:00 AM; each slot is 30 minutes
export function slotsToDurationLabel(durationSlots: number): string {
  const hours = durationSlots / 2;
  return `${hours} Hour${hours !== 1 ? "s" : ""}`;
}

export function slotIndexToTimeLabel(slotIndex: number): string {
  const totalMinutes = 8 * 60 + slotIndex * 30;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function forwardCascade(packed: ItineraryItem[]): ItineraryItem[] {
  for (let i = 1; i < packed.length; i++) {
    const prev = packed[i - 1];
    const curr = packed[i];
    const transitRequired = getRequiredTransitSlots(prev.siteId, curr.siteId);
    const prevEnd = (prev.slotIndex || 0) + (prev.durationSlots || 2) + transitRequired;
    if ((curr.slotIndex || 0) < prevEnd) {
      packed[i] = { ...curr, slotIndex: prevEnd };
    }
  }
  return packed;
}

export function runPhysicsEngine(items: ItineraryItem[]): ItineraryItem[] {
  if (items.length === 0) return items;
  let packed = [...items];

  // Forward cascade: push items right when they collide
  packed = forwardCascade(packed);

  // Reverse cascade: bounce back from the 10 PM hard limit
  const lastIdx = packed.length - 1;
  const lastItemEnd = (packed[lastIdx].slotIndex || 0) + (packed[lastIdx].durationSlots || 2);

  if (lastItemEnd > MAX_GRID_SLOTS) {
    packed[lastIdx] = {
      ...packed[lastIdx],
      slotIndex: MAX_GRID_SLOTS - (packed[lastIdx].durationSlots || 2),
    };

    for (let i = lastIdx - 1; i >= 0; i--) {
      const curr = packed[i];
      const next = packed[i + 1];
      const transitRequired = getRequiredTransitSlots(curr.siteId, next.siteId);
      const latestAllowedStart = (next.slotIndex || 0) - transitRequired - (curr.durationSlots || 2);

      if ((curr.slotIndex || 0) > latestAllowedStart) {
        packed[i] = { ...curr, slotIndex: Math.max(0, latestAllowedStart) };
      }
    }

    // Re-run forward cascade to resolve any overlaps created by clamping to slot 0
    packed = forwardCascade(packed);
  }

  // Normalise timeLabel for every item so it always reflects the current slotIndex
  return packed.map((item) => ({
    ...item,
    timeLabel: slotIndexToTimeLabel(item.slotIndex || 0),
  }));
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add lib/utils/transitMatrix.ts lib/utils/itineraryPhysics.ts
git commit -m "feat: port itinerary scheduling physics engine and transit matrix"
```

---

### Task 3: Itinerary data layer — API client, service, hook

**Files:**
- Modify: `lib/api/index.ts`
- Create: `lib/services/itineraryService.ts`
- Create: `lib/hooks/useItineraries.ts`

**Interfaces:**
- Consumes: `Itinerary` (Task 1).
- Produces: `itinerariesApi` (exported from `lib/api/index.ts`), `itineraryService.{getMyItineraries, saveItinerary, deleteItinerary}`, and the hook `useItineraries(): { itineraries: Itinerary[], loading: boolean, error: string | null, saveItinerary: (data: Partial<Itinerary>) => Promise<string>, deleteItinerary: (id: string) => Promise<void>, isSaving: boolean }` — consumed by every screen/modal task from here on.

- [ ] **Step 1: Add the itineraries API client**

In `lib/api/index.ts`, add below the existing `client` export:

```ts
import { createItinerariesApi } from "@blacksands/client/itineraries";

export const itinerariesApi = createItinerariesApi("rotoruaguide", { getToken });
```

(`getToken` is already imported for the existing `client` export — reuse it, don't re-import.)

- [ ] **Step 2: Create the service**

```ts
// lib/services/itineraryService.ts
import { itinerariesApi } from "@/lib/api";
import type { Itinerary } from "@/lib/models";

export const itineraryService = {
  async getMyItineraries(): Promise<Itinerary[]> {
    const { itineraries } = await itinerariesApi.list();
    return itineraries;
  },
  async saveItinerary(itin: Partial<Itinerary>): Promise<string> {
    if (itin.id) {
      const { itinerary } = await itinerariesApi.update(itin.id, itin);
      return itinerary.id;
    }
    const { itinerary } = await itinerariesApi.create({
      title: itin.title,
      startDate: itin.startDate!,
      endDate: itin.endDate!,
      days: itin.days,
    });
    return itinerary.id;
  },
  async deleteItinerary(id: string): Promise<void> {
    await itinerariesApi.remove(id);
  },
};
```

- [ ] **Step 3: Create the hook**

```ts
// lib/hooks/useItineraries.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { itineraryService } from "@/lib/services/itineraryService";
import { useSession } from "@/lib/providers/SessionProvider";
import type { Itinerary } from "@/lib/models";

export function useItineraries() {
  const { session } = useSession();
  const uid = session.status === "authed" ? session.uid : null;
  const queryClient = useQueryClient();

  const queryKey = ["rotoruaguide", "itineraries", uid];

  const { data: itineraries = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: () => itineraryService.getMyItineraries(),
    enabled: !!uid,
  });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Itinerary>) => itineraryService.saveItinerary(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => itineraryService.deleteItinerary(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    itineraries,
    loading: isLoading,
    error: error ? "Couldn't load your trips." : null,
    saveItinerary: saveMutation.mutateAsync,
    deleteItinerary: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add lib/api/index.ts lib/services/itineraryService.ts lib/hooks/useItineraries.ts
git commit -m "feat: add itinerary API client, service, and useItineraries hook"
```

---

### Task 4: New dependencies

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: `react-native-ui-datepicker` and `dayjs` installed (both consumed by Task 5's date picker), `expo-crypto` installed (consumed by Task 8's `randomUUID`, for generating new day IDs).

- [ ] **Step 1: Install the Expo-managed native dependency**

Run: `npx expo install expo-crypto`
Expected: adds `expo-crypto` to `package.json` at the version matching this project's Expo SDK (57) — `expo install` resolves the correct version automatically, don't hand-pick one.

- [ ] **Step 2: Install the date picker**

Run: `npx expo install react-native-ui-datepicker`
Expected: adds `react-native-ui-datepicker` to `package.json`.

- [ ] **Step 3: Install `dayjs` explicitly**

`react-native-ui-datepicker` depends on `dayjs` internally (confirmed in its own `package.json`), and `CreateItineraryModal` (Task 5) imports it directly — declare it explicitly rather than relying on transitive resolution.

Run: `npm install dayjs`
Expected: adds `dayjs` to `package.json` `dependencies`.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add expo-crypto, react-native-ui-datepicker, dayjs"
```

---

### Task 5: `CreateItineraryModal` component

**Files:**
- Create: `components/itinerary/CreateItineraryModal.tsx`

**Interfaces:**
- Consumes: `useItineraries` (Task 3), `ApiError` from `@blacksands/client`, `AppText`/`AppButton`/`CardShell` from `@/lib/uiKit`, `tokens` from `@/lib/ui/tokens`. (Doesn't need Task 2's physics/transit utilities — created days start empty, no scheduling to run yet.)
- Produces: `CreateItineraryModal` component, props `{ visible: boolean, onClose: () => void, onCreated: (id: string) => void }` — consumed by Task 6 and Task 10.

- [ ] **Step 1: Create the component**

Adapted from `aklguide/mobile/components/plans/CreateItineraryModal.tsx` — template picker removed entirely (out of scope per spec), `theme`/`space` (aklguide's `kitten-theme`) replaced with `tokens` (`@/lib/ui/tokens`), typography replaced with literal styles since there's no separate typography scale here.

```tsx
// components/itinerary/CreateItineraryModal.tsx
import { useEffect, useState } from "react";
import { View, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView } from "react-native";
import { ApiError } from "@blacksands/client";
import { X, Minus, Plus, ChevronDown, CalendarDays } from "lucide-react-native";
import DateTimePicker from "react-native-ui-datepicker";
import dayjs from "dayjs";

import { CardShell, AppButton, AppText } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { useItineraries } from "@/lib/hooks/useItineraries";

type CreateItineraryModalProps = {
  visible: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
};

function tomorrow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-NZ", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function CreateItineraryModal({ visible, onClose, onCreated }: CreateItineraryModalProps) {
  const { itineraries, saveItinerary, isSaving } = useItineraries();

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(tomorrow());
  const [numDays, setNumDays] = useState(3);
  const [showCalendar, setShowCalendar] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setTitle("");
      setStartDate(tomorrow());
      setNumDays(3);
      setShowCalendar(false);
      setErrorMsg(null);
    }
  }, [visible]);

  const handleCreate = async () => {
    setErrorMsg(null);

    const resolvedTitle = title.trim() || "Rotorua Trip";
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + numDays - 1);

    const newStart = isoDate(startDate);
    const newEnd = isoDate(endDate);
    const conflict = itineraries.find(
      (itin) => newStart <= itin.endDate && newEnd >= itin.startDate,
    );
    if (conflict) {
      setErrorMsg(`Dates overlap with "${conflict.title}". Choose different dates.`);
      return;
    }

    const days = Array.from({ length: numDays }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return { id: `day_${i + 1}`, date: isoDate(d), items: [] };
    });

    try {
      const savedId = await saveItinerary({
        title: resolvedTitle,
        startDate: isoDate(startDate),
        endDate: isoDate(endDate),
        days,
      });
      onCreated(savedId ?? "");
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrorMsg("Those dates overlap an existing trip. Pick a different range.");
      } else {
        setErrorMsg("Failed to create trip. Try again.");
      }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.wrapper}>
          <CardShell status="basic" style={styles.card}>
            <View style={styles.header}>
              <AppText style={styles.title}>New Trip</AppText>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X color={tokens.colors.text2} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false} keyboardShouldPersistTaps="handled">
              <AppText style={styles.label}>Trip Name</AppText>
              <TextInput
                style={styles.input}
                placeholder="Optional — defaults to Rotorua Trip"
                placeholderTextColor={tokens.colors.textMuted}
                value={title}
                onChangeText={setTitle}
                autoCapitalize="words"
                returnKeyType="done"
              />

              <AppText style={styles.label}>Start Date</AppText>
              <TouchableOpacity style={styles.dateInput} onPress={() => setShowCalendar((o) => !o)} activeOpacity={0.7}>
                <CalendarDays size={16} color={tokens.colors.text2} />
                <AppText style={styles.dateInputText}>{formatDate(startDate)}</AppText>
                <ChevronDown
                  size={16}
                  color={tokens.colors.text2}
                  style={{ transform: [{ rotate: showCalendar ? "180deg" : "0deg" }] }}
                />
              </TouchableOpacity>
              {showCalendar && (
                <View style={styles.calendarWrapper}>
                  <DateTimePicker
                    mode="single"
                    date={startDate}
                    onChange={({ date }) => {
                      if (date) {
                        setStartDate(dayjs(date).toDate());
                        setShowCalendar(false);
                      }
                    }}
                    minDate={new Date()}
                    styles={{
                      selected: { backgroundColor: tokens.colors.accent },
                      selected_label: { color: "#FFFFFF" },
                      day_label: { color: tokens.colors.text },
                      today_label: { color: tokens.colors.accent },
                      month_selector_label: { color: tokens.colors.text },
                      year_selector_label: { color: tokens.colors.text },
                      weekday_label: { color: tokens.colors.text2 },
                    }}
                  />
                </View>
              )}

              <AppText style={styles.label}>Number of Days</AppText>
              <View style={styles.stepperRow}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setNumDays((n) => Math.max(1, n - 1))}>
                  <Minus color={tokens.colors.accent} size={20} />
                </TouchableOpacity>
                <View style={styles.stepCenter}>
                  <AppText style={styles.daysText}>
                    {numDays} {numDays === 1 ? "day" : "days"}
                  </AppText>
                </View>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setNumDays((n) => Math.min(14, n + 1))}>
                  <Plus color={tokens.colors.accent} size={20} />
                </TouchableOpacity>
              </View>

              {errorMsg && <AppText style={styles.errorText}>{errorMsg}</AppText>}

              <AppButton variant="primary" onPress={handleCreate} loading={isSaving} loadingLabel="Creating..." fullWidth>
                Create Trip
              </AppButton>
            </ScrollView>
          </CardShell>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(36,26,18,0.6)", justifyContent: "flex-end" },
  wrapper: { margin: tokens.space.md, marginBottom: 40, maxHeight: "90%" },
  card: { borderRadius: tokens.radius.xl },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: tokens.space.sm },
  title: { fontSize: 20, fontWeight: "800", color: tokens.colors.text },
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: tokens.colors.text2, marginTop: tokens.space.md },
  input: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    paddingVertical: 14,
    fontSize: 15,
    color: tokens.colors.text,
    backgroundColor: tokens.colors.bgCard,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: tokens.colors.bgCard,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.xs,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  stepBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", backgroundColor: tokens.colors.bgElevated, borderRadius: tokens.radius.md },
  stepCenter: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    paddingVertical: 14,
    backgroundColor: tokens.colors.bgCard,
  },
  dateInputText: { fontSize: 15, color: tokens.colors.text, flex: 1 },
  calendarWrapper: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.bgCard,
    overflow: "hidden",
    marginTop: 4,
  },
  daysText: { fontSize: 20, fontWeight: "800", color: tokens.colors.accent },
  errorText: { fontSize: 12, color: tokens.colors.danger, marginTop: tokens.space.sm },
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add components/itinerary/CreateItineraryModal.tsx
git commit -m "feat: add CreateItineraryModal"
```

---

### Task 6: Trip list/picker screen

**Files:**
- Modify: `app/(app)/(tabs)/itinerary/index.tsx` (replaces the "Coming soon" stub)

**Interfaces:**
- Consumes: `useItineraries` (Task 3), `CreateItineraryModal` (Task 5), `PLANNER.MAX_ITINERARIES` (Task 1), `components.EmptyItineraryState` (`@blacksands/components`).
- Produces: nothing consumed by later tasks directly, but this is the screen `router.push("/(app)/(tabs)/itinerary/[itineraryId]")` from here on assumes exists as the next step for the user.

- [ ] **Step 1: Replace the stub**

```tsx
// app/(app)/(tabs)/itinerary/index.tsx
import { useEffect, useState } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Calendar, ChevronRight, Plus } from "lucide-react-native";

import { Screen, LoadingState, CardShell, Stack, AppText, components } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { useSession } from "@/lib/providers/SessionProvider";
import { useItineraries } from "@/lib/hooks/useItineraries";
import { PLANNER } from "@/lib/constants/gameplay";
import { CreateItineraryModal } from "@/components/itinerary/CreateItineraryModal";

function formatTripDates(startDate: string, endDate: string): string {
  const fmt = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
  if (!endDate || endDate === startDate) return fmt(startDate);
  return `${fmt(startDate)} — ${fmt(endDate)}`;
}

export default function ItineraryListPage() {
  const { session } = useSession();
  const { itineraries, loading } = useItineraries();
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (itineraries.length === 1) {
      router.replace(`/(app)/(tabs)/itinerary/${itineraries[0].id}`);
    }
  }, [itineraries]);

  if (session.status === "guest") {
    return (
      <Screen>
        <Stack gap="md" style={styles.paddedSection}>
          <AppText variant="h1">Itinerary</AppText>
          <CardShell status="surf" onPress={() => router.push("/(auth)/login")}>
            <Stack gap="xs">
              <AppText variant="sectionTitle">Sign In to Plan a Trip</AppText>
              <AppText variant="label" status="hint">
                Create an account to build and save a Rotorua itinerary.
              </AppText>
            </Stack>
          </CardShell>
        </Stack>
      </Screen>
    );
  }

  if (session.status === "loading" || loading) {
    return (
      <Screen>
        <LoadingState label="Loading your trips..." />
      </Screen>
    );
  }

  if (itineraries.length === 0) {
    return (
      <>
        <components.EmptyItineraryState
          onCreateNew={() => setIsCreating(true)}
          onBrowse={() => router.push("/(app)/(tabs)/sites")}
          description="Create a trip and start adding Rotorua's sites, walks, and hidden gems to build your perfect itinerary."
          browseLabel="Browse Rotorua Sites"
        />
        <CreateItineraryModal
          visible={isCreating}
          onClose={() => setIsCreating(false)}
          onCreated={(id) => {
            setIsCreating(false);
            router.replace(`/(app)/(tabs)/itinerary/${id}`);
          }}
        />
      </>
    );
  }

  // itineraries.length === 1 redirects via the effect above — this only
  // renders the picker when there's more than one trip.
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <AppText variant="h1">My Trips</AppText>
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {itineraries.map((itin) => (
          <TouchableOpacity
            key={itin.id}
            style={styles.tripCard}
            onPress={() => router.push(`/(app)/(tabs)/itinerary/${itin.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.tripCardIcon}>
              <Calendar size={22} color={tokens.colors.accent} />
            </View>
            <View style={styles.tripCardInner}>
              <AppText style={styles.tripCardTitle} numberOfLines={1}>
                {itin.title}
              </AppText>
              <AppText style={styles.tripCardMeta}>
                {formatTripDates(itin.startDate, itin.endDate)}
                {itin.days?.length ? ` · ${itin.days.length} ${itin.days.length === 1 ? "day" : "days"}` : ""}
              </AppText>
            </View>
            <ChevronRight size={20} color={tokens.colors.text2} />
          </TouchableOpacity>
        ))}

        {itineraries.length < PLANNER.MAX_ITINERARIES && (
          <TouchableOpacity style={styles.tripCardCreate} onPress={() => setIsCreating(true)} activeOpacity={0.7}>
            <Plus size={18} color={tokens.colors.accent} />
            <AppText style={styles.tripCardCreateText}>Create new trip</AppText>
          </TouchableOpacity>
        )}
      </ScrollView>

      <CreateItineraryModal
        visible={isCreating}
        onClose={() => setIsCreating(false)}
        onCreated={(id) => {
          setIsCreating(false);
          if (id) router.replace(`/(app)/(tabs)/itinerary/${id}`);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.colors.bgBase },
  paddedSection: { paddingHorizontal: 16, paddingTop: 12 },
  header: { paddingHorizontal: tokens.space.md, paddingTop: tokens.space.md, paddingBottom: 16 },
  body: { padding: tokens.space.md, gap: 14, paddingBottom: 40 },
  tripCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: tokens.colors.bgCard,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  tripCardIcon: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.accentDim,
    alignItems: "center",
    justifyContent: "center",
  },
  tripCardInner: { flex: 1, gap: 5 },
  tripCardTitle: { fontSize: 18, fontWeight: "700", color: tokens.colors.text },
  tripCardMeta: { fontSize: 14, color: tokens.colors.text2 },
  tripCardCreate: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: tokens.radius.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: tokens.colors.accent,
    marginTop: 6,
  },
  tripCardCreateText: { fontSize: 15, fontWeight: "600", color: tokens.colors.accent },
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/\(tabs\)/itinerary/index.tsx
git commit -m "feat: replace itinerary stub with trip list/picker screen"
```

---

### Task 7: Day timeline screen — static grid (no drag yet)

**Files:**
- Create: `app/(app)/(tabs)/itinerary/[itineraryId].tsx`

**Interfaces:**
- Consumes: `useItineraries` (Task 3), `runPhysicsEngine`/`slotIndexToTimeLabel` (Task 2), `PLANNER` (Task 1), `components.TimelineBlock`/`components.TransitBlock` (`@blacksands/components`, drag callbacks wired as no-ops in this task, made functional in Task 8).
- Produces: a viewable (not yet interactive) day timeline — Task 8 replaces this file's contents with the fully interactive version. This intermediate version is real, working code (renders correctly, day tabs switch), not a placeholder — it's the smallest independently-checkable slice before drag/save/auto-repair logic is layered on.

- [ ] **Step 1: Create the screen**

```tsx
// app/(app)/(tabs)/itinerary/[itineraryId].tsx
import { useMemo, useState } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Plus } from "lucide-react-native";

import { LoadingState, AppText, components } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { useItineraries } from "@/lib/hooks/useItineraries";
import { runPhysicsEngine } from "@/lib/utils/itineraryPhysics";
import { getRequiredTransitSlots } from "@/lib/utils/transitMatrix";
import { PLANNER } from "@/lib/constants/gameplay";

const { SLOT_HEIGHT, MAX_GRID_SLOTS } = PLANNER;

const generateTimeSlots = () => {
  const slots = [];
  for (let i = 0; i <= MAX_GRID_SLOTS; i++) {
    const totalMinutes = 8 * 60 + i * 30;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    slots.push({
      id: `${hours}:${minutes.toString().padStart(2, "0")}`,
      label: minutes === 0 ? `${displayHour}:00 ${ampm}` : "",
    });
  }
  return slots;
};
const TIME_SLOTS = generateTimeSlots();

export default function ItineraryDetailPage() {
  const { itineraryId } = useLocalSearchParams<{ itineraryId: string }>();
  const { itineraries, loading } = useItineraries();
  const trip = itineraries.find((i) => i.id === itineraryId);

  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const activeDay = trip?.days.find((d) => d.id === activeDayId) ?? trip?.days[0];

  const sortedItems = useMemo(() => {
    if (!activeDay?.items) return [];
    const sorted = [...activeDay.items].sort((a, b) => (a.slotIndex || 0) - (b.slotIndex || 0));
    return runPhysicsEngine(sorted);
  }, [activeDay?.items]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingState label="Loading your trip..." />
      </SafeAreaView>
    );
  }

  if (!trip) {
    router.replace("/(app)/(tabs)/itinerary");
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <AppText variant="h1" style={styles.title}>
          {trip.title || "My Trip"}
        </AppText>
      </View>

      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {trip.days.map((day, index) => {
            const isActive = day.id === (activeDayId ?? trip.days[0]?.id);
            return (
              <TouchableOpacity key={day.id} onPress={() => setActiveDayId(day.id)} style={styles.dayTab}>
                <AppText style={[styles.dayTabText, isActive && styles.dayTabTextActive]}>Day {index + 1}</AppText>
                {isActive && <View style={styles.dayTabIndicator} />}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={styles.addDayBtn}>
            <Plus color={tokens.colors.accent} size={16} />
            <AppText style={styles.addDayText}>Add Day</AppText>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.timelineScroll}>
        <View style={styles.timelineContainer}>
          {TIME_SLOTS.map((slot) => {
            const isHour = slot.label !== "";
            return (
              <View key={slot.id} style={styles.gridRow}>
                <View style={styles.timeLabelContainer}>
                  {isHour ? <AppText style={styles.timeLabel}>{slot.label}</AppText> : null}
                </View>
                <View style={isHour ? styles.hourDivider : styles.halfHourDivider} />
              </View>
            );
          })}

          {sortedItems.map((item, index) => {
            const nextItem = sortedItems[index + 1];
            if (!nextItem) return null;
            const transitSize = getRequiredTransitSlots(item.siteId, nextItem.siteId);
            const nextStartSlot = nextItem.slotIndex || 0;
            const departureSlot = nextStartSlot - transitSize;
            return (
              <components.TransitBlock
                key={`transit_${item.id}`}
                transitSize={transitSize}
                top={departureSlot * SLOT_HEIGHT}
                height={transitSize * SLOT_HEIGHT}
              />
            );
          })}

          {sortedItems.map((item) => (
            <components.TimelineBlock
              key={item.id}
              item={item}
              maxSlots={TIME_SLOTS.length}
              slotHeight={SLOT_HEIGHT}
              onDrop={(_itemId: string, requestedSlotIndex: number) => requestedSlotIndex}
              onDragStart={() => {}}
              onDragEnd={() => {}}
              onEdit={() => {}}
            />
          ))}

          {sortedItems.length === 0 && (
            <View style={styles.emptyDayCard}>
              <AppText variant="body" style={styles.emptyDayTitle}>
                Nothing here yet
              </AppText>
              <AppText variant="label" status="hint" style={styles.emptyDayBody}>
                Tap the bookmark icon on any place to add it to this day.
              </AppText>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.colors.bgBase },
  header: { paddingHorizontal: tokens.space.md, paddingTop: tokens.space.md, paddingBottom: 12 },
  title: { fontSize: 24 },
  tabContainer: { borderBottomWidth: 1, borderBottomColor: tokens.colors.borderSubtle },
  tabScroll: { paddingHorizontal: tokens.space.md, alignItems: "center" },
  dayTab: { paddingHorizontal: 14, paddingVertical: 12, position: "relative", alignItems: "center" },
  dayTabText: { fontSize: 14, fontWeight: "600", color: tokens.colors.text2 },
  dayTabTextActive: { color: tokens.colors.accent, fontWeight: "700" },
  dayTabIndicator: { position: "absolute", bottom: -1, left: 8, right: 8, height: 2, backgroundColor: tokens.colors.accent, borderRadius: 1 },
  addDayBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 6 },
  addDayText: { fontSize: 14, fontWeight: "600", color: tokens.colors.accent },
  timelineScroll: { flex: 1 },
  timelineContainer: { position: "relative", paddingTop: tokens.space.md, paddingBottom: 100 },
  gridRow: { flexDirection: "row", height: SLOT_HEIGHT, alignItems: "flex-start" },
  timeLabelContainer: { width: 70, alignItems: "flex-end", paddingRight: tokens.space.sm },
  timeLabel: { position: "absolute", top: -8, fontSize: 11, fontWeight: "700", color: tokens.colors.text2 },
  hourDivider: { flex: 1, borderTopWidth: 1, borderTopColor: tokens.colors.border },
  halfHourDivider: { flex: 1, borderTopWidth: 1, borderTopColor: tokens.colors.borderSubtle },
  emptyDayCard: {
    marginHorizontal: 82,
    marginTop: 40,
    backgroundColor: tokens.colors.bgCard,
    borderWidth: 1.5,
    borderColor: tokens.colors.border,
    borderStyle: "dashed",
    borderRadius: tokens.radius.lg,
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
  },
  emptyDayTitle: { fontWeight: "700", color: tokens.colors.text },
  emptyDayBody: { textAlign: "center" },
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/\(tabs\)/itinerary/\[itineraryId\].tsx
git commit -m "feat: add day timeline screen (static grid rendering)"
```

---

### Task 8: Day timeline screen — drag-and-drop, save-flush, auto-repair

**Files:**
- Modify: `app/(app)/(tabs)/itinerary/[itineraryId].tsx` (full rewrite of Task 7's version)

**Interfaces:**
- Consumes: everything from Task 7 plus `saveItinerary`/`deleteItinerary` (Task 3, now actually used).
- Produces: the fully interactive timeline screen — the `activeDayId`/`localTrip`/`flushSave` shape here is what Task 9 (`EditItemModal` wiring) and Task 11 (site-detail navigation params `jumpToDay`/`jumpToSlot`) build on.

Ported from `aklguide/mobile/app/(app)/(tabs)/plans.tsx`'s timeline-view logic (lines 109–330, 405–920 of that file), with the list/picker/trip-switching-modal portions removed (that's Task 6's screen instead — "Switch Trip" here just navigates back to it), and `theme`/`kitten-theme` replaced with `tokens`.

- [ ] **Step 1: Replace the file**

```tsx
// app/(app)/(tabs)/itinerary/[itineraryId].tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, AppState, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Plus, MoreHorizontal, X } from "lucide-react-native";
import { randomUUID } from "expo-crypto";

import { LoadingState, AppText, components } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { useItineraries } from "@/lib/hooks/useItineraries";
import { runPhysicsEngine, slotsToDurationLabel } from "@/lib/utils/itineraryPhysics";
import { getRequiredTransitSlots } from "@/lib/utils/transitMatrix";
import { PLANNER } from "@/lib/constants/gameplay";
import type { Itinerary, ItineraryItem } from "@/lib/models";

const { SLOT_HEIGHT, MAX_GRID_SLOTS } = PLANNER;

const generateTimeSlots = () => {
  const slots = [];
  for (let i = 0; i <= MAX_GRID_SLOTS; i++) {
    const totalMinutes = 8 * 60 + i * 30;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    slots.push({
      id: `${hours}:${minutes.toString().padStart(2, "0")}`,
      label: minutes === 0 ? `${displayHour}:00 ${ampm}` : "",
    });
  }
  return slots;
};
const TIME_SLOTS = generateTimeSlots();

function localIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ItineraryDetailPage() {
  const { itineraryId, jumpToDay, jumpToSlot } = useLocalSearchParams<{
    itineraryId: string;
    jumpToDay?: string;
    jumpToSlot?: string;
  }>();
  const { itineraries, loading, saveItinerary, deleteItinerary } = useItineraries();
  const sourceTrip = itineraries.find((i) => i.id === itineraryId) ?? null;

  const [localTrip, setLocalTrip] = useState<Itinerary | null>(sourceTrip);
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const activeDay = localTrip?.days.find((d) => d.id === activeDayId) || localTrip?.days[0];
  const [localItems, setLocalItems] = useState<ItineraryItem[]>([]);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const freeGaps = useMemo(() => {
    const occupied = new Set<number>();
    for (let i = 0; i < localItems.length; i++) {
      const item = localItems[i];
      const start = item.slotIndex ?? 0;
      for (let s = start; s < start + (item.durationSlots ?? 2); s++) occupied.add(s);
      const next = localItems[i + 1];
      if (next) {
        const transit = getRequiredTransitSlots(item.siteId, next.siteId);
        const ns = next.slotIndex ?? 0;
        for (let s = Math.max(0, ns - transit); s < ns; s++) occupied.add(s);
      }
    }
    const gaps: { start: number; end: number }[] = [];
    let gs = -1;
    for (let s = 0; s < MAX_GRID_SLOTS; s++) {
      if (!occupied.has(s)) {
        if (gs === -1) gs = s;
      } else if (gs !== -1) {
        gaps.push({ start: gs, end: s });
        gs = -1;
      }
    }
    if (gs !== -1) gaps.push({ start: gs, end: MAX_GRID_SLOTS });
    return gaps.filter((g) => g.end - g.start >= 5);
  }, [localItems]);

  const latestItemsRef = useRef(localItems);
  const tripRef = useRef(localTrip);
  const activeDayIdRef = useRef(activeDay?.id);
  const hasUnsavedChanges = useRef(false);
  const saveItineraryRef = useRef(saveItinerary);
  const jumpAppliedRef = useRef(false);
  const correctedTripIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasUnsavedChanges.current) setLocalTrip(sourceTrip);
  }, [sourceTrip]);
  useEffect(() => {
    saveItineraryRef.current = saveItinerary;
  }, [saveItinerary]);
  useEffect(() => {
    latestItemsRef.current = localItems;
  }, [localItems]);
  useEffect(() => {
    tripRef.current = localTrip;
  }, [localTrip]);
  useEffect(() => {
    activeDayIdRef.current = activeDay?.id;
  }, [activeDay?.id]);
  useEffect(() => {
    if (localTrip?.days[0]?.id && !activeDayId) setActiveDayId(localTrip.days[0].id);
  }, [localTrip, activeDayId]);

  // On trip load, run physics across every day and save once if any overlaps were found
  useEffect(() => {
    if (!localTrip || hasUnsavedChanges.current) return;
    if (correctedTripIdRef.current === localTrip.id) return;
    correctedTripIdRef.current = localTrip.id;

    let anyFixed = false;
    const fixedDays = localTrip.days.map((day) => {
      const sorted = [...(day.items ?? [])].sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0));
      const packed = runPhysicsEngine(sorted);
      const needsFix = sorted.some((item, i) => item.slotIndex !== packed[i].slotIndex);
      if (!needsFix) return day;
      anyFixed = true;
      return { ...day, items: packed };
    });

    if (anyFixed) {
      const fixedTrip = { ...localTrip, days: fixedDays };
      setLocalTrip(fixedTrip);
      saveItineraryRef.current({ id: fixedTrip.id, days: fixedTrip.days });
    }
  }, [localTrip?.id]);

  useEffect(() => {
    if (activeDay?.items && !hasUnsavedChanges.current) {
      const sorted = [...activeDay.items].sort((a, b) => (a.slotIndex || 0) - (b.slotIndex || 0));
      const packed = runPhysicsEngine(sorted);
      const needsCorrection = sorted.some((item, i) => item.slotIndex !== packed[i].slotIndex);
      setLocalItems(packed);
      latestItemsRef.current = packed;
      if (needsCorrection) hasUnsavedChanges.current = true;
    }
  }, [activeDay?.id, activeDay?.items]);

  const flushSave = useCallback(() => {
    if (hasUnsavedChanges.current && tripRef.current && activeDayIdRef.current) {
      const currentTrip = tripRef.current;
      const updatedDays = currentTrip.days.map((day) =>
        day.id === activeDayIdRef.current ? { ...day, items: latestItemsRef.current } : day,
      );
      saveItineraryRef.current({ id: currentTrip.id, days: updatedDays });
      hasUnsavedChanges.current = false;
    }
  }, []);

  useFocusEffect(useCallback(() => () => flushSave(), [flushSave]));

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "background" || next === "inactive") flushSave();
    });
    return () => subscription.remove();
  }, [flushSave]);

  useEffect(() => {
    if (!jumpToDay || jumpAppliedRef.current || !localTrip) return;
    jumpAppliedRef.current = true;
    const dayExists = localTrip.days.some((d) => d.id === jumpToDay);
    if (dayExists && jumpToDay !== activeDayId) {
      flushSave();
      hasUnsavedChanges.current = false;
      setActiveDayId(jumpToDay);
    }
  }, [jumpToDay, jumpToSlot, localTrip, activeDayId, flushSave]);

  const handleDeleteItinerary = () => {
    if (!localTrip) return;
    Alert.alert("Delete Trip", `Delete "${localTrip.title || "this trip"}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteItinerary(localTrip.id);
          router.replace("/(app)/(tabs)/itinerary");
        },
      },
    ]);
  };

  const handleDeleteDay = (dayId: string) => {
    Alert.alert("Delete Day", "Remove this day? Any items on it will be lost.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          if (!localTrip) return;
          const currentActiveDayId = activeDayIdRef.current;
          const latestItems = latestItemsRef.current;
          const updatedDays = localTrip.days
            .filter((d) => d.id !== dayId)
            .map((d) => (d.id === currentActiveDayId && d.id !== dayId ? { ...d, items: latestItems } : d));
          const nextTrip = { ...localTrip, days: updatedDays };
          setLocalTrip(nextTrip);
          if (dayId === activeDayId) setActiveDayId(updatedDays[0]?.id ?? null);
          hasUnsavedChanges.current = false;
          saveItineraryRef.current({ id: nextTrip.id, days: nextTrip.days });
        },
      },
    ]);
  };

  const handleSwitchDay = (dayId: string) => {
    if (dayId === activeDayId) return;
    flushSave();
    hasUnsavedChanges.current = false;
    setActiveDayId(dayId);
  };

  const handleAddDay = async () => {
    if (!localTrip) return;
    flushSave();

    const validDates = localTrip.days.map((d) => d.date).filter((date) => !!date).sort();
    let nextDate = localIsoDate(new Date());
    if (validDates.length > 0) {
      const last = new Date(validDates[validDates.length - 1] + "T00:00:00");
      last.setDate(last.getDate() + 1);
      nextDate = localIsoDate(last);
    }

    const newDayId = `day_${randomUUID()}`;
    const newDay = { id: newDayId, date: nextDate, items: [] };
    const updatedDays = [...localTrip.days, newDay];
    const nextTrip = { ...localTrip, days: updatedDays };

    setLocalTrip(nextTrip);
    setActiveDayId(newDayId);
    await saveItineraryRef.current({ id: nextTrip.id, days: nextTrip.days });
  };

  const handleDrop = (itemId: string, requestedSlotIndex: number): number => {
    if (!localTrip || !activeDay) return requestedSlotIndex;

    const otherItems = localItems.filter((item) => item.id !== itemId);
    const movedItem = localItems.find((item) => item.id === itemId);
    if (!movedItem) return requestedSlotIndex;

    const itemSize = movedItem.durationSlots || 2;
    const targetSlot = Math.max(0, Math.min(requestedSlotIndex, MAX_GRID_SLOTS - itemSize));

    const getCenter = (item: ItineraryItem, isMovedItem: boolean) => {
      const start = isMovedItem ? targetSlot : item.slotIndex || 0;
      const duration = item.durationSlots || 2;
      return start + duration / 2;
    };

    let updatedItems = [...otherItems, { ...movedItem, slotIndex: targetSlot }];
    updatedItems.sort((a, b) => getCenter(a, a.id === itemId) - getCenter(b, b.id === itemId));
    updatedItems = runPhysicsEngine(updatedItems);

    const finalizedMovedItem = updatedItems.find((item) => item.id === itemId);
    const actualFinalSlot = finalizedMovedItem?.slotIndex ?? targetSlot;

    setLocalItems(updatedItems);
    latestItemsRef.current = updatedItems;
    hasUnsavedChanges.current = true;

    return actualFinalSlot;
  };

  const handleSaveEdit = (itemId: string, newDurationSlots: number) => {
    const label = slotsToDurationLabel(newDurationSlots);
    let updatedItems = localItems.map((item) =>
      item.id === itemId ? { ...item, durationSlots: newDurationSlots, durationLabel: label } : item,
    );
    updatedItems.sort((a, b) => (a.slotIndex || 0) - (b.slotIndex || 0));
    updatedItems = runPhysicsEngine(updatedItems);
    setLocalItems(updatedItems);
    latestItemsRef.current = updatedItems;
    hasUnsavedChanges.current = true;
    setEditingItem(null);
  };

  const handleRemoveItem = (itemId: string) => {
    let updatedItems = localItems.filter((item) => item.id !== itemId);
    updatedItems = runPhysicsEngine(updatedItems);
    setLocalItems(updatedItems);
    latestItemsRef.current = updatedItems;
    hasUnsavedChanges.current = true;
    setEditingItem(null);
  };

  const handleMoveDay = async (itemId: string, newDayId: string) => {
    const currentTrip = tripRef.current;
    const currentActiveDayId = activeDayIdRef.current;
    if (!currentTrip || !currentActiveDayId) return;

    const itemToMove = localItems.find((i) => i.id === itemId);
    if (!itemToMove) return;

    let updatedLocalItems = localItems.filter((i) => i.id !== itemId);
    updatedLocalItems = runPhysicsEngine(updatedLocalItems);
    setLocalItems(updatedLocalItems);
    latestItemsRef.current = updatedLocalItems;
    setEditingItem(null);

    const updatedDays = currentTrip.days.map((day) => {
      if (day.id === currentActiveDayId) return { ...day, items: updatedLocalItems };
      if (day.id === newDayId) {
        let newDayItems = [...(day.items || []), { ...itemToMove }];
        newDayItems.sort((a, b) => (a.slotIndex || 0) - (b.slotIndex || 0));
        newDayItems = runPhysicsEngine(newDayItems);
        return { ...day, items: newDayItems };
      }
      return day;
    });

    const nextTrip = { ...currentTrip, days: updatedDays };
    const newDayItems = updatedDays.find((d) => d.id === newDayId)?.items ?? [];

    setLocalTrip(nextTrip);
    setActiveDayId(newDayId);
    setLocalItems(newDayItems);
    latestItemsRef.current = newDayItems;

    hasUnsavedChanges.current = true;
    try {
      await saveItineraryRef.current({ id: nextTrip.id, days: nextTrip.days });
    } finally {
      hasUnsavedChanges.current = false;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingState label="Loading your trip..." />
      </SafeAreaView>
    );
  }

  if (!localTrip) {
    router.replace("/(app)/(tabs)/itinerary");
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <AppText variant="h1" style={styles.title}>
            {localTrip.title || "My Trip"}
          </AppText>
          <TouchableOpacity
            onPress={() =>
              Alert.alert(localTrip.title || "My Trip", undefined, [
                ...(itineraries.length > 1
                  ? [{ text: "Switch Trip", onPress: () => router.push("/(app)/(tabs)/itinerary") }]
                  : []),
                { text: "Delete Trip", style: "destructive" as const, onPress: handleDeleteItinerary },
                { text: "Cancel", style: "cancel" as const },
              ])
            }
            style={styles.headerBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MoreHorizontal size={20} color={tokens.colors.text2} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {localTrip.days.map((day, index) => {
            const isActive = day.id === activeDayId;
            const canDelete = isActive && index > 0;
            return (
              <TouchableOpacity key={day.id} onPress={() => handleSwitchDay(day.id)} style={styles.dayTab}>
                <View style={styles.dayTabContent}>
                  <AppText style={[styles.dayTabText, isActive && styles.dayTabTextActive]}>Day {index + 1}</AppText>
                  {canDelete && (
                    <TouchableOpacity
                      onPress={() => handleDeleteDay(day.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={styles.dayDeleteBtn}
                    >
                      <X size={14} color={tokens.colors.text2} strokeWidth={2.5} />
                    </TouchableOpacity>
                  )}
                </View>
                {isActive && <View style={styles.dayTabIndicator} />}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity onPress={handleAddDay} style={styles.addDayBtn}>
            <Plus color={tokens.colors.accent} size={16} />
            <AppText style={styles.addDayText}>Add Day</AppText>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.timelineScroll} scrollEnabled={!isDragging}>
        <View style={styles.timelineContainer}>
          {TIME_SLOTS.map((slot) => {
            const isHour = slot.label !== "";
            return (
              <View key={slot.id} style={styles.gridRow}>
                <View style={styles.timeLabelContainer}>
                  {isHour ? <AppText style={styles.timeLabel}>{slot.label}</AppText> : null}
                </View>
                <View style={isHour ? styles.hourDivider : styles.halfHourDivider} />
              </View>
            );
          })}

          {localItems.map((item, index) => {
            const nextItem = localItems[index + 1];
            if (!nextItem) return null;
            const transitSize = getRequiredTransitSlots(item.siteId, nextItem.siteId);
            const nextStartSlot = nextItem.slotIndex || 0;
            const departureSlot = nextStartSlot - transitSize;
            return (
              <components.TransitBlock
                key={`transit_${item.id}`}
                transitSize={transitSize}
                top={departureSlot * SLOT_HEIGHT}
                height={transitSize * SLOT_HEIGHT}
              />
            );
          })}

          {localItems.map((item) => (
            <components.TimelineBlock
              key={item.id}
              item={item}
              maxSlots={TIME_SLOTS.length}
              slotHeight={SLOT_HEIGHT}
              onDrop={handleDrop}
              onDragStart={() => {
                hasUnsavedChanges.current = true;
                setIsDragging(true);
              }}
              onDragEnd={() => setIsDragging(false)}
              onEdit={(item: ItineraryItem) => setEditingItem(item)}
            />
          ))}

          {localItems.length === 0 ? (
            <View style={styles.emptyDayCard}>
              <AppText variant="body" style={styles.emptyDayTitle}>
                Nothing here yet
              </AppText>
              <AppText variant="label" status="hint" style={styles.emptyDayBody}>
                Tap the bookmark icon on any place to add it to this day.
              </AppText>
            </View>
          ) : (
            freeGaps.map((gap) => (
              <View
                key={`gap_${gap.start}`}
                style={[styles.gapContainer, { top: gap.start * SLOT_HEIGHT, height: (gap.end - gap.start) * SLOT_HEIGHT }]}
              >
                <TouchableOpacity style={styles.gapCard} onPress={() => router.push("/(app)/(tabs)/sites")} activeOpacity={0.7}>
                  <AppText style={styles.gapCardText}>+ Find more things to do</AppText>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.colors.bgBase },
  header: { paddingHorizontal: tokens.space.md, paddingTop: tokens.space.md, paddingBottom: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 24 },
  headerBtn: { padding: 6, borderRadius: tokens.radius.sm, backgroundColor: tokens.colors.bgElevated },
  tabContainer: { borderBottomWidth: 1, borderBottomColor: tokens.colors.borderSubtle },
  tabScroll: { paddingHorizontal: tokens.space.md, alignItems: "stretch" },
  dayTab: { paddingHorizontal: 14, paddingVertical: 12, position: "relative", alignItems: "center" },
  dayTabContent: { flexDirection: "row", alignItems: "center", gap: 5 },
  dayDeleteBtn: { padding: 5, borderRadius: 10, backgroundColor: tokens.colors.bgElevated },
  dayTabText: { fontSize: 14, fontWeight: "600", color: tokens.colors.text2 },
  dayTabTextActive: { color: tokens.colors.accent, fontWeight: "700" },
  dayTabIndicator: { position: "absolute", bottom: -1, left: 8, right: 8, height: 2, backgroundColor: tokens.colors.accent, borderRadius: 1 },
  addDayBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 6 },
  addDayText: { fontSize: 14, fontWeight: "600", color: tokens.colors.accent },
  timelineScroll: { flex: 1 },
  timelineContainer: { position: "relative", paddingTop: tokens.space.md, paddingBottom: 100 },
  gridRow: { flexDirection: "row", height: SLOT_HEIGHT, alignItems: "flex-start" },
  timeLabelContainer: { width: 70, alignItems: "flex-end", paddingRight: tokens.space.sm },
  timeLabel: { position: "absolute", top: -8, fontSize: 11, fontWeight: "700", color: tokens.colors.text2 },
  hourDivider: { flex: 1, borderTopWidth: 1, borderTopColor: tokens.colors.border },
  halfHourDivider: { flex: 1, borderTopWidth: 1, borderTopColor: tokens.colors.borderSubtle },
  gapContainer: { position: "absolute", left: 82, right: tokens.space.md, alignItems: "center", justifyContent: "center" },
  gapCard: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  gapCardText: { fontSize: 14, fontWeight: "600", color: tokens.colors.text2 },
  emptyDayCard: {
    marginHorizontal: 82,
    marginTop: 40,
    backgroundColor: tokens.colors.bgCard,
    borderWidth: 1.5,
    borderColor: tokens.colors.border,
    borderStyle: "dashed",
    borderRadius: tokens.radius.lg,
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
  },
  emptyDayTitle: { fontWeight: "700", color: tokens.colors.text },
  emptyDayBody: { textAlign: "center" },
});
```

Tapping an item calls `setEditingItem`, and `handleSaveEdit`/`handleRemoveItem`/`handleMoveDay` are fully implemented, but nothing renders an edit UI yet in this task — `EditItemModal` doesn't exist until Task 9, which creates it and wires it into this same file.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/\(tabs\)/itinerary/\[itineraryId\].tsx
git commit -m "feat: wire drag-and-drop, save-flush, and auto-repair into the timeline screen"
```

---

### Task 9: `EditItemModal` component

**Files:**
- Create: `components/itinerary/EditItemModal.tsx`
- Modify: `app/(app)/(tabs)/itinerary/[itineraryId].tsx` (wire the modal into the screen Task 8 built)

**Interfaces:**
- Consumes: `PLANNER.MAX_GRID_SLOTS` (Task 1), `hooksBag.useLocation` (existing), `CardShell`/`AppButton` (`@/lib/uiKit`), `tokens`. Also consumes the `editingItem`/`setEditingItem` state and `handleSaveEdit`/`handleRemoveItem`/`handleMoveDay` handlers Task 8 already defined (unused there until this task renders the modal that calls them).
- Produces: `EditItemModal` component, props `{ item: ItineraryItem | null, currentDayId: string, availableDays: { id: string; label: string; full?: boolean }[], onClose: () => void, onSave: (itemId: string, newDurationSlots: number) => void, onRemove: (itemId: string) => void, onMoveDay: (itemId: string, newDayId: string) => void }`.

- [ ] **Step 1: Create the component**

Adapted from `aklguide/mobile/components/plans/EditItemModal.tsx` — `theme`/`space` replaced with `tokens`, `router.push("/sites/...")` corrected to rotorua-guide's actual route (`/(app)/(tabs)/sites/...`).

```tsx
// components/itinerary/EditItemModal.tsx
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ScrollView, Alert, InteractionManager } from "react-native";
import { router } from "expo-router";
import { X, Minus, Plus, ExternalLink, Image as ImageIcon, Trash2, ArrowRight } from "lucide-react-native";

import { CardShell, AppButton } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { PLANNER } from "@/lib/constants/gameplay";
import { hooksBag } from "@/lib/hooksBag";
import type { ItineraryItem } from "@/lib/models";

function ItemImage({ imageUrl, siteId }: { imageUrl?: string; siteId: string }) {
  const { location: site } = hooksBag.useLocation(imageUrl ? null : siteId);
  const uri = imageUrl || site?.imageThumbnailUrl || site?.imageUrl;
  if (!uri) {
    return (
      <View style={styles.imagePlaceholder}>
        <ImageIcon color={tokens.colors.borderStrong} size={32} />
      </View>
    );
  }
  return <Image source={{ uri }} style={styles.image} />;
}

type DayOption = { id: string; label: string; full?: boolean };

type EditItemModalProps = {
  item: ItineraryItem | null;
  currentDayId: string;
  availableDays: DayOption[];
  onClose: () => void;
  onSave: (itemId: string, newDurationSlots: number) => void;
  onRemove: (itemId: string) => void;
  onMoveDay: (itemId: string, newDayId: string) => void;
};

export function EditItemModal({
  item,
  currentDayId,
  availableDays,
  onClose,
  onSave,
  onRemove,
  onMoveDay,
}: EditItemModalProps) {
  const [draftDuration, setDraftDuration] = useState(2);
  const [isMovingDay, setIsMovingDay] = useState(false);

  useEffect(() => {
    if (item) {
      setDraftDuration(item.durationSlots || 2);
      setIsMovingDay(false);
    }
  }, [item]);

  const adjustDuration = (amount: number) => {
    setDraftDuration((prev) => Math.max(1, Math.min(PLANNER.MAX_GRID_SLOTS, prev + amount)));
  };

  const handleSave = () => {
    if (item) onSave(item.id, draftDuration);
  };

  const handleRemove = () => {
    if (!item) return;
    Alert.alert("Remove from Trip", `Remove ${item.siteName} from your itinerary?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => onRemove(item.id) },
    ]);
  };

  const handleMove = (newDayId: string) => {
    if (!item || isMovingDay) return;
    setIsMovingDay(true);
    onMoveDay(item.id, newDayId);
  };

  const handleViewDetails = () => {
    if (!item) return;
    onClose();
    InteractionManager.runAfterInteractions(() => {
      router.push(`/(app)/(tabs)/sites/${item.siteId.trim()}`);
    });
  };

  if (!item) return null;

  const otherDays = availableDays.filter((d) => d.id !== currentDayId && !d.full);

  return (
    <Modal visible={!!item} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalWrapper}>
          <CardShell status="basic" style={styles.modalContent}>
            <View style={styles.imageContainer}>
              <ItemImage imageUrl={item.imageUrl} siteId={item.siteId} />
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X color="#FFFFFF" size={20} />
              </TouchableOpacity>
            </View>

            <View style={styles.infoSection}>
              <View style={styles.titleRow}>
                <Text style={styles.modalTitle} numberOfLines={2}>
                  {item.siteName}
                </Text>
                <TouchableOpacity style={styles.detailLink} onPress={handleViewDetails}>
                  <Text style={styles.detailText}>Details</Text>
                  <ExternalLink color={tokens.colors.accent} size={14} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.controlSection}>
              <Text style={styles.modalLabel}>Planned Duration</Text>
              <View style={styles.durationControl}>
                <TouchableOpacity style={styles.durationBtn} onPress={() => adjustDuration(-1)}>
                  <Minus color={tokens.colors.accent} size={24} />
                </TouchableOpacity>
                <Text style={styles.durationValue}>
                  {draftDuration / 2} {draftDuration === 2 ? "Hour" : "Hours"}
                </Text>
                <TouchableOpacity style={styles.durationBtn} onPress={() => adjustDuration(1)}>
                  <Plus color={tokens.colors.accent} size={24} />
                </TouchableOpacity>
              </View>
            </View>

            {otherDays.length > 0 && (
              <View style={styles.moveSection}>
                <Text style={styles.modalLabel}>Move to another day?</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moveScroll}>
                  {otherDays.map((day) => (
                    <TouchableOpacity
                      key={day.id}
                      style={[styles.moveBtn, isMovingDay && styles.moveBtnDisabled]}
                      onPress={() => handleMove(day.id)}
                      disabled={isMovingDay}
                    >
                      <ArrowRight color={tokens.colors.text2} size={16} />
                      <Text style={styles.moveBtnText}>{day.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.actionContainer}>
              <AppButton variant="primary" onPress={handleSave}>
                Save Changes
              </AppButton>
              <TouchableOpacity style={styles.removeBtn} onPress={handleRemove}>
                <Trash2 color={tokens.colors.danger} size={18} />
                <Text style={styles.removeText}>Remove from Trip</Text>
              </TouchableOpacity>
            </View>
          </CardShell>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(36,26,18,0.75)", justifyContent: "flex-end" },
  modalWrapper: { margin: tokens.space.md, marginBottom: 40 },
  modalContent: { padding: 0, borderRadius: tokens.radius.xl, overflow: "hidden" },
  imageContainer: { height: 160, width: "100%", position: "relative", backgroundColor: tokens.colors.bgElevated },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  imagePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoSection: { padding: tokens.space.lg, paddingBottom: tokens.space.md },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  modalTitle: { fontSize: 20, fontWeight: "800", flex: 1, marginRight: tokens.space.md, color: tokens.colors.text },
  detailLink: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: tokens.colors.accentDim,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
  },
  detailText: { fontSize: 11, fontWeight: "700", color: tokens.colors.accent, marginRight: 4 },
  controlSection: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.md },
  modalLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: tokens.colors.text2, marginBottom: tokens.space.sm },
  durationControl: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: tokens.colors.bgCard,
    padding: tokens.space.sm,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  durationBtn: { width: 48, height: 48, alignItems: "center", justifyContent: "center", backgroundColor: tokens.colors.bgElevated, borderRadius: tokens.radius.md },
  durationValue: { fontSize: 20, fontWeight: "800", color: tokens.colors.accent },
  moveSection: { paddingBottom: tokens.space.lg },
  moveScroll: { paddingHorizontal: tokens.space.lg, gap: 8 },
  moveBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: tokens.colors.bgElevated,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  moveBtnDisabled: { opacity: 0.5 },
  moveBtnText: { fontSize: 13, fontWeight: "700", color: tokens.colors.text2, marginLeft: 6 },
  actionContainer: { paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.lg },
  removeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: tokens.space.md, paddingVertical: tokens.space.sm },
  removeText: { fontWeight: "700", color: tokens.colors.danger, marginLeft: 8 },
});
```

- [ ] **Step 2: Wire the modal into the timeline screen**

In `app/(app)/(tabs)/itinerary/[itineraryId].tsx` (created by Task 8), add the import alongside the other local imports:

```tsx
import { EditItemModal } from "@/components/itinerary/EditItemModal";
```

Then add the modal just before the closing `</SafeAreaView>` at the end of the component's `return`, right after the timeline's closing `</ScrollView>`:

```tsx
      <EditItemModal
        item={editingItem}
        currentDayId={activeDayId || ""}
        availableDays={localTrip.days.map((d, idx) => {
          let full = false;
          if (editingItem) {
            const otherItems = d.items.filter((i) => i.id !== editingItem.id);
            const simulated = runPhysicsEngine([...otherItems, { ...editingItem, slotIndex: 0 }]);
            const last = simulated[simulated.length - 1];
            full = !!last && (last.slotIndex ?? 0) + (last.durationSlots ?? 2) > MAX_GRID_SLOTS;
          }
          return { id: d.id, label: `Day ${idx + 1}`, full };
        })}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEdit}
        onRemove={handleRemoveItem}
        onMoveDay={handleMoveDay}
      />
```

This is the same JSX Task 8's `TimelineBlock.onEdit` (`setEditingItem`) and its `handleSaveEdit`/`handleRemoveItem`/`handleMoveDay` handlers were already written for — they just had nothing rendering them until now.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add components/itinerary/EditItemModal.tsx app/\(app\)/\(tabs\)/itinerary/\[itineraryId\].tsx
git commit -m "feat: add EditItemModal and wire it into the timeline screen"
```

---

### Task 10: `AddToTripModal` component

**Files:**
- Create: `components/itinerary/AddToTripModal.tsx`

**Interfaces:**
- Consumes: `useItineraries` (Task 3), `runPhysicsEngine` (Task 2), `PLANNER` (Task 1), `AppButton`/`CardShell`/`AppText` (`@/lib/uiKit`), `tokens`.
- Produces: `AddToTripModal` component, props `{ site: { id: string; name: string; imageUrl?: string } | null, onClose: () => void, initialItineraryId?: string }` — consumed by Task 11.

- [ ] **Step 1: Create the component**

Not a direct port — aklguide's `AddToTripModal.tsx` wasn't fully read verbatim, so this is built from the spec's documented contract (itinerary picker if >1, day picker, morning/midday/afternoon/evening → fixed starting slot, duration stepper, runs the physics engine, rejects if it overflows the grid, navigates to the new item's day/slot on success) using the same visual patterns established in Tasks 5 and 9.

```tsx
// components/itinerary/AddToTripModal.tsx
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ScrollView } from "react-native";
import { router } from "expo-router";
import { X, Minus, Plus, Image as ImageIcon } from "lucide-react-native";

import { CardShell, AppButton } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { useItineraries } from "@/lib/hooks/useItineraries";
import { runPhysicsEngine } from "@/lib/utils/itineraryPhysics";
import { PLANNER } from "@/lib/constants/gameplay";
import type { ItineraryItem } from "@/lib/models";

const TIME_OF_DAY = [
  { key: "morning", label: "Morning", startSlot: 1 },
  { key: "midday", label: "Midday", startSlot: 6 },
  { key: "afternoon", label: "Afternoon", startSlot: 12 },
  { key: "evening", label: "Evening", startSlot: 18 },
] as const;

type AddToTripModalProps = {
  site: { id: string; name: string; imageUrl?: string } | null;
  onClose: () => void;
  initialItineraryId?: string | null;
};

export function AddToTripModal({ site, onClose, initialItineraryId }: AddToTripModalProps) {
  const { itineraries, saveItinerary, isSaving } = useItineraries();

  const [itineraryId, setItineraryId] = useState<string | null>(null);
  const [dayId, setDayId] = useState<string | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<(typeof TIME_OF_DAY)[number]["key"]>("morning");
  const [durationSlots, setDurationSlots] = useState(2);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!site) return;
    const preselected = initialItineraryId ?? (itineraries.length === 1 ? itineraries[0].id : null);
    setItineraryId(preselected);
    const trip = itineraries.find((i) => i.id === preselected);
    setDayId(trip?.days[0]?.id ?? null);
    setTimeOfDay("morning");
    setDurationSlots(2);
    setErrorMsg(null);
  }, [site, initialItineraryId, itineraries]);

  if (!site) return null;

  const selectedTrip = itineraries.find((i) => i.id === itineraryId);

  const handleAdd = async () => {
    setErrorMsg(null);
    if (!selectedTrip || !dayId) {
      setErrorMsg("Choose a trip and a day.");
      return;
    }
    const day = selectedTrip.days.find((d) => d.id === dayId);
    if (!day) return;

    const startSlot = TIME_OF_DAY.find((t) => t.key === timeOfDay)!.startSlot;
    const newItem: ItineraryItem = {
      id: `item_${Date.now()}`,
      siteId: site.id,
      siteName: site.name,
      slotIndex: startSlot,
      timeLabel: "",
      durationLabel: "",
      durationSlots,
      imageUrl: site.imageUrl,
    };

    let items = [...day.items, newItem];
    items.sort((a, b) => (a.slotIndex || 0) - (b.slotIndex || 0));
    items = runPhysicsEngine(items);

    const last = items[items.length - 1];
    if ((last.slotIndex ?? 0) + (last.durationSlots ?? 2) > PLANNER.MAX_GRID_SLOTS) {
      setErrorMsg("This day is full. Try a different day or shorten the visit.");
      return;
    }

    const placedItem = items.find((i) => i.id === newItem.id)!;
    const updatedDays = selectedTrip.days.map((d) => (d.id === dayId ? { ...d, items } : d));

    await saveItinerary({ id: selectedTrip.id, days: updatedDays });
    onClose();
    router.push({
      pathname: "/(app)/(tabs)/itinerary/[itineraryId]",
      params: { itineraryId: selectedTrip.id, jumpToDay: dayId, jumpToSlot: String(placedItem.slotIndex) },
    });
  };

  return (
    <Modal visible={!!site} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.wrapper}>
          <CardShell status="basic" style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>Add to Itinerary</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X color={tokens.colors.text2} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <View style={styles.siteRow}>
                {site.imageUrl ? (
                  <Image source={{ uri: site.imageUrl }} style={styles.siteImage} />
                ) : (
                  <View style={styles.siteImagePlaceholder}>
                    <ImageIcon color={tokens.colors.borderStrong} size={22} />
                  </View>
                )}
                <Text style={styles.siteName} numberOfLines={2}>
                  {site.name}
                </Text>
              </View>

              {itineraries.length > 1 && (
                <>
                  <Text style={styles.label}>Trip</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                    {itineraries.map((trip) => (
                      <TouchableOpacity
                        key={trip.id}
                        style={[styles.pill, itineraryId === trip.id && styles.pillActive]}
                        onPress={() => {
                          setItineraryId(trip.id);
                          setDayId(trip.days[0]?.id ?? null);
                        }}
                      >
                        <Text style={[styles.pillText, itineraryId === trip.id && styles.pillTextActive]} numberOfLines={1}>
                          {trip.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {selectedTrip && (
                <>
                  <Text style={styles.label}>Day</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                    {selectedTrip.days.map((day, idx) => (
                      <TouchableOpacity
                        key={day.id}
                        style={[styles.pill, dayId === day.id && styles.pillActive]}
                        onPress={() => setDayId(day.id)}
                      >
                        <Text style={[styles.pillText, dayId === day.id && styles.pillTextActive]}>Day {idx + 1}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              <Text style={styles.label}>Time of Day</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                {TIME_OF_DAY.map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.pill, timeOfDay === t.key && styles.pillActive]}
                    onPress={() => setTimeOfDay(t.key)}
                  >
                    <Text style={[styles.pillText, timeOfDay === t.key && styles.pillTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Duration</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setDurationSlots((n) => Math.max(1, n - 1))}>
                  <Minus color={tokens.colors.accent} size={20} />
                </TouchableOpacity>
                <View style={styles.stepCenter}>
                  <Text style={styles.durationText}>
                    {durationSlots / 2} {durationSlots === 2 ? "Hour" : "Hours"}
                  </Text>
                </View>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setDurationSlots((n) => Math.min(PLANNER.MAX_GRID_SLOTS, n + 1))}>
                  <Plus color={tokens.colors.accent} size={20} />
                </TouchableOpacity>
              </View>

              {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

              <AppButton variant="primary" onPress={handleAdd} loading={isSaving} loadingLabel="Adding..." fullWidth>
                Add to Trip
              </AppButton>
            </ScrollView>
          </CardShell>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(36,26,18,0.6)", justifyContent: "flex-end" },
  wrapper: { margin: tokens.space.md, marginBottom: 40, maxHeight: "90%" },
  card: { borderRadius: tokens.radius.xl },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: tokens.space.sm },
  title: { fontSize: 20, fontWeight: "800", color: tokens.colors.text },
  siteRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: tokens.space.sm },
  siteImage: { width: 48, height: 48, borderRadius: tokens.radius.md },
  siteImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  siteName: { flex: 1, fontSize: 16, fontWeight: "700", color: tokens.colors.text },
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: tokens.colors.text2, marginTop: tokens.space.md, marginBottom: tokens.space.sm },
  pillRow: { gap: 8, paddingBottom: 4 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.bgCard,
  },
  pillActive: { backgroundColor: tokens.colors.accent, borderColor: tokens.colors.accent },
  pillText: { fontSize: 13, fontWeight: "600", color: tokens.colors.text2 },
  pillTextActive: { color: "#FFFFFF" },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: tokens.colors.bgCard,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.xs,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  stepBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", backgroundColor: tokens.colors.bgElevated, borderRadius: tokens.radius.md },
  stepCenter: { flex: 1, alignItems: "center" },
  durationText: { fontSize: 18, fontWeight: "800", color: tokens.colors.accent },
  errorText: { fontSize: 12, color: tokens.colors.danger, marginTop: tokens.space.sm },
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add components/itinerary/AddToTripModal.tsx
git commit -m "feat: add AddToTripModal"
```

---

### Task 11: Site detail integration — replace the itinerary placeholder

**Files:**
- Modify: `app/(app)/(tabs)/sites/[siteId]/index.tsx`

**Precondition:** this task assumes the sites-list-detail-restyle plan has already executed, so this file is in its post-restyle bespoke form (per that plan's Task 10) — specifically, it has a block:

```tsx
<Pressable
  style={itineraryStyles.button}
  onPress={() =>
    Alert.alert("Add to Itinerary", `Coming soon — plan your visit to ${site.name}.`)
  }
>
  <AppText style={itineraryStyles.text}>+ Add to Itinerary</AppText>
</Pressable>
```

and a corresponding `itineraryStyles` `StyleSheet.create({...})` block at the bottom of the file. If that file doesn't match this shape, the sites-restyle plan hasn't run — run it first.

**Interfaces:**
- Consumes: `useItineraries` (Task 3), `components.TripChoiceSheet` (`@blacksands/components`), `CreateItineraryModal` (Task 5), `AddToTripModal` (Task 10), `PLANNER.MAX_ITINERARIES` (Task 1).
- Produces: nothing consumed by later tasks — leaf integration.

- [ ] **Step 1: Add the itinerary hook and modal state**

Add these imports near the top of `app/(app)/(tabs)/sites/[siteId]/index.tsx`, alongside the existing ones:

```tsx
import { useItineraries } from "@/lib/hooks/useItineraries";
import { PLANNER } from "@/lib/constants/gameplay";
import { CreateItineraryModal } from "@/components/itinerary/CreateItineraryModal";
import { AddToTripModal } from "@/components/itinerary/AddToTripModal";
```

Inside the component, add state and the itineraries hook (alongside the existing `useSavedSites()` call):

```tsx
const { itineraries } = useItineraries();
const [showTripChoice, setShowTripChoice] = useState(false);
const [isCreatingItinerary, setIsCreatingItinerary] = useState(false);
const [isAddingToTrip, setIsAddingToTrip] = useState(false);
const [pendingItineraryId, setPendingItineraryId] = useState<string | null>(null);
```

- [ ] **Step 2: Replace the placeholder button with the real branching handler**

Replace:

```tsx
<Pressable
  style={itineraryStyles.button}
  onPress={() =>
    Alert.alert("Add to Itinerary", `Coming soon — plan your visit to ${site.name}.`)
  }
>
  <AppText style={itineraryStyles.text}>+ Add to Itinerary</AppText>
</Pressable>
```

with:

```tsx
<Pressable
  style={itineraryStyles.button}
  onPress={() => {
    if (itineraries.length === 0) {
      setIsCreatingItinerary(true);
    } else if (itineraries.length < PLANNER.MAX_ITINERARIES) {
      setShowTripChoice(true);
    } else {
      setIsAddingToTrip(true);
    }
  }}
>
  <AppText style={itineraryStyles.text}>+ Add to Itinerary</AppText>
</Pressable>
```

(This is the same branching logic as `handleCheckIn`'s neighboring buttons in this file — no restyle of `itineraryStyles` needed, the button already reads as active rather than disabled; drop the `opacity: 0.6` and `borderStyle: "dashed"` from `itineraryStyles.button` now that it's a real action, not a placeholder — solid border, full opacity.)

- [ ] **Step 3: Add the three modals**

Add these just before the file's closing `components.ReviewModal` (or after it — order among sibling modals doesn't matter, React Native only renders the one whose `visible` prop is true):

```tsx
<components.TripChoiceSheet
  visible={showTripChoice}
  onClose={() => setShowTripChoice(false)}
  onAddToExisting={() => {
    setShowTripChoice(false);
    setIsAddingToTrip(true);
  }}
  onCreateNew={() => {
    setShowTripChoice(false);
    setIsCreatingItinerary(true);
  }}
/>

<CreateItineraryModal
  visible={isCreatingItinerary}
  onClose={() => setIsCreatingItinerary(false)}
  onCreated={(id) => {
    setIsCreatingItinerary(false);
    setPendingItineraryId(id);
    setIsAddingToTrip(true);
  }}
/>

<AddToTripModal
  site={
    isAddingToTrip
      ? { id: site.id, name: site.name, imageUrl: site.imageThumbnailUrl ?? site.imageUrl ?? undefined }
      : null
  }
  initialItineraryId={pendingItineraryId}
  onClose={() => {
    setIsAddingToTrip(false);
    setPendingItineraryId(null);
  }}
/>
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/\(tabs\)/sites/\[siteId\]/index.tsx
git commit -m "feat: wire real Add to Itinerary flow, replacing the placeholder"
```

---

### Task 12: Manual verification

**Files:** none (no code changes — confirms Tasks 1–11 work end-to-end)

- [ ] **Step 1: Start the app**

Run: `npm run start` (or `npm run ios` / `npm run android`), sign in with a real account.

- [ ] **Step 2: Trip list/picker**

- [ ] Guest session sees the sign-in prompt, not the empty state.
- [ ] Zero trips shows the empty state; "Create Your First Trip" opens `CreateItineraryModal`.
- [ ] One trip auto-redirects straight into its timeline (no picker screen shown).
- [ ] Creating a second trip and returning to `itinerary/index` shows the picker with both trips.
- [ ] "Create new trip" disappears once `PLANNER.MAX_ITINERARIES` (3) is reached.
- [ ] Date-range overlap with an existing trip is rejected with an inline error before creating.

- [ ] **Step 3: Day timeline**

- [ ] Day tabs switch correctly; "Add Day" appends a day with the next sequential date; deleting a day (not the first) removes it and its items.
- [ ] Dragging an item within the grid repositions it; dropping it onto another item's slot pushes items via the physics engine rather than overlapping.
- [ ] Dragging an item past the 10 PM grid ceiling clamps and reflows earlier items correctly (test with 3+ items on one day).
- [ ] `TransitBlock`s render between consecutive items with the flat 30-min default gap.
- [ ] Tapping an item opens `EditItemModal`: duration stepper adjusts and reflows on save; "Move to another day" moves the item and switches the active day; "Remove from Trip" deletes it (with confirmation).
- [ ] Background the app mid-drag (or switch days) without waiting — on return, the change is present (flush-on-blur/background works).
- [ ] "Switch Trip" (header menu, only shown with >1 trips) navigates back to the picker; "Delete Trip" removes it and redirects to `itinerary/index`.

- [ ] **Step 4: Add to Itinerary from site detail**

- [ ] With 0 trips: tapping "+ Add to Itinerary" opens `CreateItineraryModal` directly; after creating, `AddToTripModal` opens pre-selected to the new trip.
- [ ] With 1–2 trips: opens `TripChoiceSheet`; both branches (add to existing / create new) work.
- [ ] With `PLANNER.MAX_ITINERARIES` (3) trips: opens `AddToTripModal` directly, no choice sheet.
- [ ] After adding a site via `AddToTripModal`, navigation lands on the correct trip/day and the timeline scrolls to roughly the right slot.
- [ ] Adding to an already-full day shows the inline "day is full" error instead of silently failing or crashing.

- [ ] **Step 5: Record the result**

If every check passes, this plan is complete — no commit needed (no code changed in this task). If something fails, fix it in the owning task's file and re-run only the affected checks.
