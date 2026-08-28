jest.mock("expo-file-system/legacy", () => ({ deleteAsync: jest.fn() }));
jest.mock("expo-sharing", () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

import { Share as RNShare } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Sentry from "@sentry/react-native";
import { shareService } from "@/lib/services/share/shareService";

const mockShare = jest.spyOn(RNShare, "share").mockImplementation(() => Promise.resolve({} as never));
const mockDeleteAsync = FileSystem.deleteAsync as jest.Mock;
const mockIsAvailable = Sharing.isAvailableAsync as jest.Mock;
const mockShareAsync = Sharing.shareAsync as jest.Mock;
const mockCaptureException = Sentry.captureException as jest.Mock;

describe("shareService.shareImageUriAsync", () => {
  beforeEach(() => {
    mockShare.mockReset();
    mockDeleteAsync.mockReset().mockResolvedValue(undefined);
    mockIsAvailable.mockReset();
    mockShareAsync.mockReset();
    mockCaptureException.mockReset();
  });

  it("shares via expo-sharing when available", async () => {
    mockIsAvailable.mockResolvedValue(true);
    mockShareAsync.mockResolvedValue(undefined);

    const result = await shareService.shareImageUriAsync("file:///pic.png");

    expect(mockShareAsync).toHaveBeenCalledWith(
      "file:///pic.png",
      expect.objectContaining({ mimeType: "image/png" }),
    );
    expect(mockShare).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, mode: "image", shared: true });
  });

  it("falls back to the native Share sheet when expo-sharing is unavailable", async () => {
    mockIsAvailable.mockResolvedValue(false);
    mockShare.mockResolvedValue({} as never);

    const result = await shareService.shareImageUriAsync("file:///pic.png");

    expect(mockShare).toHaveBeenCalledWith({ url: "file:///pic.png" });
    expect(result).toEqual({ ok: true, mode: "image", shared: true });
  });

  it("falls back to the native Share sheet when expo-sharing throws", async () => {
    mockIsAvailable.mockResolvedValue(true);
    mockShareAsync.mockRejectedValue(new Error("boom"));
    mockShare.mockResolvedValue({} as never);

    const result = await shareService.shareImageUriAsync("file:///pic.png");

    expect(mockCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(mockShare).toHaveBeenCalledWith({ url: "file:///pic.png" });
    expect(result).toEqual({ ok: true, mode: "image", shared: true });
  });

  it("reports failure when both share paths fail", async () => {
    mockIsAvailable.mockResolvedValue(false);
    mockShare.mockRejectedValue(new Error("cancelled"));

    const result = await shareService.shareImageUriAsync("file:///pic.png");

    expect(mockCaptureException).toHaveBeenCalledWith(expect.any(Error));
    expect(result).toEqual({ ok: false, mode: "image", error: "Share cancelled or failed." });
  });

  it("always attempts to clean up the temp file", async () => {
    mockIsAvailable.mockResolvedValue(true);
    mockShareAsync.mockResolvedValue(undefined);

    await shareService.shareImageUriAsync("file:///pic.png");
    await Promise.resolve();

    expect(mockDeleteAsync).toHaveBeenCalledWith("file:///pic.png", { idempotent: true });
  });

  it("swallows cleanup errors instead of throwing", async () => {
    mockIsAvailable.mockResolvedValue(true);
    mockShareAsync.mockResolvedValue(undefined);
    mockDeleteAsync.mockRejectedValue(new Error("no such file"));

    await expect(shareService.shareImageUriAsync("file:///pic.png")).resolves.toEqual({
      ok: true,
      mode: "image",
      shared: true,
    });
  });
});
