import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useIAP, ErrorCode, getAvailablePurchases, type Purchase } from "expo-iap";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@blacksands/client";

import { useSession } from "@/lib/providers/SessionProvider";
import { client } from "@/lib/api";
import { FULL_GUIDE_PRODUCT_ID } from "@/lib/constants/commerce";
import { deriveAppAccountToken } from "./deriveAppAccountToken";

type PurchaseContextValue = {
  connected: boolean;
  requestBuy: (productId: string) => void;
  purchasingProductId: string | null;
  error: { productId: string; message: string } | null;
  restore: () => Promise<{ restored: number }>;
};

const PurchaseContext = createContext<PurchaseContextValue | null>(null);

export function PurchaseProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const uid = session.status === "authed" ? session.uid : null;
  const queryClient = useQueryClient();
  const [purchasingProductId, setPurchasingProductId] = useState<string | null>(null);
  const [error, setError] = useState<{ productId: string; message: string } | null>(null);

  async function completePurchase(purchase: Purchase, finishTransaction: (args: { purchase: Purchase; isConsumable: boolean }) => Promise<void>) {
    try {
      await client.entitlements!.register(purchase.transactionId ?? purchase.id);
      queryClient.invalidateQueries({ queryKey: ["rotoruaguide", "entitlements", uid] });
      await finishTransaction({ purchase, isConsumable: false });
      setPurchasingProductId(null);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
        // Not retryable (e.g. uid_mismatch) — finish so StoreKit stops redelivering it, surface the error.
        await finishTransaction({ purchase, isConsumable: false });
        setPurchasingProductId(null);
        setError({ productId: purchase.productId, message: "Purchase couldn't be completed. Please contact support." });
      } else {
        // Network/5xx — leave unfinished, StoreKit redelivers on next launch/foreground.
        // purchasingProductId stays set: this isn't a terminal failure, it's still in flight.
        setError({ productId: purchase.productId, message: "Purchase is pending — it will complete automatically." });
      }
    }
  }

  const { connected, products, requestPurchase, finishTransaction, fetchProducts } = useIAP({
    onPurchaseSuccess: (purchase) => {
      console.log("[iap-debug] onPurchaseSuccess", JSON.stringify(purchase));
      void completePurchase(purchase, finishTransaction);
    },
    onPurchaseError: (err) => {
      console.log("[iap-debug] onPurchaseError", JSON.stringify(err));
      setPurchasingProductId(null);
      if (err.code === ErrorCode.UserCancelled) return;
      if (purchasingProductId) setError({ productId: purchasingProductId, message: err.message ?? "Purchase failed." });
    },
    onError: (err) => {
      console.log("[iap-debug] onError (fetchProducts/etc)", err);
    },
  });

  useEffect(() => {
    console.log("[iap-debug] products array now:", JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    if (connected)
      fetchProducts({ skus: [FULL_GUIDE_PRODUCT_ID], type: "in-app" })
        .then(() => console.log("[iap-debug] fetchProducts call resolved"))
        .catch((e) => console.log("[iap-debug] fetchProducts error:", e));
  }, [connected, fetchProducts]);

  const value = useMemo<PurchaseContextValue>(
    () => ({
      connected,
      purchasingProductId,
      error,
      requestBuy: (productId: string) => {
        console.log("[iap-debug] requestBuy called", { productId, uid, connected });
        if (!uid) return;
        setError(null);
        setPurchasingProductId(productId);
        deriveAppAccountToken(uid)
          .then((appAccountToken) => {
            console.log("[iap-debug] calling requestPurchase", { productId, appAccountToken });
            return requestPurchase({ request: { apple: { sku: productId, appAccountToken } }, type: "in-app" });
          })
          .catch((e) => {
            console.log("[iap-debug] requestBuy chain error:", e);
            // Synchronous rejection (not connected, Android — this request only sets `apple`, etc.):
            // never reaches onPurchaseError, so clear state here or the button stays disabled forever.
            setPurchasingProductId(null);
            setError({ productId, message: "Couldn't start purchase. Please try again." });
          });
      },
      restore: async () => {
        const purchases = await getAvailablePurchases();
        let restored = 0;
        for (const purchase of purchases) {
          const result = await client.entitlements!.register(purchase.transactionId ?? purchase.id);
          await finishTransaction({ purchase, isConsumable: false });
          if (result.granted) restored += 1;
        }
        queryClient.invalidateQueries({ queryKey: ["rotoruaguide", "entitlements", uid] });
        return { restored };
      },
    }),
    [connected, purchasingProductId, error, uid, requestPurchase, finishTransaction, queryClient],
  );

  return <PurchaseContext.Provider value={value}>{children}</PurchaseContext.Provider>;
}

export function usePurchaseContext(): PurchaseContextValue {
  const ctx = useContext(PurchaseContext);
  if (!ctx) throw new Error("usePurchaseContext must be used within PurchaseProvider");
  return ctx;
}
