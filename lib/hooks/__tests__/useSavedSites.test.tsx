jest.mock("@/lib/firebase", () => ({ db: {} }));
jest.mock("@/lib/providers/SessionProvider", () => ({ useSession: jest.fn() }));
jest.mock("firebase/firestore", () => ({
  doc: jest.fn((_db, _col, uid) => ({ __doc: uid })),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  arrayUnion: jest.fn((v) => ({ __op: "union", v })),
  arrayRemove: jest.fn((v) => ({ __op: "remove", v })),
}));

import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider, notifyManager } from "@tanstack/react-query";
import { getDoc, setDoc } from "firebase/firestore";

// react-query batches observer updates via a real setTimeout by default, which fires
// outside of any act() and can leak into the next test's render. Make it synchronous for tests.
notifyManager.setScheduler((cb) => cb());
import { useSession } from "@/lib/providers/SessionProvider";
import { useSavedSites } from "@/lib/hooks/useSavedSites";

const mockUseSession = useSession as jest.Mock;
const mockGetDoc = getDoc as jest.Mock;
const mockSetDoc = setDoc as jest.Mock;

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useSavedSites", () => {
  beforeEach(() => {
    mockGetDoc.mockReset();
    mockSetDoc.mockReset().mockResolvedValue(undefined);
  });

  it("short-circuits to an empty set for a logged-out session", async () => {
    mockUseSession.mockReturnValue({ session: { status: "loggedOut" } });
    const { result } = await renderHook(() => useSavedSites(), { wrapper });

    expect(result.current.savedSiteIds).toEqual(new Set());
    expect(mockGetDoc).not.toHaveBeenCalled();
  });

  it("loads saved site ids for an authed user", async () => {
    mockUseSession.mockReturnValue({ session: { status: "authed", uid: "user-1" } });
    mockGetDoc.mockResolvedValue({ data: () => ({ savedSites: ["site-a", "site-b"] }) });

    const { result } = await renderHook(() => useSavedSites(), { wrapper });

    await waitFor(() => expect(result.current.savedSiteIds).toEqual(new Set(["site-a", "site-b"])));
  });

  it("defaults to an empty set when the user doc has no savedSites field", async () => {
    mockUseSession.mockReturnValue({ session: { status: "authed", uid: "user-1" } });
    mockGetDoc.mockResolvedValue({ data: () => undefined });

    const { result } = await renderHook(() => useSavedSites(), { wrapper });

    await waitFor(() => expect(mockGetDoc).toHaveBeenCalled());
    expect(result.current.savedSiteIds).toEqual(new Set());
  });

  it("adds a site and persists it via setDoc", async () => {
    mockUseSession.mockReturnValue({ session: { status: "authed", uid: "user-1" } });
    // Stateful mock: the post-invalidate refetch should see the same write setDoc just made,
    // so the assertion holds regardless of whether it catches the optimistic or the settled state.
    let savedSites: string[] = [];
    mockGetDoc.mockImplementation(async () => ({ data: () => ({ savedSites }) }));
    mockSetDoc.mockImplementation(async (_ref, patch: { savedSites: { __op: string; v: string } }) => {
      if (patch.savedSites.__op === "union") savedSites = [...savedSites, patch.savedSites.v];
    });

    const { result } = await renderHook(() => useSavedSites(), { wrapper });
    await waitFor(() => expect(mockGetDoc).toHaveBeenCalled());

    await act(async () => result.current.toggleSavedSite({ siteId: "site-c", isSaving: true }));

    await waitFor(() => expect(result.current.savedSiteIds).toEqual(new Set(["site-c"])));
    expect(mockSetDoc).toHaveBeenCalled();
  });

  it("rolls back the optimistic update if the write fails", async () => {
    mockUseSession.mockReturnValue({ session: { status: "authed", uid: "user-1" } });
    mockGetDoc.mockResolvedValue({ data: () => ({ savedSites: ["site-a"] }) });
    mockSetDoc.mockRejectedValue(new Error("offline"));

    const { result } = await renderHook(() => useSavedSites(), { wrapper });
    await waitFor(() => expect(result.current.savedSiteIds).toEqual(new Set(["site-a"])));

    await act(async () => result.current.toggleSavedSite({ siteId: "site-b", isSaving: true }));

    await waitFor(() => expect(result.current.savedSiteIds).toEqual(new Set(["site-a"])));
  });
});
