import { useCallback, useRef } from "react";
import { View } from "react-native";
import { useTour } from "./TourContext";

// Spread the returned props onto the View that should be spotlighted for
// the given tour step id. Measures screen position on every layout pass,
// so it also self-corrects the first time a hidden tab becomes visible.
export function useTourTarget(id: string) {
  const { registerTarget } = useTour();
  const ref = useRef<View>(null);

  const onLayout = useCallback(() => {
    ref.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) registerTarget(id, { x, y, width, height });
    });
  }, [id, registerTarget]);

  return { ref, onLayout };
}
