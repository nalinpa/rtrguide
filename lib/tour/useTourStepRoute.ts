import { useEffect } from "react";
import { useTour } from "./TourContext";

// Lets a screen hand the tour a real route to push to for a step whose
// destination depends on runtime data (e.g. "the currently featured site"),
// since TOUR_STEPS is a static list and can't know that route upfront.
export function useTourStepRoute(key: string, route: string | undefined) {
  const { registerStepRoute } = useTour();

  useEffect(() => {
    registerStepRoute(key, route);
  }, [key, route, registerStepRoute]);
}
