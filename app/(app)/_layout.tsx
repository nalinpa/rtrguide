import React, { useEffect } from "react";
import { Redirect, Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { useSession } from "@/lib/providers/SessionProvider";
import { PurchaseProvider } from "@/lib/iap/PurchaseProvider";

export default function AppLayout() {
  const { session } = useSession();

  useEffect(() => {
    if (session.status !== "loading") {
      SplashScreen.hideAsync();
    }
  }, [session.status]);

  if (session.status === "loading") {
    return null;
  }

  if (session.status === "loggedOut") {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <PurchaseProvider>
      <Slot />
    </PurchaseProvider>
  );
}
