import { useEffect } from "react";
import { useIsRestoring, useQueryClient } from "@tanstack/react-query";

import { hooksBag, QUERY_KEY_PREFIX } from "@/lib/hooksBag";

// The api only sends premium sites' full content to accounts that have the unlock, and the
// locations cache is persisted, so anything fetched under a different unlock state (before a
// purchase, sign-in or refund, possibly in an earlier session) is the wrong version. Refetch
// locations whenever the settled unlock state differs from the last one seen, cold start included.
// Module-level so the many screens using this hook trigger one refetch, not one each.
let lastUnlockKey: string | null = null;

// ponytail: PersistQueryClientProvider (lib/providers/AppProviders.tsx) restores a
// persisted cache on cold start; react-query reports isFetching/isPending as false for
// restoring observers, so useEntitlements' own loading flag can't see that. Folding
// useIsRestoring in here keeps every gated screen fail-closed until restore settles.
export function useEntitlementGate(uid: string | null) {
  const isRestoring = useIsRestoring();
  const queryClient = useQueryClient();
  const { entitledProductIds, loading } = hooksBag.useEntitlements(uid);
  const settled = !loading && !isRestoring;
  const unlockKey = `${uid}:${Array.from(entitledProductIds).sort().join(",")}`;

  useEffect(() => {
    if (!settled || unlockKey === lastUnlockKey) return;
    lastUnlockKey = unlockKey;
    queryClient.invalidateQueries({ queryKey: [...QUERY_KEY_PREFIX, "locations"] });
    queryClient.invalidateQueries({ queryKey: [...QUERY_KEY_PREFIX, "location"] });
  }, [settled, unlockKey, queryClient]);

  return { entitledProductIds, loading: !settled };
}

export function __resetUnlockKeyForTests() {
  lastUnlockKey = null;
}
