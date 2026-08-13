import React from "react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { QueryClient, defaultShouldDehydrateQuery } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { SessionProvider } from "./SessionProvider";

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
