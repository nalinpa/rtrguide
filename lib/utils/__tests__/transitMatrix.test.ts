import { getRequiredTransitSlots } from "@/lib/utils/transitMatrix";

describe("getRequiredTransitSlots", () => {
  it("requires no transit between the same site", () => {
    expect(getRequiredTransitSlots("site-a", "site-a")).toBe(0);
  });

  it("requires one slot of transit between different sites", () => {
    expect(getRequiredTransitSlots("site-a", "site-b")).toBe(1);
  });
});
