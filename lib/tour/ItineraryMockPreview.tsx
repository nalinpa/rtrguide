import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { components } from "@/lib/uiKit";
import { tokens } from "@/lib/ui/tokens";
import type { TimelineItem } from "@blacksands/components";

const SLOT_HEIGHT = 32; // ~60% of the original 52, so each card takes up less vertical space
const GAP_SLOTS = 1; // 30 min transit between consecutive stops
const GRID_START_MINUTES = 9 * 60 + 30; // slot 0 is the plan's actual start time, 9:30 AM
const VISIBLE_HEIGHT = 480; // matches full grid content height now that items are smaller — no scrolling needed

// Whakarewarewa 9:30 AM (2 hr), Skyline 12:00 PM (2.5 hr), Polynesian Spa 3:00 PM (2 hr) —
// slotIndex values are pre-packed back-to-back from the start time (see reflow below).
const INITIAL_ITEMS: TimelineItem[] = [
  { id: "1", siteName: "Whakarewarewa Thermal Village", durationLabel: "2 hr", slotIndex: 0, durationSlots: 4 },
  { id: "2", siteName: "Skyline Gondola & Luge", durationLabel: "2.5 hr", slotIndex: 5, durationSlots: 5 },
  { id: "3", siteName: "Polynesian Spa", durationLabel: "2 hr", slotIndex: 11, durationSlots: 4 },
];
const GRID_SLOTS = 15; // exactly fits the three items + their transit gaps, no dead runway

function slotToTimeLabel(slotIndex: number): string {
  const totalMinutes = GRID_START_MINUTES + slotIndex * 30;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

// Re-packs a given order back-to-back from the plan's start time, each item
// keeping its own duration with a fixed 30-min transit gap after it — so
// reordering shifts every later stop's time too, not just the dragged one.
function reflow(order: TimelineItem[]): TimelineItem[] {
  let cursor = 0;
  return order.map((it) => {
    const placed = { ...it, slotIndex: cursor };
    cursor += (it.durationSlots ?? 2) + GAP_SLOTS;
    return placed;
  });
}

// Same drag-to-reorder TimelineBlock (and TransitBlock) the real plan page
// uses, fed sample data — most viewers reach this step before building a
// real itinerary, so a live spotlight here would just show an empty or
// locked screen. Wrapped in a capped, scrollable canvas like the real page's
// timeline, since a realistic multi-hour day plan doesn't fit in one screen.
export function ItineraryMockPreview() {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (itemId: string, requestedSlotIndex: number): number => {
    const dragged = items.find((i) => i.id === itemId);
    if (!dragged) return 0;
    const others = items.filter((i) => i.id !== itemId).sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0));
    let insertAt = others.findIndex((o) => requestedSlotIndex < (o.slotIndex ?? 0));
    if (insertAt === -1) insertAt = others.length;
    const reordered = reflow([...others.slice(0, insertAt), dragged, ...others.slice(insertAt)]);
    setItems(reordered);
    return reordered.find((it) => it.id === itemId)!.slotIndex!;
  };

  return (
    <ScrollView style={styles.grid} scrollEnabled={!isDragging} showsVerticalScrollIndicator={false}>
      <View style={styles.canvas}>
        {Array.from({ length: Math.ceil(GRID_SLOTS / 2) }).map((_, i) => (
          <View key={i} style={[styles.hourLine, { top: i * SLOT_HEIGHT * 2 }]} />
        ))}
        {items.slice(0, -1).map((item, i) => {
          const next = items[i + 1];
          const departureSlot = (next.slotIndex ?? 0) - GAP_SLOTS;
          return (
            <components.TransitBlock
              key={`transit-${item.id}`}
              transitSize={GAP_SLOTS}
              top={departureSlot * SLOT_HEIGHT}
              height={GAP_SLOTS * SLOT_HEIGHT}
            />
          );
        })}
        {items.map((item) => (
          <components.TimelineBlock
            key={item.id}
            item={{ ...item, timeLabel: slotToTimeLabel(item.slotIndex ?? 0) }}
            maxSlots={GRID_SLOTS}
            slotHeight={SLOT_HEIGHT}
            onDrop={handleDrop}
            onEdit={() => {}}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const CANVAS_SHIFT = 64;

const styles = StyleSheet.create({
  grid: {
    maxHeight: VISIBLE_HEIGHT,
    backgroundColor: tokens.colors.bgSurface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    marginBottom: 4,
    overflow: "hidden",
  },
  hourLine: { position: "absolute", left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: tokens.colors.border },
  canvas: { position: "relative", height: GRID_SLOTS * SLOT_HEIGHT, marginLeft: -CANVAS_SHIFT },
});
