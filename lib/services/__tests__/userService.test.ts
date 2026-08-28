jest.mock("firebase/auth", () => ({ deleteUser: jest.fn() }));

import { deleteUser, type User } from "firebase/auth";
import { userService } from "@/lib/services/userService";

const mockDeleteUser = deleteUser as jest.Mock;

describe("userService.deleteAccount", () => {
  beforeEach(() => {
    mockDeleteUser.mockReset();
  });

  it("delegates to firebase's deleteUser with the given user", async () => {
    mockDeleteUser.mockResolvedValue(undefined);
    const user = { uid: "user-1" } as User;

    await userService.deleteAccount(user);

    expect(mockDeleteUser).toHaveBeenCalledWith(user);
  });

  it("propagates errors from deleteUser", async () => {
    mockDeleteUser.mockRejectedValue(new Error("requires-recent-login"));
    const user = { uid: "user-1" } as User;

    await expect(userService.deleteAccount(user)).rejects.toThrow("requires-recent-login");
  });
});
