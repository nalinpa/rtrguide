import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "rotoruaguide:appOpenCount";

// General-purpose launch counter (not review-prompt-specific) — also drives
// a planned first-open app tour, so it tracks count rather than a boolean.
export function useAppOpenCount(): number | null {
  const [openCount, setOpenCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const next = (raw ? Number(raw) : 0) + 1;
      await AsyncStorage.setItem(STORAGE_KEY, String(next));
      if (!cancelled) setOpenCount(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return openCount;
}
