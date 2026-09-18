jest.mock("@/lib/firebase", () => ({ auth: { currentUser: null, authStateReady: jest.fn().mockResolvedValue(undefined) } }));

import { auth } from "@/lib/firebase";
import { getToken } from "@/lib/api/auth";

type MockAuth = { currentUser: { getIdToken: jest.Mock } | null; authStateReady: jest.Mock };

describe("getToken", () => {
  afterEach(() => {
    (auth as unknown as MockAuth).currentUser = null;
  });

  it("returns null when there is no signed-in user", async () => {
    await expect(getToken()).resolves.toBeNull();
  });

  it("waits for the persisted session to restore before reading currentUser", async () => {
    const getIdToken = jest.fn().mockResolvedValue("tok123");
    const mockAuth = auth as unknown as MockAuth;
    // Cold start: currentUser is null until authStateReady resolves.
    mockAuth.authStateReady.mockImplementation(async () => {
      mockAuth.currentUser = { getIdToken };
    });

    await expect(getToken()).resolves.toBe("tok123");

    mockAuth.authStateReady.mockResolvedValue(undefined);
  });

  it("returns the current user's id token", async () => {
    const getIdToken = jest.fn().mockResolvedValue("tok123");
    (auth as unknown as MockAuth).currentUser = { getIdToken };

    await expect(getToken()).resolves.toBe("tok123");
    expect(getIdToken).toHaveBeenCalledTimes(1);
  });
});
