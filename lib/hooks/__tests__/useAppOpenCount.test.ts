jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { renderHook, waitFor } from "@testing-library/react-native";
import { useAppOpenCount } from "@/lib/hooks/useAppOpenCount";

describe("useAppOpenCount", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("starts at 1 on first launch", async () => {
    const { result } = await renderHook(() => useAppOpenCount());
    await waitFor(() => expect(result.current).toBe(1));
  });

  it("increments on each subsequent launch", async () => {
    await AsyncStorage.setItem("rotoruaguide:appOpenCount", "1");
    const { result } = await renderHook(() => useAppOpenCount());
    await waitFor(() => expect(result.current).toBe(2));
  });

  it("persists the incremented count", async () => {
    const { result } = await renderHook(() => useAppOpenCount());
    await waitFor(() => expect(result.current).toBe(1));
    await waitFor(async () => expect(await AsyncStorage.getItem("rotoruaguide:appOpenCount")).toBe("1"));
  });
});
