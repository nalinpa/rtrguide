jest.mock("expo-iap", () => ({
  useIAP: jest.fn(),
  getAvailablePurchases: jest.fn(),
  ErrorCode: { UserCancelled: "user-cancelled" },
}));
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock("@/lib/api", () => ({ client: { entitlements: { register: jest.fn() } } }));
jest.mock("@/lib/firebase", () => ({ auth: { currentUser: null } }));
jest.mock("@/lib/providers/SessionProvider", () => ({ useSession: jest.fn() }));
jest.mock("../deriveAppAccountToken", () => ({ deriveAppAccountToken: jest.fn() }));

import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider, notifyManager } from "@tanstack/react-query";
import { ApiError } from "@blacksands/client";
import { useIAP, getAvailablePurchases } from "expo-iap";

// react-query batches observer updates via a real setTimeout by default, which fires
// outside of any act() and can leak into the next test's render. Make it synchronous for tests.
notifyManager.setScheduler((cb) => cb());
import { client } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { useSession } from "@/lib/providers/SessionProvider";
import { PurchaseProvider, usePurchaseContext, UID_MISMATCH_MESSAGE } from "@/lib/iap/PurchaseProvider";

const mockUseIAP = useIAP as jest.Mock;
const mockGetAvailablePurchases = getAvailablePurchases as jest.Mock;
const mockRegister = client.entitlements!.register as jest.Mock;
const mockUseSession = useSession as jest.Mock;
type MockAuth = { currentUser: { getIdToken: jest.Mock } | null };

const finishTransaction = jest.fn();
const purchase = (transactionId: string) => ({ id: transactionId, transactionId, productId: "full_guide" });

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <PurchaseProvider>{children}</PurchaseProvider>
    </QueryClientProvider>
  );
}

// Delivers a purchase the way StoreKit does, then waits for register to settle.
async function deliver(p: ReturnType<typeof purchase>) {
  const { onPurchaseSuccess } = mockUseIAP.mock.calls.at(-1)![0];
  await act(async () => {
    onPurchaseSuccess(p);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  finishTransaction.mockResolvedValue(undefined);
  mockUseIAP.mockReturnValue({ connected: false, requestPurchase: jest.fn(), finishTransaction, fetchProducts: jest.fn() });
  mockUseSession.mockReturnValue({ session: { status: "authed", uid: "user-1" } });
  (auth as unknown as MockAuth).currentUser = null;
});

describe("PurchaseProvider completePurchase", () => {
  it("finishes the transaction when register succeeds", async () => {
    mockRegister.mockResolvedValue({ granted: true, pending: false });
    const { result } = await renderHook(() => usePurchaseContext(), { wrapper });

    await deliver(purchase("tx-1"));

    await waitFor(() => expect(finishTransaction).toHaveBeenCalledTimes(1));
    expect(result.current.error).toBeNull();
  });

  it("on 401 force-refreshes the token and retries register once", async () => {
    const getIdToken = jest.fn().mockResolvedValue("fresh");
    (auth as unknown as MockAuth).currentUser = { getIdToken };
    mockRegister.mockRejectedValueOnce(new ApiError(401, "unauthorized")).mockResolvedValueOnce({ granted: true, pending: false });
    await renderHook(() => usePurchaseContext(), { wrapper });

    await deliver(purchase("tx-1"));

    await waitFor(() => expect(finishTransaction).toHaveBeenCalledTimes(1));
    expect(getIdToken).toHaveBeenCalledWith(true);
    expect(mockRegister).toHaveBeenCalledTimes(2);
  });

  it("leaves the transaction unfinished when register still returns 401 after a refresh", async () => {
    (auth as unknown as MockAuth).currentUser = { getIdToken: jest.fn().mockResolvedValue("fresh") };
    mockRegister.mockRejectedValue(new ApiError(401, "unauthorized"));
    const { result } = await renderHook(() => usePurchaseContext(), { wrapper });

    await deliver(purchase("tx-1"));

    await waitFor(() => expect(result.current.error?.message).toMatch(/pending/));
    expect(mockRegister).toHaveBeenCalledTimes(2);
    expect(finishTransaction).not.toHaveBeenCalled();
  });

  it("leaves the transaction unfinished when the token refresh fails (offline)", async () => {
    (auth as unknown as MockAuth).currentUser = { getIdToken: jest.fn().mockRejectedValue(new Error("auth/network-request-failed")) };
    mockRegister.mockRejectedValue(new ApiError(401, "unauthorized"));
    const { result } = await renderHook(() => usePurchaseContext(), { wrapper });

    await deliver(purchase("tx-1"));

    await waitFor(() => expect(result.current.error?.message).toMatch(/pending/));
    expect(finishTransaction).not.toHaveBeenCalled();
  });

  it.each([400, 404])("leaves the transaction unfinished on %i", async (status) => {
    mockRegister.mockRejectedValue(new ApiError(status, "unknown_app"));
    const { result } = await renderHook(() => usePurchaseContext(), { wrapper });

    await deliver(purchase("tx-1"));

    await waitFor(() => expect(result.current.error?.message).toMatch(/pending/));
    expect(finishTransaction).not.toHaveBeenCalled();
  });

  it("finishes and shows the account-mismatch message on 403", async () => {
    mockRegister.mockRejectedValue(new ApiError(403, "uid_mismatch"));
    const { result } = await renderHook(() => usePurchaseContext(), { wrapper });

    await deliver(purchase("tx-1"));

    await waitFor(() => expect(finishTransaction).toHaveBeenCalledTimes(1));
    expect(result.current.error).toEqual({ productId: "full_guide", message: UID_MISMATCH_MESSAGE });
  });

  it("finishes and shows the refunded/already-claimed message on 409", async () => {
    mockRegister.mockRejectedValue(new ApiError(409, "already_claimed"));
    const { result } = await renderHook(() => usePurchaseContext(), { wrapper });

    await deliver(purchase("tx-1"));

    await waitFor(() => expect(finishTransaction).toHaveBeenCalledTimes(1));
    expect(result.current.error?.message).toMatch(/refunded or already used/);
  });

  it.each([
    ["5xx", new ApiError(503, "unavailable")],
    ["network", new TypeError("Network request failed")],
  ])("leaves the transaction unfinished on %s", async (_label, err) => {
    mockRegister.mockRejectedValue(err);
    const { result } = await renderHook(() => usePurchaseContext(), { wrapper });

    await deliver(purchase("tx-1"));

    await waitFor(() => expect(result.current.error?.message).toMatch(/pending/));
    expect(finishTransaction).not.toHaveBeenCalled();
  });
});

describe("PurchaseProvider restore", () => {
  it("keeps going after a 403 on the first purchase and reports the mismatch", async () => {
    const first = purchase("tx-1");
    const second = purchase("tx-2");
    mockGetAvailablePurchases.mockResolvedValue([first, second]);
    mockRegister.mockImplementation(async (txId: string) => {
      if (txId === "tx-1") throw new ApiError(403, "uid_mismatch");
      return { granted: true, pending: false };
    });
    const { result } = await renderHook(() => usePurchaseContext(), { wrapper });

    let outcome;
    await act(async () => {
      outcome = await result.current.restore();
    });

    expect(mockRegister).toHaveBeenCalledWith("tx-2");
    expect(outcome).toEqual({ restored: 1, mismatch: true, failed: 0 });
    expect(finishTransaction).toHaveBeenCalledWith({ purchase: first, isConsumable: false });
    expect(finishTransaction).toHaveBeenCalledWith({ purchase: second, isConsumable: false });
  });

  it("counts retryable errors as failed and leaves those transactions unfinished", async () => {
    mockGetAvailablePurchases.mockResolvedValue([purchase("tx-1")]);
    mockRegister.mockRejectedValue(new ApiError(503, "unavailable"));
    const { result } = await renderHook(() => usePurchaseContext(), { wrapper });

    let outcome;
    await act(async () => {
      outcome = await result.current.restore();
    });

    expect(outcome).toEqual({ restored: 0, mismatch: false, failed: 1 });
    expect(finishTransaction).not.toHaveBeenCalled();
  });
});
