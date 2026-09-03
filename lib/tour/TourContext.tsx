import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TOUR_STEPS, TOUR_TAB_ROUTES, type TourStep } from "./tourSteps";

export type TourRect = { x: number; y: number; width: number; height: number };

type TourContextValue = {
  active: boolean;
  step: TourStep | null;
  stepIndex: number;
  stepCount: number;
  targetRect: TourRect | null;
  start: () => void;
  next: () => void;
  skip: () => void;
  registerTarget: (id: string, rect: TourRect) => void;
};

const TourContext = createContext<TourContextValue | null>(null);

function rectsEqual(a: TourRect | undefined, b: TourRect): boolean {
  return !!a && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targets, setTargets] = useState<Record<string, TourRect>>({});

  const registerTarget = useCallback((id: string, rect: TourRect) => {
    setTargets((prev) => (rectsEqual(prev[id], rect) ? prev : { ...prev, [id]: rect }));
  }, []);

  const goToStep = useCallback((index: number) => {
    const target = TOUR_STEPS[index];
    if (target?.tabKey) router.navigate(TOUR_TAB_ROUTES[target.tabKey] as never);
    setStepIndex(index);
  }, []);

  const start = useCallback(() => {
    goToStep(0);
    setActive(true);
  }, [goToStep]);

  const skip = useCallback(() => setActive(false), []);

  const next = useCallback(() => {
    const nextIndex = stepIndex + 1;
    if (nextIndex >= TOUR_STEPS.length) {
      setActive(false);
      return;
    }
    goToStep(nextIndex);
  }, [stepIndex, goToStep]);

  const step = active ? TOUR_STEPS[stepIndex] : null;
  const targetRect = step ? targets[step.id] ?? null : null;

  const value = useMemo<TourContextValue>(
    () => ({
      active,
      step,
      stepIndex,
      stepCount: TOUR_STEPS.length,
      targetRect,
      start,
      next,
      skip,
      registerTarget,
    }),
    [active, step, stepIndex, targetRect, start, next, skip, registerTarget],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
}

const SEEN_KEY = "rotoruaguide:tourSeen";

// Starts the tour once, the first time `shouldStart` goes true, unless it's
// already been seen (marked immediately on start, same "seen even if the
// app is killed mid-tour" pattern as useAppOpenCount).
export function TourAutoStart({ shouldStart }: { shouldStart: boolean }) {
  const { start } = useTour();
  const attempted = useRef(false);

  React.useEffect(() => {
    if (!shouldStart || attempted.current) return;
    attempted.current = true;
    (async () => {
      const seen = await AsyncStorage.getItem(SEEN_KEY);
      if (seen) return;
      await AsyncStorage.setItem(SEEN_KEY, "1");
      start();
    })();
  }, [shouldStart, start]);

  return null;
}
