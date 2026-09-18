import { auth } from "@/lib/firebase";

export async function getToken(): Promise<string | null> {
  // Firebase restores the persisted session asynchronously, so on a cold start currentUser is
  // null for the first moments. Without this wait the app's first locations request goes out
  // unauthenticated and the api answers with premium teasers (no description), which then only
  // repairs itself when useEntitlementGate refetches — and not at all if that refetch fails.
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}
