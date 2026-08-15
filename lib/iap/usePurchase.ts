import { usePurchaseContext } from "./PurchaseProvider";

export function usePurchase(productId: string) {
  const { requestBuy, purchasingProductId, error } = usePurchaseContext();
  return {
    buy: () => requestBuy(productId),
    purchasing: purchasingProductId === productId,
    error: error?.productId === productId ? error.message : null,
  };
}
