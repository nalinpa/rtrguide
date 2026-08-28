import { client } from "@/lib/api";
import { auth } from "@/lib/firebase";

export const userService = {
  async deleteAccount(): Promise<void> {
    await client.auth.deleteAccount();
    // Server-side delete doesn't touch the local SDK session, so sign out
    // explicitly or the user stays "authed" client-side until token refresh.
    await auth.signOut();
  },
};
