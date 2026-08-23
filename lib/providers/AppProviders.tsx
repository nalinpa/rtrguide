import React, { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { QueryClient, defaultShouldDehydrateQuery, focusManager } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { SessionProvider } from "./SessionProvider";

// RN has no browser `focus` event — react-query's refetchOnWindowFocus needs this
// AppState bridge or it never refetches when the app comes back to the foreground
// (e.g. after backgrounding mid-purchase while an entitlement grant is still pending).
function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === "active");
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const subscription = AppState.addEventListener("change", onAppStateChange);
    return () => subscription.remove();
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        // savedSites query data is a Set, which JSON.stringify can't round-trip
        // (persister serializes to "{}") — exclude it, refetches fine on launch.
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.queryKey[0] !== "savedSites" && defaultShouldDehydrateQuery(query),
        },
      }}
    >
      <SessionProvider>{children}</SessionProvider>
    </PersistQueryClientProvider>
  );
}
