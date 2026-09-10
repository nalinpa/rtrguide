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

// Authoritative overlap check, independent of whatever order `items` is
// currently in — re-sorts by slotIndex itself rather than trusting the
// caller's array order, so it stays correct even if some other step (a
// drag, a save) built that order a different way. A dropped item's body or
// its neighbor's transit buffer landing on top of anything else should
// never be allowed to commit; this is the single gate all drop/save paths
// should check against instead of each re-deriving the same invariant.
export function hasScheduleOverlap(items: ItineraryItem[]): boolean {
  const sorted = [...items].sort((a, b) => (a.slotIndex || 0) - (b.slotIndex || 0));
  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i];
    const next = sorted[i + 1];
    const currEnd = (curr.slotIndex || 0) + (curr.durationSlots || 2);
    const transitRequired = getRequiredTransitSlots(curr.siteId, next.siteId);
    if (currEnd + transitRequired > (next.slotIndex || 0)) return true;
  }
  return false;
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