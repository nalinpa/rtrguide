import { renderHook } from "@testing-library/react-native";

jest.mock("@tanstack/react-query", () => ({
  useIsRestoring: jest.fn(),
}));
jest.mock("@/lib/hooksBag", () => ({
  hooksBag: { useEntitlements: jest.fn() },
}));

import { useIsRestoring } from "@tanstack/react-query";
import { hooksBag } from "@/lib/hooksBag";
import { useEntitlementGate } from "@/lib/hooks/useEntitlementGate";

const mockUseIsRestoring = useIsRestoring as jest.Mock;
const mockUseEntitlements = hooksBag.useEntitlements as jest.Mock;

describe("useEntitlementGate", () => {
  beforeEach(() => {
    mockUseIsRestoring.mockReset();
    mockUseEntitlements.mockReset();
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
  });
});
