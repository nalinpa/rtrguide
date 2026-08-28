jest.mock("@/lib/providers/SessionProvider", () => ({ useSession: jest.fn() }));
jest.mock("@/lib/services/itineraryService", () => ({
  itineraryService: {
    getMyItineraries: jest.fn(),
    saveItinerary: jest.fn(),
    deleteItinerary: jest.fn(),
  },
}));
jest.mock("@/lib/hooksBag", () => ({
  hooksBag: { useReviewPrompt: jest.fn() },
}));

import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider, notifyManager } from "@tanstack/react-query";
import { ApiError } from "@blacksands/client";

// react-query batches observer updates via a real setTimeout by default, which fires
// outside of any act() and can leak into the next test's render. Make it synchronous for tests.
notifyManager.setScheduler((cb) => cb());
import { useSession } from "@/lib/providers/SessionProvider";
import { itineraryService } from "@/lib/services/itineraryService";
import { hooksBag } from "@/lib/hooksBag";
import { useItineraries } from "@/lib/hooks/useItineraries";
import type { Itinerary } from "@/lib/models";

const mockUseSession = useSession as jest.Mock;
const mockGetMyItineraries = itineraryService.getMyItineraries as jest.Mock;
const mockSaveItinerary = itineraryService.saveItinerary as jest.Mock;
const mockDeleteItinerary = itineraryService.deleteItinerary as jest.Mock;
const mockUseReviewPrompt = hooksBag.useReviewPrompt as jest.Mock;

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

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useItineraries", () => {
  const requestReview = jest.fn();

  beforeEach(() => {
    mockGetMyItineraries.mockReset();
    mockSaveItinerary.mockReset();
    mockDeleteItinerary.mockReset();
    requestReview.mockReset();
    mockUseReviewPrompt.mockReturnValue({ requestReview });
  });

  it("does not query when logged out", async () => {
    mockUseSession.mockReturnValue({ session: { status: "loggedOut" } });
    const { result } = await renderHook(() => useItineraries(), { wrapper });

    expect(result.current.itineraries).toEqual([]);
    expect(mockGetMyItineraries).not.toHaveBeenCalled();
  });

  it("loads itineraries for an authed user", async () => {
    mockUseSession.mockReturnValue({ session: { status: "authed", uid: "user-1" } });
    mockGetMyItineraries.mockResolvedValue([itin()]);

    const { result } = await renderHook(() => useItineraries(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.itineraries).toEqual([itin()]);
    expect(result.current.error).toBeNull();
  });

  it("maps a 401 ApiError to a session-expired message", async () => {
    mockUseSession.mockReturnValue({ session: { status: "authed", uid: "user-1" } });
    mockGetMyItineraries.mockRejectedValue(new ApiError(401, "unauthorized"));

    const { result } = await renderHook(() => useItineraries(), { wrapper });

    await waitFor(() => expect(result.current.error).toBe("Your session expired. Please sign in again."));
  });

  it("maps any other error to a generic load-failure message", async () => {
    mockUseSession.mockReturnValue({ session: { status: "authed", uid: "user-1" } });
    mockGetMyItineraries.mockRejectedValue(new Error("boom"));

    const { result } = await renderHook(() => useItineraries(), { wrapper });

    await waitFor(() => expect(result.current.error).toBe("Couldn't load your trips."));
  });

  it("requests a review after saving the first-ever new itinerary", async () => {
    mockUseSession.mockReturnValue({ session: { status: "authed", uid: "user-1" } });
    mockGetMyItineraries.mockResolvedValue([]);
    mockSaveItinerary.mockResolvedValue("new-id");

    const { result } = await renderHook(() => useItineraries(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => result.current.saveItinerary({ title: "Trip" }));

    expect(requestReview).toHaveBeenCalledTimes(1);
  });

  it("does not request a review when saving an existing itinerary", async () => {
    mockUseSession.mockReturnValue({ session: { status: "authed", uid: "user-1" } });
    mockGetMyItineraries.mockResolvedValue([]);
    mockSaveItinerary.mockResolvedValue("itin-1");

    const { result } = await renderHook(() => useItineraries(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => result.current.saveItinerary({ id: "itin-1", title: "Trip" }));

    expect(requestReview).not.toHaveBeenCalled();
  });

  it("does not request a review when the user already has itineraries", async () => {
    mockUseSession.mockReturnValue({ session: { status: "authed", uid: "user-1" } });
    mockGetMyItineraries.mockResolvedValue([itin()]);
    mockSaveItinerary.mockResolvedValue("new-id");

    const { result } = await renderHook(() => useItineraries(), { wrapper });
    await waitFor(() => expect(result.current.itineraries).toHaveLength(1));

    await act(async () => result.current.saveItinerary({ title: "Another trip" }));

    expect(requestReview).not.toHaveBeenCalled();
  });

  it("deletes an itinerary by id", async () => {
    mockUseSession.mockReturnValue({ session: { status: "authed", uid: "user-1" } });
    mockGetMyItineraries.mockResolvedValue([itin()]);
    mockDeleteItinerary.mockResolvedValue(undefined);

    const { result } = await renderHook(() => useItineraries(), { wrapper });
    await waitFor(() => expect(result.current.itineraries).toHaveLength(1));

    await act(async () => result.current.deleteItinerary("itin-1"));

    expect(mockDeleteItinerary).toHaveBeenCalledWith("itin-1");
  });
});
