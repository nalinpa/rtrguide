jest.mock("../PurchaseProvider", () => ({ usePurchaseContext: jest.fn() }));

import { renderHook } from "@testing-library/react-native";
import { usePurchaseContext } from "@/lib/iap/PurchaseProvider";
import { usePurchase } from "@/lib/iap/usePurchase";

const mockUsePurchaseContext = usePurchaseContext as jest.Mock;

describe("usePurchase", () => {
  const requestBuy = jest.fn();

  beforeEach(() => {
    requestBuy.mockReset();
  });

  it("buy() delegates to requestBuy with the product id", async () => {
    mockUsePurchaseContext.mockReturnValue({ requestBuy, purchasingProductId: null, error: null });
    const { result } = await renderHook(() => usePurchase("prod-a"));

    result.current.buy();

    expect(requestBuy).toHaveBeenCalledWith("prod-a");
  });

  it("purchasing is true only when this product is the one in flight", async () => {
    mockUsePurchaseContext.mockReturnValue({ requestBuy, purchasingProductId: "prod-a", error: null });
    const { result: matching } = await renderHook(() => usePurchase("prod-a"));
    const { result: other } = await renderHook(() => usePurchase("prod-b"));

    expect(matching.current.purchasing).toBe(true);
    expect(other.current.purchasing).toBe(false);
  });

  it("error is scoped to the matching product id", async () => {
    mockUsePurchaseContext.mockReturnValue({
      requestBuy,
      purchasingProductId: null,
      error: { productId: "prod-a", message: "failed" },
    });
    const { result: matching } = await renderHook(() => usePurchase("prod-a"));
    const { result: other } = await renderHook(() => usePurchase("prod-b"));

    expect(matching.current.error).toBe("failed");
    expect(other.current.error).toBeNull();
  });
});
