import {
  slotsToDurationLabel,
  slotIndexToTimeLabel,
  runPhysicsEngine,
  hasScheduleOverlap,
} from "@/lib/utils/itineraryPhysics";
import type { ItineraryItem } from "@/lib/models";

describe("slotsToDurationLabel", () => {
  it("pluralizes multi-hour durations", () => {
    expect(slotsToDurationLabel(4)).toBe("2 Hours");
  });

  it("keeps singular for exactly one hour", () => {
    expect(slotsToDurationLabel(2)).toBe("1 Hour");
  });

  it("handles half-hour durations", () => {
    expect(slotsToDurationLabel(1)).toBe("0.5 Hours");
  });
});

describe("slotIndexToTimeLabel", () => {
  it("labels slot 0 as the 8:00 AM grid start", () => {
    expect(slotIndexToTimeLabel(0)).toBe("8:00 AM");
  });

  it("labels the noon boundary correctly", () => {
    expect(slotIndexToTimeLabel(8)).toBe("12:00 PM");
  });

  it("labels the 10:00 PM grid end correctly", () => {
    expect(slotIndexToTimeLabel(28)).toBe("10:00 PM");
  });
});

function makeItem(overrides: Partial<ItineraryItem> = {}): ItineraryItem {
  return {
    id: "item-1",
    siteId: "site-a",
    siteName: "Site",
    slotIndex: 0,
    timeLabel: "",
    durationLabel: "",
    durationSlots: 2,
    ...overrides,
  };
}

describe("runPhysicsEngine", () => {
  it("returns an empty array unchanged", () => {
    expect(runPhysicsEngine([])).toEqual([]);
  });

  it("pushes a colliding item forward past the required transit gap", () => {
    const items = [
      makeItem({ id: "a", siteId: "site-a", slotIndex: 0, durationSlots: 2 }),
      makeItem({ id: "b", siteId: "site-b", slotIndex: 1, durationSlots: 2 }),
    ];

    const result = runPhysicsEngine(items);

    expect(result[0].slotIndex).toBe(0);
    expect(result[1].slotIndex).toBe(3);
    expect(result[1].timeLabel).toBe("9:30 AM");
  });

  it("clamps an item that overruns the 10 PM grid limit", () => {
    const items = [
      makeItem({ id: "a", siteId: "site-a", slotIndex: 27, durationSlots: 4 }),
    ];

    const result = runPhysicsEngine(items);

    expect(result[0].slotIndex).toBe(24);
    expect(result[0].timeLabel).toBe("8:00 PM");
  });

  it("cascades an overrun clamp backward through earlier items", () => {
    const items = [
      makeItem({ id: "a", siteId: "s1", slotIndex: 20, durationSlots: 2 }),
      makeItem({ id: "b", siteId: "s2", slotIndex: 23, durationSlots: 2 }),
      makeItem({ id: "c", siteId: "s3", slotIndex: 26, durationSlots: 4 }),
    ];

    const result = runPhysicsEngine(items);

    expect(result[0].slotIndex).toBe(18);
    expect(result[1].slotIndex).toBe(21);
    expect(result[2].slotIndex).toBe(24);
    expect(result[0].timeLabel).toBe("5:00 PM");
    expect(result[1].timeLabel).toBe("6:30 PM");
    expect(result[2].timeLabel).toBe("8:00 PM");
  });
});

describe("hasScheduleOverlap", () => {
  it("is false when items are exactly touching their required transit gap", () => {
    const items = [
      makeItem({ id: "a", siteId: "site-a", slotIndex: 0, durationSlots: 2 }),
      makeItem({ id: "b", siteId: "site-b", slotIndex: 3, durationSlots: 2 }),
    ];

    expect(hasScheduleOverlap(items)).toBe(false);
  });

  it("is true when an item's body overlaps another item", () => {
    const items = [
      makeItem({ id: "a", siteId: "site-a", slotIndex: 0, durationSlots: 4 }),
      makeItem({ id: "b", siteId: "site-b", slotIndex: 2, durationSlots: 2 }),
    ];

    expect(hasScheduleOverlap(items)).toBe(true);
  });

  it("is true when an item lands inside the required transit buffer", () => {
    const items = [
      makeItem({ id: "a", siteId: "site-a", slotIndex: 0, durationSlots: 2 }),
      makeItem({ id: "b", siteId: "site-b", slotIndex: 2, durationSlots: 2 }),
    ];

    expect(hasScheduleOverlap(items)).toBe(true);
  });

  it("checks pairs by slot order, not array order", () => {
    const items = [
      makeItem({ id: "b", siteId: "site-b", slotIndex: 3, durationSlots: 2 }),
      makeItem({ id: "a", siteId: "site-a", slotIndex: 0, durationSlots: 2 }),
    ];

    expect(hasScheduleOverlap(items)).toBe(false);
  });
});
