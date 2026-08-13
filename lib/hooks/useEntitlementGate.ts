import { useIsRestoring } from "@tanstack/react-query";

import { hooksBag } from "@/lib/hooksBag";

// ponytail: PersistQueryClientProvider (lib/providers/AppProviders.tsx) restores a
// persisted cache on cold start; react-query reports isFetching/isPending as false for
// restoring observers, so useEntitlements' own loading flag can't see that. Folding
// useIsRestoring in here keeps every gated screen fail-closed until restore settles.
export function useEntitlementGate(uid: string | null) {
  const isRestoring = useIsRestoring();
  const { entitledProductIds, loading } = hooksBag.useEntitlements(uid);
  return { entitledProductIds, loading: loading || isRestoring };
}
