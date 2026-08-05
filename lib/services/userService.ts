import { deleteUser, type User } from "firebase/auth";

export const userService = {
  async deleteAccount(user: User): Promise<void> {
    await deleteUser(user);
  },
};
