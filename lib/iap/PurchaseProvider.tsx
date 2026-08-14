// rotorua-guide/lib/iap/PurchaseProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useIAP, ErrorCode, type Purchase } from "expo-iap";
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
  error: string | null;
};

const PurchaseContext = createContext<PurchaseContextValue | null>(null);

export function PurchaseProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const uid = session.status === "authed" ? session.uid : null;
  const queryClient = useQueryClient();
  const [purchasingProductId, setPurchasingProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        setError("Purchase couldn't be completed. Please contact support.");
      } else {
        // Network/5xx — leave unfinished, StoreKit redelivers on next launch/foreground.
        setError("Purchase is pending — it will complete automatically.");
      }
    }
  }

  const { connected, requestPurchase, finishTransaction, fetchProducts } = useIAP({
    onPurchaseSuccess: (purchase) => {
      void completePurchase(purchase, finishTransaction);
    },
    onPurchaseError: (err) => {
      setPurchasingProductId(null);
      if (err.code === ErrorCode.UserCancelled) return;
      setError(err.message ?? "Purchase failed.");
    },
  });

  useEffect(() => {
    if (connected) fetchProducts({ skus: [FULL_GUIDE_PRODUCT_ID], type: "in-app" });
  }, [connected, fetchProducts]);

  const value = useMemo<PurchaseContextValue>(
    () => ({
      connected,
      purchasingProductId,
      error,
      requestBuy: (productId: string) => {
        if (!uid) return;
        setError(null);
        setPurchasingProductId(productId);
        deriveAppAccountToken(uid).then((appAccountToken) => {
          requestPurchase({ request: { apple: { sku: productId, appAccountToken } }, type: "in-app" }).catch(() => {
            // onPurchaseError already handles user-facing state for request failures.
          });
        });
      },
    }),
    [connected, purchasingProductId, error, uid, requestPurchase],
  );

  return <PurchaseContext.Provider value={value}>{children}</PurchaseContext.Provider>;
}

export function usePurchaseContext(): PurchaseContextValue {
  const ctx = useContext(PurchaseContext);
  if (!ctx) throw new Error("usePurchaseContext must be used within PurchaseProvider");
  return ctx;
}
