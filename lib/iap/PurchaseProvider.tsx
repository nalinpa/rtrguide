import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useIAP, ErrorCode, getAvailablePurchases, type Purchase } from "expo-iap";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@blacksands/client";

import { useSession } from "@/lib/providers/SessionProvider";
import { client } from "@/lib/api";
import { FULL_GUIDE_PRODUCT_ID } from "@/lib/constants/commerce";
import { deriveAppAccountToken } from "./deriveAppAccountToken";

const ENTITLEMENTS_QUERY_KEY_PREFIX = ["rotoruaguide", "entitlements"] as const;
// ponytail: fixed 2s x 15 poll (30s) for the webhook-lag window, not a backoff/websocket —
// Apple's sandbox notification usually lands well inside that; raise POLL_MAX_ATTEMPTS if it doesn't.
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 15;

type PurchaseContextValue = {
  connected: boolean;
  requestBuy: (productId: string) => void;
  purchasingProductId: string | null;
  pendingProductId: string | null;
  error: { productId: string; message: string } | null;
  restore: () => Promise<{ restored: number }>;
};

const PurchaseContext = createContext<PurchaseContextValue | null>(null);

export function PurchaseProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const uid = session.status === "authed" ? session.uid : null;
  const queryClient = useQueryClient();
  const [purchasingProductId, setPurchasingProductId] = useState<string | null>(null);
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const [error, setError] = useState<{ productId: string; message: string } | null>(null);
  // expo-iap can deliver the same transaction twice for one purchase (its own purchaseToken-based
  // dedup misses this because Apple re-signs a fresh purchaseToken per delivery path — requestPurchase's
  // return value vs its native purchaseUpdatedListener). Guard on transactionId ourselves; cleared in
  // `finally` so a genuine later redelivery (e.g. next app launch, after a real failure) still goes through.
  const inFlightTransactionIdsRef = useRef(new Set<string>());
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
  }, []);

  function pollForGrant(productId: string, pollUid: string | null, attempt = 0) {
    if (attempt >= POLL_MAX_ATTEMPTS) {
      console.log("[iap-debug] pending poll timed out", { productId, attempt });
      setPendingProductId((current) => (current === productId ? null : current));
      return;
    }
    pollTimeoutRef.current = setTimeout(() => {
      console.log("[iap-debug] pending poll refetch", { productId, attempt });
      const key = [...ENTITLEMENTS_QUERY_KEY_PREFIX, pollUid];
      queryClient.refetchQueries({ queryKey: key }).finally(() => {
        const data = queryClient.getQueryData<{ entitlements: { productId: string }[] }>(key);
        const granted = data?.entitlements.some((e) => e.productId === productId);
        if (granted) {
          setPendingProductId((current) => (current === productId ? null : current));
          return;
        }
        pollForGrant(productId, pollUid, attempt + 1);
      });
    }, POLL_INTERVAL_MS);
  }

  async function completePurchase(purchase: Purchase, finishTransaction: (args: { purchase: Purchase; isConsumable: boolean }) => Promise<void>) {
    const txId = purchase.transactionId ?? purchase.id;
    if (inFlightTransactionIdsRef.current.has(txId)) {
      console.log("[iap-debug] completePurchase: duplicate delivery for txId, skipping", { txId });
      return;
    }
    inFlightTransactionIdsRef.current.add(txId);
    console.log("[iap-debug] completePurchase called", { txId, productId: purchase.productId });
    try {
      const result = await client.entitlements!.register(txId);
      console.log("[iap-debug] completePurchase: register result", { txId, result });
      queryClient.invalidateQueries({ queryKey: [...ENTITLEMENTS_QUERY_KEY_PREFIX, uid] });
      await finishTransaction({ purchase, isConsumable: false });
      console.log("[iap-debug] completePurchase: finishTransaction done", { txId });
      setPurchasingProductId(null);
      setError(null);
      if (result.pending) {
        setPendingProductId(purchase.productId);
        pollForGrant(purchase.productId, uid);
      } else {
        setPendingProductId((current) => (current === purchase.productId ? null : current));
      }
    } catch (e) {
      console.log("[iap-debug] completePurchase failed", { txId, error: e });
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
    } finally {
      inFlightTransactionIdsRef.current.delete(txId);
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
      pendingProductId,
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
        console.log("[iap-debug] restore called");
        const purchases = await getAvailablePurchases();
        console.log("[iap-debug] getAvailablePurchases returned", JSON.stringify(purchases));
        let restored = 0;
        for (const purchase of purchases) {
          const txId = purchase.transactionId ?? purchase.id;
          console.log("[iap-debug] restore: registering", { txId, productId: purchase.productId });
          const result = await client.entitlements!.register(txId);
          console.log("[iap-debug] restore: register result", { txId, result });
          await finishTransaction({ purchase, isConsumable: false });
          console.log("[iap-debug] restore: finishTransaction done", { txId });
          if (result.granted) restored += 1;
        }
        queryClient.invalidateQueries({ queryKey: [...ENTITLEMENTS_QUERY_KEY_PREFIX, uid] });
        console.log("[iap-debug] restore complete", { restored, total: purchases.length });
        return { restored };
      },
    }),
    [connected, purchasingProductId, pendingProductId, error, uid, requestPurchase, finishTransaction, queryClient],
  );

  return <PurchaseContext.Provider value={value}>{children}</PurchaseContext.Provider>;
}

export function usePurchaseContext(): PurchaseContextValue {
  const ctx = useContext(PurchaseContext);
  if (!ctx) throw new Error("usePurchaseContext must be used within PurchaseProvider");
  return ctx;
}
