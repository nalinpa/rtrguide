import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { useIAP, ErrorCode, getAvailablePurchases, type Purchase } from "expo-iap";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@blacksands/client";

import { useSession } from "@/lib/providers/SessionProvider";
import { client } from "@/lib/api";
import { FULL_GUIDE_PRODUCT_ID } from "@/lib/constants/commerce";
import { deriveAppAccountToken } from "./deriveAppAccountToken";

const ENTITLEMENTS_QUERY_KEY_PREFIX = ["rotoruaguide", "entitlements"] as const;
// ponytail: fixed 2s x 45 poll (90s) for the webhook-lag window, not a backoff/websocket.
// Was 30s; the first TestFlight sandbox purchase (2026-09-13) took ~40s for Apple's
// notification to land, so the poll gave up and the paywall reappeared mid-purchase.
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 45;

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
      setPendingProductId((current) => (current === productId ? null : current));
      // Silently dropping back to the Buy card here reads as "the purchase failed".
      setError({
        productId,
        message: "Your purchase went through but is taking longer than usual to unlock. Check back shortly, or use Restore Purchases in Account.",
      });
      return;
    }
    pollTimeoutRef.current = setTimeout(() => {
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
      return;
    }
    inFlightTransactionIdsRef.current.add(txId);
    try {
      const result = await client.entitlements!.register(txId);
      await finishTransaction({ purchase, isConsumable: false });
      setError(null);
      if (result.pending) {
        setPendingProductId(purchase.productId);
        setPurchasingProductId(null);
        pollForGrant(purchase.productId, uid);
      } else {
        // Await the refetch before clearing purchasing: screens show the pending banner while
        // it's set, and clearing it first flashed the locked paywall back until the refetch landed.
        await queryClient.invalidateQueries({ queryKey: [...ENTITLEMENTS_QUERY_KEY_PREFIX, uid] });
        setPurchasingProductId(null);
        setPendingProductId((current) => (current === purchase.productId ? null : current));
      }
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
    } finally {
      inFlightTransactionIdsRef.current.delete(txId);
    }
  }

  const { connected, requestPurchase, finishTransaction, fetchProducts } = useIAP({
    onPurchaseSuccess: (purchase) => {
      void completePurchase(purchase, finishTransaction);
    },
    onPurchaseError: (err) => {
      setPurchasingProductId(null);
      if (err.code === ErrorCode.UserCancelled) return;
      if (purchasingProductId) setError({ productId: purchasingProductId, message: err.message ?? "Purchase failed." });
    },
  });

  useEffect(() => {
    if (connected) fetchProducts({ skus: [FULL_GUIDE_PRODUCT_ID], type: "in-app" }).catch(() => {});
  }, [connected, fetchProducts]);

  const value = useMemo<PurchaseContextValue>(
    () => ({
      connected,
      purchasingProductId,
      pendingProductId,
      error,
      requestBuy: (productId: string) => {
        // Entitlements are granted to an account (server-side, synced across devices and
        // claim links), so a guest has to sign in first. This used to return silently.
        if (!uid) {
          Alert.alert("Sign In to Unlock", "Create a free account or sign in so your unlock is saved and can be restored on any device.", [
            { text: "Not Now", style: "cancel" },
            { text: "Sign In", onPress: () => router.push("/(auth)/login") },
          ]);
          return;
        }
        setError(null);
        setPurchasingProductId(productId);
        deriveAppAccountToken(uid)
          .then((appAccountToken) =>
            requestPurchase({ request: { apple: { sku: productId, appAccountToken } }, type: "in-app" }),
          )
          .catch(() => {
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
          const txId = purchase.transactionId ?? purchase.id;
          const result = await client.entitlements!.register(txId);
          await finishTransaction({ purchase, isConsumable: false });
          if (result.granted) restored += 1;
        }
        queryClient.invalidateQueries({ queryKey: [...ENTITLEMENTS_QUERY_KEY_PREFIX, uid] });
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
