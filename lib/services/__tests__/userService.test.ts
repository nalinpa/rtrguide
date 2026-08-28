jest.mock("@/lib/api", () => ({ client: { auth: { deleteAccount: jest.fn() } } }));

import { client } from "@/lib/api";
import { userService } from "@/lib/services/userService";

const mockDeleteAccount = client.auth.deleteAccount as jest.Mock;

describe("userService.deleteAccount", () => {
  beforeEach(() => {
    mockDeleteAccount.mockReset();
  });

  it("delegates to the API client's deleteAccount", async () => {
    mockDeleteAccount.mockResolvedValue(null);

    await userService.deleteAccount();

    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
  });

  it("propagates errors from the API call", async () => {
    mockDeleteAccount.mockRejectedValue(new Error("server error"));

    await expect(userService.deleteAccount()).rejects.toThrow("server error");
  });
});
