jest.mock("@/lib/firebase", () => ({ auth: {} }));
jest.mock("firebase/auth", () => ({ onAuthStateChanged: jest.fn() }));

import { renderHook, act } from "@testing-library/react-native";
import { onAuthStateChanged, type User } from "firebase/auth";
import { SessionProvider, useSession } from "@/lib/providers/SessionProvider";

const mockOnAuthStateChanged = onAuthStateChanged as jest.Mock;

describe("SessionProvider / useSession", () => {
  let authCallback: (user: User | null) => void = () => {};

  beforeEach(() => {
    mockOnAuthStateChanged.mockReset().mockImplementation((_auth, cb) => {
      authCallback = cb;
      return () => {};
    });
  });

  it("throws when used outside a SessionProvider", async () => {
    const { result } = await renderHook(() => {
      try {
        return { ok: true, value: useSession() };
      } catch (e) {
        return { ok: false, error: e as Error };
      }
    });
    expect(result.current.ok).toBe(false);
    expect((result.current as { error: Error }).error.message).toBe(
      "useSession must be used within SessionProvider",
    );
  });

  it("starts in loading status before the auth callback fires", async () => {
    mockOnAuthStateChanged.mockImplementation(() => () => {});
    const { result } = await renderHook(() => useSession(), { wrapper: SessionProvider });
    expect(result.current.session).toEqual({ status: "loading" });
  });

  it("moves to loggedOut when the auth callback reports no user", async () => {
    const { result } = await renderHook(() => useSession(), { wrapper: SessionProvider });
    await act(async () => authCallback(null));
    expect(result.current.session).toEqual({ status: "loggedOut" });
  });

  it("moves to authed with the uid when a user signs in", async () => {
    const { result } = await renderHook(() => useSession(), { wrapper: SessionProvider });
    await act(async () => authCallback({ uid: "user-1" } as User));
    expect(result.current.session).toEqual({ status: "authed", uid: "user-1" });
  });

  it("enableGuest moves a signed-out session to guest", async () => {
    const { result } = await renderHook(() => useSession(), { wrapper: SessionProvider });
    await act(async () => authCallback(null));
    await act(async () => result.current.enableGuest());
    expect(result.current.session).toEqual({ status: "guest" });
  });

  it("disableGuest reverts a guest session to loggedOut", async () => {
    const { result } = await renderHook(() => useSession(), { wrapper: SessionProvider });
    await act(async () => authCallback(null));
    await act(async () => result.current.enableGuest());
    await act(async () => result.current.disableGuest());
    expect(result.current.session).toEqual({ status: "loggedOut" });
  });

  it("an authed user takes priority over guest mode", async () => {
    const { result } = await renderHook(() => useSession(), { wrapper: SessionProvider });
    await act(async () => result.current.enableGuest());
    await act(async () => authCallback({ uid: "user-1" } as User));
    expect(result.current.session).toEqual({ status: "authed", uid: "user-1" });
  });
});
