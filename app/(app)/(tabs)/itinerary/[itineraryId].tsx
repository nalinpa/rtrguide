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