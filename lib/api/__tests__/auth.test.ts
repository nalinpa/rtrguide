jest.mock("@/lib/firebase", () => ({ auth: { currentUser: null } }));

import { auth } from "@/lib/firebase";
import { getToken } from "@/lib/api/auth";

type MockAuth = { currentUser: { getIdToken: jest.Mock } | null };

describe("getToken", () => {
  afterEach(() => {
    (auth as unknown as MockAuth).currentUser = null;
  });

  it("returns null when there is no signed-in user", async () => {
    await expect(getToken()).resolves.toBeNull();
  });

  it("returns the current user's id token", async () => {
    const getIdToken = jest.fn().mockResolvedValue("tok123");
    (auth as unknown as MockAuth).currentUser = { getIdToken };

    await expect(getToken()).resolves.toBe("tok123");
    expect(getIdToken).toHaveBeenCalledTimes(1);
  });
});
