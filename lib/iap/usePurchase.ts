// rotorua-guide/lib/iap/usePurchase.ts
import { usePurchaseContext } from "./PurchaseProvider";

export function usePurchase(productId: string) {
  const { requestBuy, purchasingProductId, error } = usePurchaseContext();
  return {
    buy: () => requestBuy(productId),
    purchasing: purchasingProductId === productId,
    error: purchasingProductId === productId ? error : null,
  };
}
