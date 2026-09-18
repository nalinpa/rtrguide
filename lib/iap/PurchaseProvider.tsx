import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import { useIAP, ErrorCode, getAvailablePurchases, type Purchase } from "expo-iap";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@blacksands/client";
import * as Sentry from "@sentry/react-native";

import { useSession } from "@/lib/providers/SessionProvider";
import { client } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { FULL_GUIDE_PRODUCT_ID } from "@/lib/constants/commerce";
import { deriveAppAccountToken } from "./deriveAppAccountToken";

const ENTITLEMENTS_QUERY_KEY_PREFIX = ["rotoruaguide", "entitlements"] as const;
// ponytail: fixed 2s x 45 poll (90s) for the webhook-lag window, not a backoff/websocket.
// Was 30s; the first TestFlight sandbox purchase (2026-09-13) took ~40s for Apple's
// notification to land, so the poll gave up and the paywall reappeared mid-purchase.
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 45;
const SUPPORT_EMAIL = "support@blacksands.app";
const PENDING_MESSAGE = "Purchase is pending — it will complete automatically. Reopen the app if it doesn't.";
export const UID_MISMATCH_MESSAGE = `This purchase is linked to another Rotorua Guide account, or one that's been deleted. Sign in with that account, or email ${SUPPORT_EMAIL} and we'll move it to this one.`;

// Finish a transaction only when the server has given a final answer for it. A finished
// transaction is never redelivered by StoreKit, so finishing on anything retryable leaves a
// paid user locked until they find Restore.
//   403 uid_mismatch: tied to another account.  409: refunded or already claimed.
// Everything else stays unfinished and StoreKit redelivers it on next launch: 401 (expired or
// revoked session, clock skew, or @blacksands/client turning a failed getToken into a 401),
// 400/404 (client or config bugs a later build can fix), network/5xx.
function isFinalRejection(e: unknown): e is ApiError {
  return e instanceof ApiError && (e.status === 403 || e.status === 409);
}

function finalRejectionMessage(e: ApiError): string {
  return e.status === 403
    ? UID_MISMATCH_MESSAGE
    : `This purchase has been refunded or already used to unlock another account. Email ${SUPPORT_EMAIL} if that's not right.`;
}

// register reads the ID token via getToken(), which returns Firebase's cached token. On a 401,
// force-refresh it once and retry. If the refresh itself fails (offline), that error propagates
// and the transaction stays unfinished.
async function registerTransaction(txId: string) {
  try {
    return await client.entitlements!.register(txId);
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 401) || !auth.currentUser) throw e;
    await auth.currentUser.getIdToken(true);
    return client.entitlements!.register(txId);
  }
}

type PurchaseContextValue = {
  connected: boolean;
  requestBuy: (productId: string) => void;
  purchasingProductId: string | null;
  pendingProductId: string | null;
  error: { productId: string; message: string } | null;
  // mismatch: at least one purchase belongs to another account (show UID_MISMATCH_MESSAGE).
  // failed: purchases left unfinished for a retry (network, 5xx, 401, ...).
  restore: () => Promise<{ restored: number; mismatch: boolean; failed: number }>;
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
      const result = await registerTransaction(txId);
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
      if (isFinalRejection(e)) {
        await finishTransaction({ purchase, isConsumable: false });
        setPurchasingProductId(null);
        setError({ productId: purchase.productId, message: finalRejectionMessage(e) });
      } else {
        // Left unfinished, StoreKit redelivers on next launch/foreground. Clear
        // purchasingProductId so the message is actually visible: PurchasePendingBanner
        // outranks the error text while it's set, which spun "Finishing your purchase"
        // forever. No pollForGrant here — register never reached the server, so there's no
        // grant coming, and its refetches flip the entitlement gate's full-screen loader.
        // 400/404 won't fix themselves, so make sure they're seen.
        if (e instanceof ApiError && e.status !== 401 && e.status >= 400 && e.status < 500) Sentry.captureException(e);
        setPurchasingProductId(null);
        setError({ productId: purchase.productId, message: PENDING_MESSAGE });
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
        let failed = 0;
        let mismatch = false;
        // One bad purchase mustn't stop the rest restoring, so each gets its own try/catch.
        for (const purchase of purchases) {
          const txId = purchase.transactionId ?? purchase.id;
          try {
            const result = await registerTransaction(txId);
            await finishTransaction({ purchase, isConsumable: false });
            if (result.granted) restored += 1;
          } catch (e) {
            if (isFinalRejection(e)) {
              if (e.status === 403) mismatch = true;
              await finishTransaction({ purchase, isConsumable: false }).catch(() => {});
            } else {
              failed += 1;
              Sentry.captureException(e);
            }
          }
        }
        queryClient.invalidateQueries({ queryKey: [...ENTITLEMENTS_QUERY_KEY_PREFIX, uid] });
        return { restored, mismatch, failed };
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
