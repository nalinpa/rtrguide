# Profile Page Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `app/(app)/(tabs)/account.tsx` to match aklguide's editorial profile-page layout (hero + promo card + stats row + sectioned cards), and add a profile-page entry point into the saved-places screen that already exists.

**Architecture:** Screen shell (hero, promo card, rounded sheet, stats row) stays inline in `account.tsx`. Four new components under `components/account/` hold the sectioned content, mirroring aklguide's own file split. All new layout is hand-rolled `StyleSheet` + `lib/ui/tokens.ts`; interactive elements reuse `lib/uiKit.ts` primitives where the existing codebase already does.

**Tech Stack:** React Native / Expo Router, TypeScript, `lib/uiKit.ts` (`@blacksands/ui`/`@blacksands/components`, consumed not modified), `@tanstack/react-query` (via existing hooks), `lucide-react-native`, `expo-router`.

## Global Constraints

- No test framework in this repo (no Jest, no test script — confirmed by `docs/superpowers/plans/2026-08-07-app-theme-update.md`). Every task's verification step is `npm run typecheck`; end-to-end behavior is confirmed in Task 6's manual walkthrough. Do not introduce a test framework.
- No new dependencies. `expo-haptics` and `@sentry/react-native` are already installed but are **not** used here — this plan reuses `account.tsx`'s existing delete-account logic verbatim rather than aklguide's Haptics/Sentry additions.
- No new routes. `/(app)/saved-sites` (built in `2026-08-07-sites-list-detail-restyle`) and `/(app)/(tabs)/itinerary/[itineraryId]` already exist and are reused as-is.
- Reuse `AppButton`, `AppText`, `Row`, `LoadingState` from `lib/uiKit.ts` for buttons/text/loading states. Hand-roll hero/promo/stats-row/list-row layout with `StyleSheet` + `tokens`, matching the precedent set by `docs/superpowers/plans/2026-08-07-sites-list-detail-restyle.md`.
- Color mapping (aklguide `theme.colors.*` → rotorua `tokens.colors.*`): `onSurface→text`, `onSurfaceVariant→text2`, `outline→textMuted`, `outlineVariant→border`, `surface→bgCard`, `background→bgBase`, `primary→accent`, `secondary→surf`, `error→danger`. Hero background is `tokens.colors.surf` (forest green), promo card is `tokens.colors.accent` (terracotta) — replacing aklguide's navy/blue.
- The danger-zone copy ("Permanently remove your visit history and reviews. This cannot be undone.", "Are you absolutely sure?", "All progress and reviews will be permanently erased from Rotorua Guide's records.", "Delete Everything", "Wait, keep my account") is rotorua's own existing wording from the current `account.tsx` — carry it over exactly, do not replace with aklguide's generic text.
- Spec: `docs/superpowers/specs/2026-08-10-profile-page-restyle-design.md`

---

### Task 1: `UserInfoCard` component

**Files:**
- Create: `components/account/UserInfoCard.tsx`

**Interfaces:**
- Consumes: `useSession()` from `@/lib/providers/SessionProvider` (returns `{ session: { status: "loading"|"guest"|"authed", ... }, disableGuest: () => Promise<void> }`, already used this way in current `app/(app)/(tabs)/account.tsx`); `auth` from `@/lib/firebase` (`auth.currentUser`, `auth.signOut()`); `tokens` from `@/lib/ui/tokens`; `AppButton`, `AppText`, `Row` from `@/lib/uiKit`.
- Produces: `UserInfoCard()` — a no-props component, consumed by Task 5.

- [ ] **Step 1: Create the component**

```tsx
// components/account/UserInfoCard.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { LogIn, LogOut } from "lucide-react-native";

import { AppButton, AppText, Row } from "@/lib/uiKit";
import { useSession } from "@/lib/providers/SessionProvider";
import { auth } from "@/lib/firebase";
import { tokens } from "@/lib/ui/tokens";

export function UserInfoCard() {
  const { session, disableGuest } = useSession();
  const isAuthed = session.status === "authed";
  const isGuest = session.status === "guest";

  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleLogout = async () => {
    setLogoutError(null);
    try {
      await disableGuest();
      await auth.signOut();
      router.replace("/(auth)/login");
    } catch {
      setLogoutError("Failed to log out. Please try again.");
    }
  };

  const handleSignIn = async () => {
    await disableGuest();
    router.replace("/(auth)/login");
  };

  if (isAuthed) {
    return (
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} activeOpacity={0.6}>
          <LogOut size={14} color={tokens.colors.text2} strokeWidth={2} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
        {logoutError && (
          <AppText variant="label" style={[styles.errorText, { color: tokens.colors.danger }]}>
            {logoutError}
          </AppText>
        )}
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>ACCESS</Text>
      <Text style={styles.guestBody}>
        {isGuest
          ? "You're browsing as a guest. Sign in to save your progress."
          : "Sign in to access your Rotorua Guide account."}
      </Text>
      <AppButton variant="primary" onPress={handleSignIn}>
        <Row gap="xs" align="center">
          <LogIn size={16} color="#fff" />
          <AppText variant="label" style={{ color: "#fff" }}>
            Sign In / Create Account
          </AppText>
        </Row>
      </AppButton>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: tokens.space.md,
    paddingVertical: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 3,
    textTransform: "uppercase",
    color: tokens.colors.text2,
    marginBottom: 12,
  },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingVertical: 4,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: "500",
    color: tokens.colors.text2,
    letterSpacing: 0.3,
  },
  errorText: {
    marginTop: 8,
  },
  guestBody: {
    fontSize: 15,
    fontWeight: "400",
    color: tokens.colors.text2,
    lineHeight: 22,
    marginBottom: 16,
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0. (This file isn't imported anywhere yet, so it only checks the file compiles standalone.)

- [ ] **Step 3: Commit**

```bash
git add components/account/UserInfoCard.tsx
git commit -m "feat: add UserInfoCard for profile page restyle"
```

---

### Task 2: `ItinerariesCard` component

**Files:**
- Create: `components/account/ItinerariesCard.tsx`

**Interfaces:**
- Consumes: `useItineraries()` from `@/lib/hooks/useItineraries` (returns `{ itineraries: Itinerary[], error: string | null, ... }`, where `Itinerary` has `id: string`, `title: string`, `startDate: string`, `endDate: string`); `PLANNER.MAX_ITINERARIES` from `@/lib/constants/gameplay` (currently `3`); `CreateItineraryModal` from `@/components/itinerary/CreateItineraryModal` (props `{ visible: boolean; onClose: () => void; onCreated: (id: string) => void }`, already built).
- Produces: `ItinerariesCard()` — a no-props component, consumed by Task 5.

- [ ] **Step 1: Create the component**

```tsx
// components/account/ItinerariesCard.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { ChevronRight, Plus } from "lucide-react-native";

import { AppText } from "@/lib/uiKit";
import { useItineraries } from "@/lib/hooks/useItineraries";
import { tokens } from "@/lib/ui/tokens";
import { PLANNER } from "@/lib/constants/gameplay";
import { CreateItineraryModal } from "@/components/itinerary/CreateItineraryModal";

function formatTripDates(startDate: string, endDate: string): string {
  const fmt = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
  if (!endDate || endDate === startDate) return fmt(startDate);
  return `${fmt(startDate)} — ${fmt(endDate)}`;
}

export function ItinerariesCard() {
  const { itineraries, error } = useItineraries();
  const atLimit = itineraries.length >= PLANNER.MAX_ITINERARIES;
  const [isCreating, setIsCreating] = useState(false);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>MY ITINERARIES</Text>
        {itineraries.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{itineraries.length}</Text>
          </View>
        )}
      </View>

      {itineraries.length === 0 ? (
        <Text style={styles.emptyText}>No itineraries yet.</Text>
      ) : (
        <View style={styles.list}>
          {itineraries.map((itinerary, index) => (
            <TouchableOpacity
              key={itinerary.id}
              style={styles.row}
              onPress={() => router.push(`/(app)/(tabs)/itinerary/${itinerary.id}`)}
              activeOpacity={0.6}
            >
              <Text style={styles.index}>{String(index + 1).padStart(2, "0")}</Text>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {itinerary.title}
                </Text>
                <Text style={styles.rowDate}>{formatTripDates(itinerary.startDate, itinerary.endDate)}</Text>
              </View>
              <ChevronRight size={14} color={tokens.colors.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {error && (
        <AppText variant="label" style={[styles.errorText, { color: tokens.colors.danger }]}>
          {error}
        </AppText>
      )}

      {atLimit ? (
        <Text style={styles.limitText}>Up to {PLANNER.MAX_ITINERARIES} itineraries allowed.</Text>
      ) : (
        <TouchableOpacity style={styles.createBtn} onPress={() => setIsCreating(true)} activeOpacity={0.6}>
          <Plus size={13} color={tokens.colors.accent} strokeWidth={2.5} />
          <Text style={styles.createBtnText}>New Itinerary</Text>
        </TouchableOpacity>
      )}

      <CreateItineraryModal
        visible={isCreating}
        onClose={() => setIsCreating(false)}
        onCreated={() => setIsCreating(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: tokens.space.md, paddingVertical: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 3,
    textTransform: "uppercase",
    color: tokens.colors.text2,
  },
  countBadge: {
    backgroundColor: tokens.colors.surf,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: { fontSize: 10, fontWeight: "700", color: "#FFFFFF" },
  emptyText: { fontSize: 14, fontWeight: "400", color: tokens.colors.textMuted, marginBottom: 16 },
  list: { marginBottom: 16, gap: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.border,
  },
  index: { fontSize: 11, fontWeight: "700", color: tokens.colors.surf, letterSpacing: 1, width: 20 },
  rowContent: { flex: 1, gap: 3 },
  rowTitle: { fontSize: 15, fontWeight: "600", color: tokens.colors.text, letterSpacing: -0.1 },
  rowDate: { fontSize: 12, fontWeight: "400", color: tokens.colors.text2, letterSpacing: 0.2 },
  errorText: { marginBottom: 12 },
  limitText: { fontSize: 12, fontWeight: "400", color: tokens.colors.textMuted, letterSpacing: 0.2 },
  createBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 4 },
  createBtnText: { fontSize: 13, fontWeight: "600", color: tokens.colors.accent, letterSpacing: 0.2 },
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add components/account/ItinerariesCard.tsx
git commit -m "feat: add ItinerariesCard for profile page restyle"
```

---

### Task 3: `SavedSitesCard` component

**Files:**
- Create: `components/account/SavedSitesCard.tsx`

**Interfaces:**
- Consumes: `useSavedSites()` from `@/lib/hooks/useSavedSites` (returns `{ savedSiteIds: Set<string>, ... }`); `hooksBag.useLocations()` from `@/lib/hooksBag` (returns `{ locations: Site[], ... }` where `Site` has `id: string`, `name: string`, per `lib/models.ts`); `AppButton`, `AppText` from `@/lib/uiKit`.
- Produces: `SavedSitesCard()` — a no-props component, consumed by Task 5. Routes to the existing `/(app)/saved-sites` and `/(app)/(tabs)/sites/[siteId]` routes — neither is created by this plan.

- [ ] **Step 1: Create the component**

```tsx
// components/account/SavedSitesCard.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";

import { AppButton, AppText } from "@/lib/uiKit";
import { useSavedSites } from "@/lib/hooks/useSavedSites";
import { hooksBag } from "@/lib/hooksBag";
import { tokens } from "@/lib/ui/tokens";

export function SavedSitesCard() {
  const { savedSiteIds } = useSavedSites();
  const { locations } = hooksBag.useLocations();
  const siteNameMap = React.useMemo(
    () => new Map(locations.map((s) => [s.id, s.name])),
    [locations],
  );
  const recentSavedSites = Array.from(savedSiteIds).slice(-3).reverse();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>SAVED PLACES</Text>
        {savedSiteIds.size > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{savedSiteIds.size}</Text>
          </View>
        )}
      </View>

      {recentSavedSites.length === 0 ? (
        <Text style={styles.emptyText}>No saved places yet.</Text>
      ) : (
        <View style={styles.list}>
          {recentSavedSites.map((siteId) => (
            <TouchableOpacity
              key={siteId}
              style={styles.row}
              onPress={() => router.push(`/(app)/(tabs)/sites/${siteId}`)}
              activeOpacity={0.6}
            >
              <Text style={styles.rowTitle} numberOfLines={1}>
                {siteNameMap.get(siteId) ?? siteId}
              </Text>
              <ChevronRight size={14} color={tokens.colors.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {savedSiteIds.size > 0 && (
        <AppButton variant="ghost" onPress={() => router.push("/(app)/saved-sites")}>
          <AppText variant="label" style={{ color: tokens.colors.surf }}>
            {savedSiteIds.size > recentSavedSites.length ? "View All Saved Places" : "Manage Saved Places"}
          </AppText>
        </AppButton>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: tokens.space.md, paddingVertical: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 3,
    textTransform: "uppercase",
    color: tokens.colors.text2,
  },
  countBadge: {
    backgroundColor: tokens.colors.surf,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: { fontSize: 10, fontWeight: "700", color: "#FFFFFF" },
  emptyText: { fontSize: 14, fontWeight: "400", color: tokens.colors.textMuted, marginBottom: 16 },
  list: { marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.border,
  },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: "600", color: tokens.colors.text, letterSpacing: -0.1, marginRight: 8 },
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0. If it fails on `locations.map`, confirm `hooksBag.useLocations()` still returns `{ locations: Site[] }` (check `app/(app)/saved-sites.tsx`, which uses the same hook).

- [ ] **Step 3: Commit**

```bash
git add components/account/SavedSitesCard.tsx
git commit -m "feat: add SavedSitesCard for profile page restyle"
```

---

### Task 4: `DangerZoneCard` component

**Files:**
- Create: `components/account/DangerZoneCard.tsx`

**Interfaces:**
- Consumes: `useSession()` (`disableGuest`); `auth` from `@/lib/firebase` (`auth.currentUser`); `userService.deleteAccount(user: User): Promise<void>` from `@/lib/services/userService`; `tokens` from `@/lib/ui/tokens`.
- Produces: `DangerZoneCard()` — a no-props component, consumed by Task 5. This is the same delete-account logic currently inline in `app/(app)/(tabs)/account.tsx` (lines 29–49 of the pre-restyle file), moved into its own component and restyled — not aklguide's version, which uses different copy and adds Haptics/Sentry this plan does not.

- [ ] **Step 1: Create the component**

```tsx
// components/account/DangerZoneCard.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Trash2, AlertTriangle } from "lucide-react-native";

import { useSession } from "@/lib/providers/SessionProvider";
import { auth } from "@/lib/firebase";
import { userService } from "@/lib/services/userService";
import { tokens } from "@/lib/ui/tokens";

export function DangerZoneCard() {
  const { disableGuest } = useSession();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setIsDeleting(true);
    setError(null);

    try {
      await userService.deleteAccount(user);
      await disableGuest();
      router.replace("/(auth)/login");
    } catch (e: any) {
      if (e.code === "auth/requires-recent-login") {
        setError("Security: Please log out and back in before deleting.");
      } else {
        setError("Error deleting data. Please try again.");
      }
      setShowConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ACCOUNT</Text>

        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Trash2 size={18} color={tokens.colors.danger} strokeWidth={2} />
          </View>

          <View style={styles.textWrap}>
            <Text style={styles.title}>Delete Account</Text>
            <Text style={styles.description}>
              Permanently remove your visit history and reviews. This cannot be undone.
            </Text>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.deleteBtn, isDeleting && styles.deleteBtnDisabled]}
              onPress={() => setShowConfirm(true)}
              disabled={isDeleting}
              activeOpacity={0.6}
            >
              <Text style={styles.deleteBtnText}>{isDeleting ? "Deleting…" : "Delete Account"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <AlertTriangle size={28} color={tokens.colors.danger} strokeWidth={2} />
            </View>

            <Text style={styles.modalTitle}>Are you absolutely sure?</Text>
            <Text style={styles.modalBody}>
              All progress and reviews will be permanently erased from Rotorua Guide's records.
            </Text>

            <TouchableOpacity
              style={[styles.confirmBtn, isDeleting && styles.deleteBtnDisabled]}
              onPress={handleDeleteAccount}
              disabled={isDeleting}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmBtnText}>{isDeleting ? "Deleting…" : "Delete Everything"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowConfirm(false)}
              disabled={isDeleting}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Wait, keep my account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: tokens.space.md, paddingVertical: 24 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 3,
    textTransform: "uppercase",
    color: tokens.colors.text2,
    marginBottom: 16,
  },
  row: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.dangerDim,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  textWrap: { flex: 1 },
  title: { fontSize: 15, fontWeight: "600", color: tokens.colors.text, marginBottom: 4 },
  description: { fontSize: 13, fontWeight: "400", color: tokens.colors.text2, lineHeight: 20, marginBottom: 14 },
  errorText: { fontSize: 12, color: tokens.colors.danger, marginBottom: 10, lineHeight: 18 },
  deleteBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: tokens.colors.danger,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  deleteBtnDisabled: { opacity: 0.4 },
  deleteBtnText: { fontSize: 13, fontWeight: "500", color: tokens.colors.danger, letterSpacing: 0.1 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(36,26,18,0.60)", justifyContent: "center", padding: tokens.space.lg },
  modalCard: { backgroundColor: tokens.colors.bgCard, borderRadius: tokens.radius.lg, padding: 28, alignItems: "center" },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.dangerDim,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: tokens.colors.text,
    letterSpacing: -0.3,
    marginBottom: 10,
    textAlign: "center",
  },
  modalBody: { fontSize: 14, color: tokens.colors.text2, lineHeight: 22, textAlign: "center", marginBottom: 28 },
  confirmBtn: {
    width: "100%",
    backgroundColor: tokens.colors.danger,
    borderRadius: tokens.radius.md,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 10,
  },
  confirmBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", letterSpacing: 0.1 },
  cancelBtn: { width: "100%", paddingVertical: 13, alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "500", color: tokens.colors.text2 },
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add components/account/DangerZoneCard.tsx
git commit -m "feat: add DangerZoneCard for profile page restyle"
```

---

### Task 5: Rebuild the `account.tsx` shell

**Files:**
- Modify: `app/(app)/(tabs)/account.tsx` (full rewrite)

**Interfaces:**
- Consumes: `UserInfoCard`, `ItinerariesCard`, `SavedSitesCard`, `DangerZoneCard` from Tasks 1–4; `useSession()`; `useItineraries()` (for `itineraries.length`); `useSavedSites()` (for `savedSiteIds.size`); `LoadingState` from `@/lib/uiKit`; `useSafeAreaInsets` from `react-native-safe-area-context` (already a dependency, used the same way in `app/(app)/saved-sites.tsx`).
- Produces: nothing consumed by later tasks — this is the screen entry point wired into the tab bar by the existing `app/(app)/(tabs)/_layout.tsx` (unchanged).

- [ ] **Step 1: Replace the file**

```tsx
// app/(app)/(tabs)/account.tsx
import React from "react";
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowRight } from "lucide-react-native";

import { auth } from "@/lib/firebase";
import { useSession } from "@/lib/providers/SessionProvider";
import { useItineraries } from "@/lib/hooks/useItineraries";
import { useSavedSites } from "@/lib/hooks/useSavedSites";
import { LoadingState } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import { UserInfoCard } from "@/components/account/UserInfoCard";
import { ItinerariesCard } from "@/components/account/ItinerariesCard";
import { SavedSitesCard } from "@/components/account/SavedSitesCard";
import { DangerZoneCard } from "@/components/account/DangerZoneCard";

export default function AccountScreen() {
  const { session } = useSession();
  const insets = useSafeAreaInsets();
  const { itineraries } = useItineraries();
  const { savedSiteIds } = useSavedSites();

  if (session.status === "loading") {
    return (
      <View style={styles.loadingContainer}>
        <LoadingState label="Loading session..." />
      </View>
    );
  }

  const isAuthed = session.status === "authed";
  const email = auth.currentUser?.email ?? "";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.heroSection, { paddingTop: insets.top + 16 }]}>
          <View style={styles.topBar}>
            <Text style={styles.wordmark}>ROTORUAGUIDE</Text>
            <Text style={styles.accountLabel} numberOfLines={1}>
              {isAuthed ? email : "Guest Explorer"}
            </Text>
          </View>

          <View style={styles.promoCard}>
            <Text style={styles.promoEyebrow}>DISCOVER ROTORUA</Text>
            <Text style={styles.promoHeadline}>{"Your guide to the\nLand of Geysers"}</Text>
            <Text style={styles.promoBody}>
              Geothermal wonders, Māori culture, and adventure — all in one place.
            </Text>
            <TouchableOpacity
              style={styles.promoBtn}
              onPress={() => router.push("/(app)/(tabs)/sites")}
              activeOpacity={0.8}
            >
              <Text style={styles.promoBtnText}>Browse All Sites</Text>
              <ArrowRight size={13} color={tokens.colors.surf} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sheet}>
          <View style={styles.dragHandle} />

          {isAuthed && (
            <View style={styles.statsRow}>
              <View style={styles.statChip}>
                <Text style={styles.statNum}>{itineraries.length}</Text>
                <Text style={styles.statLabel}>{itineraries.length === 1 ? "Trip" : "Trips"}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statChip}>
                <Text style={styles.statNum}>{savedSiteIds.size}</Text>
                <Text style={styles.statLabel}>Saved</Text>
              </View>
            </View>
          )}

          <View style={styles.divider} />
          <UserInfoCard />

          {isAuthed && (
            <>
              <View style={styles.divider} />
              <ItinerariesCard />
              <View style={styles.divider} />
              <SavedSitesCard />
              <View style={styles.divider} />
              <DangerZoneCard />
            </>
          )}

          <View style={{ height: insets.bottom + 80 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.surf },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: tokens.colors.bgBase },
  scrollContent: { flexGrow: 1 },

  heroSection: { backgroundColor: tokens.colors.surf, paddingHorizontal: tokens.space.md, paddingBottom: 44, gap: 20 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  wordmark: { fontSize: 11, fontWeight: "800", color: "rgba(255,255,255,0.5)", letterSpacing: 5 },
  accountLabel: { fontSize: 12, fontWeight: "500", color: "rgba(255,255,255,0.6)", maxWidth: 200 },

  promoCard: {
    backgroundColor: tokens.colors.accent,
    borderRadius: tokens.radius.lg,
    padding: 24,
    gap: 8,
    shadowColor: tokens.colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 10,
  },
  promoEyebrow: { fontSize: 10, fontWeight: "800", color: "rgba(255,255,255,0.7)", letterSpacing: 3 },
  promoHeadline: { fontSize: 28, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.6, lineHeight: 34 },
  promoBody: { fontSize: 14, fontWeight: "400", color: "rgba(255,255,255,0.8)", lineHeight: 21, marginBottom: 4 },
  promoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 99,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  promoBtnText: { fontSize: 13, fontWeight: "700", color: tokens.colors.surf, letterSpacing: 0.1 },

  sheet: { backgroundColor: tokens.colors.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -28, minHeight: 400 },
  dragHandle: { width: 32, height: 4, borderRadius: 2, backgroundColor: tokens.colors.border, alignSelf: "center", marginTop: 14, marginBottom: 4 },

  statsRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: tokens.space.md, paddingVertical: 20 },
  statChip: { flex: 1, alignItems: "center", gap: 3 },
  statNum: { fontSize: 28, fontWeight: "900", color: tokens.colors.text, letterSpacing: -1, lineHeight: 32 },
  statLabel: { fontSize: 10, fontWeight: "700", color: tokens.colors.text2, letterSpacing: 1, textTransform: "uppercase" },
  statDivider: { width: 1, height: 36, backgroundColor: tokens.colors.border },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: tokens.colors.border, marginHorizontal: tokens.space.md },
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0. If it fails on missing exports from `@/lib/uiKit` or `@/lib/hooks/*`, re-check Tasks 1–4 landed and `LoadingState` is exported from `lib/uiKit.ts` (it is — see `lib/uiKit.ts:21`).

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/(tabs)/account.tsx"
git commit -m "feat: restyle profile page to match aklguide's editorial layout"
```

---

### Task 6: Manual verification walkthrough

**Files:** none — this task confirms Tasks 1–5 render and behave correctly.

**Interfaces:**
- Consumes: the running app with Tasks 1–5 applied.
- Produces: a pass/fail signal for this plan. If anything fails, fix it in the relevant component from Tasks 1–5 (not with a new file), then redo the affected check.

- [ ] **Step 1: Start the app**

Run: `npm run start` (or `npm run ios` / `npm run android`), open the Profile tab.

- [ ] **Step 2: Guest state**

Sign out or use a fresh guest session. Confirm: hero shows "Guest Explorer", promo card renders and "Browse All Sites" navigates to the sites tab, stats row is hidden, only the `UserInfoCard` "Sign In / Create Account" section shows below the sheet (no itineraries/saved/danger sections).

- [ ] **Step 3: Authed state, empty data**

Sign in with an account that has 0 itineraries and 0 saved sites. Confirm: hero shows the account email, stats row shows "0 Trips" / "0 Saved", `ItinerariesCard` shows "No itineraries yet." + "New Itinerary" button, `SavedSitesCard` shows "No saved places yet." with no "View All" button, `DangerZoneCard` renders with the "Delete Account" button.

- [ ] **Step 4: Authed state, populated data**

With at least 2 itineraries and 4+ saved sites: confirm stats row counts match, `ItinerariesCard` lists them numbered `01`, `02`, ... with correct dates, tapping a row navigates to `/(app)/(tabs)/itinerary/[id]`, "New Itinerary" opens `CreateItineraryModal` and creating one updates the list and count without a manual refresh. Confirm `SavedSitesCard` shows the 3 most-recently-saved sites, "View All Saved Places" navigates to `/(app)/saved-sites` and that screen still works (already built, unmodified by this plan).

- [ ] **Step 5: Itinerary limit**

With `PLANNER.MAX_ITINERARIES` (3) itineraries created, confirm `ItinerariesCard` shows "Up to 3 itineraries allowed." instead of the "New Itinerary" button.

- [ ] **Step 6: Delete-account flow (cancel path only)**

Tap "Delete Account" → confirm the modal appears with rotorua's existing copy ("Are you absolutely sure?" / "All progress and reviews will be permanently erased from Rotorua Guide's records.") → tap "Wait, keep my account" → confirm the modal closes and no account was deleted. Do not execute the destructive path against a real account.

- [ ] **Step 7: Visual check against the rest of the app**

Confirm the hero's forest-green (`tokens.colors.surf`) and promo card's terracotta (`tokens.colors.accent`) read as intentional against the cream sheet (`tokens.colors.bgCard`), consistent with the palette from `2026-08-07-app-theme-update.md` and the sites screens from `2026-08-07-sites-list-detail-restyle.md`. Confirm no leftover dark/navy colors from the aklguide reference remain anywhere on the screen.

- [ ] **Step 8: Record the result**

If every check in Steps 2–7 passes, this plan is complete — no commit needed (no code changed in this task). If something fails, note which step/section and fix it in the relevant Task 1–5 file, then redo that step only.
