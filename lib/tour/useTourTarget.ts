import { useCallback, useEffect, useRef } from "react";
import { View } from "react-native";
import { useTour } from "./TourContext";

// Spread the returned props onto the View that should be spotlighted for
// the given tour step id. Measures screen position on every layout pass,
// so it also self-corrects the first time a hidden tab becomes visible.
//
// Also re-measures the moment this id's step becomes the active one: a
// view's onLayout only fires when ITS OWN frame changes, so a target that
// mounts conditionally (e.g. once async data loads) can register a stale
// rect if something above it in the same pass hasn't settled yet — the
// active-step re-measure catches that instead of leaving the spotlight
// pointed at wherever the target happened to be on first mount.
export function useTourTarget(id: string) {
  const { registerTarget, active, step } = useTour();
  const ref = useRef<View>(null);

  const measure = useCallback(() => {
    ref.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) registerTarget(id, { x, y, width, height });
    });
  }, [id, registerTarget]);

  useEffect(() => {
    if (!active || step?.id !== id) return;
    const raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [active, step?.id, id, measure]);

  return { ref, onLayout: measure };
}
