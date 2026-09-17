import { renderHook } from "@testing-library/react-native";

const mockInvalidate = jest.fn();
jest.mock("@tanstack/react-query", () => ({
  useIsRestoring: jest.fn(),
  useQueryClient: () => ({ invalidateQueries: mockInvalidate }),
}));
jest.mock("@/lib/hooksBag", () => ({
  hooksBag: { useEntitlements: jest.fn() },
  QUERY_KEY_PREFIX: ["rotoruaguide"],
}));

import { useIsRestoring } from "@tanstack/react-query";
import { hooksBag } from "@/lib/hooksBag";
import { useEntitlementGate, __resetUnlockKeyForTests } from "@/lib/hooks/useEntitlementGate";

const mockUseIsRestoring = useIsRestoring as jest.Mock;
const mockUseEntitlements = hooksBag.useEntitlements as jest.Mock;

describe("useEntitlementGate", () => {
  beforeEach(() => {
    mockUseIsRestoring.mockReset();
    mockUseEntitlements.mockReset();
    mockInvalidate.mockReset();
    __resetUnlockKeyForTests();
  });

  it("stays loading while the persisted query cache is restoring", async () => {
    mockUseIsRestoring.mockReturnValue(true);
    mockUseEntitlements.mockReturnValue({ entitledProductIds: [], loading: false });

    const { result } = await renderHook(() => useEntitlementGate("user-1"));

    expect(result.current.loading).toBe(true);
  });

  it("stays loading while entitlements are still fetching", async () => {
    mockUseIsRestoring.mockReturnValue(false);
    mockUseEntitlements.mockReturnValue({ entitledProductIds: [], loading: true });

    const { result } = await renderHook(() => useEntitlementGate("user-1"));

    expect(result.current.loading).toBe(true);
  });

  it("is not loading once both restore and fetch have settled", async () => {
    mockUseIsRestoring.mockReturnValue(false);
    mockUseEntitlements.mockReturnValue({ entitledProductIds: ["prod-1"], loading: false });

    const { result } = await renderHook(() => useEntitlementGate("user-1"));

    expect(result.current.loading).toBe(false);
    expect(result.current.entitledProductIds).toEqual(["prod-1"]);
    expect(mockUseEntitlements).toHaveBeenCalledWith("user-1");
  });

  it("refetches locations once when the settled unlock state changes, not per screen or while loading", async () => {
    mockUseIsRestoring.mockReturnValue(false);
    mockUseEntitlements.mockReturnValue({ entitledProductIds: new Set(), loading: true });
    const first = await renderHook(() => useEntitlementGate("user-1"));
    expect(mockInvalidate).not.toHaveBeenCalled();

    mockUseEntitlements.mockReturnValue({ entitledProductIds: new Set(), loading: false });
    await first.rerender({});
    await renderHook(() => useEntitlementGate("user-1")); // a second screen, same state
    expect(mockInvalidate).toHaveBeenCalledTimes(2); // locations + location, once

    mockInvalidate.mockReset();
    mockUseEntitlements.mockReturnValue({ entitledProductIds: new Set(["full-guide-unlock"]), loading: false });
    await first.rerender({});
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ["rotoruaguide", "locations"] });
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ["rotoruaguide", "location"] });
  });
});
