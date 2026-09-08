import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, AppState, Alert, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { randomUUID } from "expo-crypto";
import { Plus, MoreHorizontal, X } from "lucide-react-native";

import { Screen, LoadingState, ErrorCard, AppText, components } from "@/lib/uiKit";
import { EditItemModal } from "@/components/itinerary/EditItemModal";
import { PremiumFeatureModal } from "@/components/itinerary/PremiumFeatureModal";
import { DeleteTripModal } from "@/components/itinerary/DeleteTripModal";
import { tokens } from "@/lib/ui/tokens";
import { useSession } from "@/lib/providers/SessionProvider";
import { useItineraries } from "@/lib/hooks/useItineraries";
import { useEntitlementGate } from "@/lib/hooks/useEntitlementGate";
import { usePurchaseContext } from "@/lib/iap/PurchaseProvider";
import { runPhysicsEngine, slotsToDurationLabel } from "@/lib/utils/itineraryPhysics";
import { getRequiredTransitSlots } from "@/lib/utils/transitMatrix";
import { PLANNER } from "@/lib/constants/gameplay";
import { FULL_GUIDE_PRODUCT_ID } from "@/lib/constants/commerce";
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
  const { itineraries, loading, error, refetch, saveItinerary, deleteItinerary } = useItineraries();
  const { session } = useSession();
  const uid = session.status === "authed" ? session.uid : null;
  const { entitledProductIds, loading: entitlementsLoading } = useEntitlementGate(uid);
  const isEntitled = entitledProductIds.has(FULL_GUIDE_PRODUCT_ID);
  const { requestBuy } = usePurchaseContext();
  const sourceTrip = itineraries.find((i) => i.id === itineraryId) ?? null;

  const [localTrip, setLocalTrip] = useState<Itinerary | null>(sourceTrip);
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const activeDay = localTrip?.days.find((d) => d.id === activeDayId) || localTrip?.days[0];
  const [localItems, setLocalItems] = useState<ItineraryItem[]>([]);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showPremiumMove, setShowPremiumMove] = useState(false);

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
    if (!loading && !entitlementsLoading && !error && !localTrip) {
      router.replace("/(app)/(tabs)/itinerary");
    }
  }, [loading, entitlementsLoading, error, localTrip]);
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

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTripMenu, setShowTripMenu] = useState(false);

  const handleConfirmDeleteItinerary = async () => {
    if (!localTrip) return;
    setShowDeleteConfirm(false);
    hasUnsavedChanges.current = false;
    await deleteItinerary(localTrip.id);
    router.replace("/(app)/(tabs)/itinerary");
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
          const remainingDays = localTrip.days
            .filter((d) => d.id !== dayId)
            .map((d) => (d.id === currentActiveDayId && d.id !== dayId ? { ...d, items: latestItems } : d));

          // Re-date sequentially from startDate so the trip's date range never
          // has a gap where a deleted middle day used to be — a 3-day trip
          // loses a day and becomes a 2-day trip, it doesn't keep spanning 3
          // calendar days with only 2 day entries.
          const start = new Date(localTrip.startDate + "T00:00:00");
          const updatedDays = remainingDays.map((d, i) => {
            const date = new Date(start);
            date.setDate(date.getDate() + i);
            return { ...d, date: localIsoDate(date) };
          });
          const newEndDate = updatedDays[updatedDays.length - 1]?.date ?? localTrip.startDate;
          const nextTrip = { ...localTrip, days: updatedDays, endDate: newEndDate };
          setLocalTrip(nextTrip);
          if (dayId === activeDayId) setActiveDayId(updatedDays[0]?.id ?? null);
          hasUnsavedChanges.current = false;
          saveItineraryRef.current({ id: nextTrip.id, days: nextTrip.days, endDate: nextTrip.endDate });
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
    const nextTrip = { ...localTrip, days: updatedDays, endDate: nextDate };

    setLocalTrip(nextTrip);
    setActiveDayId(newDayId);
    await saveItineraryRef.current({ id: nextTrip.id, days: nextTrip.days, endDate: nextTrip.endDate });
  };

  const handleDrop = (itemId: string, requestedSlotIndex: number): number => {
    if (!localTrip || !activeDay) return requestedSlotIndex;

    const otherItems = localItems.filter((item) => item.id !== itemId);
    const movedItem = localItems.find((item) => item.id === itemId);
    if (!movedItem) return requestedSlotIndex;

    if (!isEntitled) {
      setShowPremiumMove(true);
      return movedItem.slotIndex;
    }

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

  const handleSaveEdit = (itemId: string, newDurationSlots: number, note: string) => {
    const label = slotsToDurationLabel(newDurationSlots);
    let updatedItems = localItems.map((item) =>
      item.id === itemId ? { ...item, durationSlots: newDurationSlots, durationLabel: label, note: note || undefined } : item,
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

    // Read from the ref, not the `localItems` state: EditItemModal's handleMove calls
    // handleSaveEdit (which updates this ref synchronously) immediately before onMoveDay,
    // in the same event-handler tick. React batches the setLocalItems from that save, so
    // `localItems` here would still be the pre-save value; the ref is not batched.
    const itemToMove = latestItemsRef.current.find((i) => i.id === itemId);
    if (!itemToMove) return;

    let updatedLocalItems = latestItemsRef.current.filter((i) => i.id !== itemId);
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
    await saveItineraryRef.current({ id: nextTrip.id, days: nextTrip.days });
    hasUnsavedChanges.current = false;
  };

  if (loading || entitlementsLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingState label="Loading your trip..." />
      </SafeAreaView>
    );
  }

  if (error && !localTrip) {
    return (
      <Screen>
        <ErrorCard title="Couldn't load your trip" message={error} action={{ label: "Try Again", onPress: () => refetch() }} />
      </Screen>
    );
  }

  if (!localTrip) {
    // Deleting this trip invalidates the shared itineraries query, so this
    // screen briefly re-renders with the trip already gone from the list
    // before router.replace in handleConfirmDeleteItinerary swaps it out —
    // a loading state here instead of a blank screen covers that gap.
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingState label="Loading your trip..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <AppText variant="h1" style={styles.title}>
            {localTrip.title || "My Trip"}
          </AppText>
          <TouchableOpacity
            onPress={() => setShowTripMenu(true)}
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
          {isEntitled && (
            <TouchableOpacity onPress={handleAddDay} style={styles.addDayBtn}>
              <Plus color={tokens.colors.accent} size={16} />
              <AppText style={styles.addDayText}>Add Day</AppText>
            </TouchableOpacity>
          )}
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
              onEdit={(item) => setEditingItem(item as ItineraryItem)}
            />
          ))}

          {localItems.length === 0 ? (
            // Matches AKL's plans.tsx: three copies spread across the grid
            // (top/middle/bottom thirds) instead of one card appended after
            // all 28 slot rows, so it reads as sitting on the timeline
            // rather than as a footer below it.
            ([0, 1, 2] as const).map((i) => {
              const sectionSlots = Math.floor(MAX_GRID_SLOTS / 3);
              return (
                <View
                  key={`empty_${i}`}
                  style={[styles.gapContainer, { top: i * sectionSlots * SLOT_HEIGHT, height: sectionSlots * SLOT_HEIGHT }]}
                >
                  <TouchableOpacity
                    style={styles.emptyDayCard}
                    onPress={() => router.push("/(app)/(tabs)/sites")}
                    activeOpacity={0.7}
                  >
                    <AppText variant="body" style={styles.emptyDayTitle}>
                      Nothing here yet
                    </AppText>
                    <AppText variant="label" status="hint" style={styles.emptyDayBody}>
                      Browse Rotorua's sites and tap "+ Add to Itinerary" to build this day.
                    </AppText>
                  </TouchableOpacity>
                </View>
              );
            })
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

      <PremiumFeatureModal
        visible={showPremiumMove}
        onClose={() => setShowPremiumMove(false)}
        onBuy={() => {
          setShowPremiumMove(false);
          requestBuy(FULL_GUIDE_PRODUCT_ID);
        }}
      />

      <DeleteTripModal
        visible={showDeleteConfirm}
        tripTitle={localTrip.title || "My Trip"}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => void handleConfirmDeleteItinerary()}
      />

      <Modal visible={showTripMenu} transparent animationType="fade" onRequestClose={() => setShowTripMenu(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowTripMenu(false)}>
          <SafeAreaView edges={["top"]} style={styles.menuSafeArea} pointerEvents="box-none">
            <View style={styles.menuCard}>
              {itineraries.length > 1 && (
                <TouchableOpacity
                  style={[styles.menuRow, styles.menuRowDivider]}
                  activeOpacity={0.6}
                  onPress={() => {
                    setShowTripMenu(false);
                    router.push("/(app)/(tabs)/itinerary");
                  }}
                >
                  <Text style={styles.menuRowText}>Switch Trip</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.menuRow}
                activeOpacity={0.6}
                onPress={() => {
                  setShowTripMenu(false);
                  setShowDeleteConfirm(true);
                }}
              >
                <Text style={[styles.menuRowText, styles.menuRowDanger]}>Delete Trip</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.colors.bgBase },
  header: { paddingHorizontal: tokens.space.md, paddingTop: tokens.space.md, paddingBottom: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 24 },
  headerBtn: { padding: 6, borderRadius: tokens.radius.md, backgroundColor: tokens.colors.bgElevated },
  menuOverlay: { flex: 1, backgroundColor: "rgba(36,26,18,0.3)" },
  // paddingTop approximates the header's own height (space.md + title line + paddingBottom)
  // so the menu lands directly under the "..." button rather than needing a measured anchor.
  menuSafeArea: { alignItems: "flex-end", paddingTop: 60, paddingRight: tokens.space.md },
  menuCard: {
    minWidth: 170,
    backgroundColor: tokens.colors.bgCard,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    paddingVertical: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  menuRow: { paddingVertical: 12, paddingHorizontal: 16 },
  menuRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.colors.border },
  menuRowText: { fontSize: 15, fontWeight: "600", color: tokens.colors.text },
  menuRowDanger: { color: tokens.colors.danger },
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
    maxWidth: 280,
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