jest.mock("@/lib/api", () => ({
  itinerariesApi: {
    list: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
  },
}));

import { itinerariesApi } from "@/lib/api";
import { itineraryService } from "@/lib/services/itineraryService";
import type { Itinerary } from "@/lib/models";

const mockList = itinerariesApi.list as jest.Mock;
const mockUpdate = itinerariesApi.update as jest.Mock;
const mockCreate = itinerariesApi.create as jest.Mock;
const mockRemove = itinerariesApi.remove as jest.Mock;

const itin = (overrides: Partial<Itinerary> = {}): Itinerary => ({
  id: "itin-1",
  userId: "user-1",
  title: "Weekend trip",
  startDate: "2026-01-01",
  endDate: "2026-01-02",
  days: [],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("itineraryService", () => {
  beforeEach(() => {
    mockList.mockReset();
    mockUpdate.mockReset();
    mockCreate.mockReset();
    mockRemove.mockReset();
  });

  it("getMyItineraries returns the itineraries from the API", async () => {
    mockList.mockResolvedValue({ itineraries: [itin(), itin({ id: "itin-2" })] });

    const result = await itineraryService.getMyItineraries();

    expect(result).toHaveLength(2);
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it("saveItinerary updates an existing itinerary when it has an id", async () => {
    mockUpdate.mockResolvedValue({ itinerary: itin({ id: "itin-1" }) });

    const id = await itineraryService.saveItinerary({ id: "itin-1", title: "Renamed" });

    expect(mockUpdate).toHaveBeenCalledWith("itin-1", { id: "itin-1", title: "Renamed" });
    expect(mockCreate).not.toHaveBeenCalled();
    expect(id).toBe("itin-1");
  });

  it("saveItinerary creates a new itinerary when it has no id", async () => {
    mockCreate.mockResolvedValue({ itinerary: itin({ id: "new-id" }) });

    const id = await itineraryService.saveItinerary({
      title: "New trip",
      startDate: "2026-02-01",
      endDate: "2026-02-03",
      days: [],
    });

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledWith({
      title: "New trip",
      startDate: "2026-02-01",
      endDate: "2026-02-03",
      days: [],
    });
    expect(id).toBe("new-id");
  });

  it("deleteItinerary removes by id", async () => {
    mockRemove.mockResolvedValue(undefined);

    await itineraryService.deleteItinerary("itin-1");

    expect(mockRemove).toHaveBeenCalledWith("itin-1");
  });
});
