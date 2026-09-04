import React, { useEffect } from "react";
import { Redirect, Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useSession } from "@/lib/providers/SessionProvider";

export default function AuthLayout() {
  const { session } = useSession();

  useEffect(() => {
    if (session.status !== "loading") {
      SplashScreen.hideAsync();
    }
  }, [session.status]);

  if (session.status === "loading") {
    return null;
  }

  if (session.status === "authed") {
    return <Redirect href="/(app)/(tabs)/sites" />;
  }

  // Deliberately no redirect for "guest" — a guest landing here is signing in
  // on purpose (every "Sign In" CTA in the app just pushes this route without
  // clearing guest state first). Bouncing them to the map made every one of
  // those buttons silently do nothing.
  return <Slot />;
}
