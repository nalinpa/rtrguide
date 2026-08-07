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