jest.mock("expo-router", () => ({ router: { navigate: jest.fn() } }));
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import { TourProvider, useTour } from "@/lib/tour/TourContext";
import { TOUR_STEPS } from "@/lib/tour/tourSteps";

function wrapper({ children }: { children: React.ReactNode }) {
  return <TourProvider>{children}</TourProvider>;
}

describe("TourContext", () => {
  it("starts inactive", async () => {
    const { result } = await renderHook(() => useTour(), { wrapper });
    expect(result.current.active).toBe(false);
    expect(result.current.step).toBeNull();
  });

  it("start() activates the first step", async () => {
    const { result } = await renderHook(() => useTour(), { wrapper });
    await act(async () => result.current.start());
    expect(result.current.active).toBe(true);
    expect(result.current.step?.id).toBe(TOUR_STEPS[0].id);
  });

  it("next() walks through every step, then finishes", async () => {
    const { result } = await renderHook(() => useTour(), { wrapper });
    await act(async () => result.current.start());

    for (let i = 1; i < TOUR_STEPS.length; i++) {
      await act(async () => result.current.next());
      expect(result.current.step?.id).toBe(TOUR_STEPS[i].id);
    }

    await act(async () => result.current.next());
    expect(result.current.active).toBe(false);
    expect(result.current.step).toBeNull();
  });

  it("skip() deactivates immediately regardless of step", async () => {
    const { result } = await renderHook(() => useTour(), { wrapper });
    await act(async () => result.current.start());
    await act(async () => result.current.next());
    await act(async () => result.current.skip());
    expect(result.current.active).toBe(false);
  });

  it("registerTarget exposes the rect for the current step", async () => {
    const { result } = await renderHook(() => useTour(), { wrapper });
    await act(async () => result.current.start());
    await act(async () => result.current.next()); // -> "explore" step

    expect(result.current.targetRect).toBeNull();
    await act(async () => result.current.registerTarget("explore", { x: 1, y: 2, width: 3, height: 4 }));
    expect(result.current.targetRect).toEqual({ x: 1, y: 2, width: 3, height: 4 });
  });
});
