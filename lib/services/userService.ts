import { client } from "@/lib/api";

export const userService = {
  async deleteAccount(): Promise<void> {
    await client.auth.deleteAccount();
  },
};
