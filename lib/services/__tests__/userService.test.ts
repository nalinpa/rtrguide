jest.mock("@/lib/api", () => ({ client: { auth: { deleteAccount: jest.fn() } } }));
jest.mock("@/lib/firebase", () => ({ auth: { signOut: jest.fn() } }));

import { client } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { userService } from "@/lib/services/userService";

const mockDeleteAccount = client.auth.deleteAccount as jest.Mock;
const mockSignOut = auth.signOut as jest.Mock;

describe("userService.deleteAccount", () => {
  beforeEach(() => {
    mockDeleteAccount.mockReset();
    mockSignOut.mockReset();
  });

  it("delegates to the API client's deleteAccount", async () => {
    mockDeleteAccount.mockResolvedValue(null);

    await userService.deleteAccount();

    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
  });

  it("signs out locally after a successful server-side deletion", async () => {
    mockDeleteAccount.mockResolvedValue(null);

    await userService.deleteAccount();

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it("propagates errors from the API call", async () => {
    mockDeleteAccount.mockRejectedValue(new Error("server error"));

    await expect(userService.deleteAccount()).rejects.toThrow("server error");
  });

  it("does not sign out locally when the server-side deletion fails", async () => {
    mockDeleteAccount.mockRejectedValue(new Error("server error"));

    await expect(userService.deleteAccount()).rejects.toThrow("server error");
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
