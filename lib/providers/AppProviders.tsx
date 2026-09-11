import React, { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { QueryClient, focusManager, onlineManager } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

import { SessionProvider } from "./SessionProvider";

// RN has no browser `focus` event — react-query's refetchOnWindowFocus needs this
// AppState bridge or it never refetches when the app comes back to the foreground
// (e.g. after backgrounding mid-purchase while an entitlement grant is still pending).
function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === "active");
}

// Same problem for `online`: without this bridge react-query assumes it's always
// online, so offline refetches fire, fail, and flip queries holding perfectly good
// cached data into an error state. Bridged, they pause instead and resume on reconnect.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(!!state.isConnected && state.isInternetReachable !== false)),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 60 * 24,
    },
    // Writes still run immediately offline, as before the bridge above, rather than
    // silently queueing until reconnect — the UI's offline handling is built around that.
    mutations: { networkMode: "always" },
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
      persistOptions={{ persister }}
    >
      <SessionProvider>{children}</SessionProvider>
    </PersistQueryClientProvider>
  );
}
