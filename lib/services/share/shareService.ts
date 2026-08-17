import { Share as RNShare } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Sentry from "@sentry/react-native";

import type { ShareResult } from "./types";

async function shareImageAsync(fileUri: string): Promise<boolean> {
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "image/png",
        dialogTitle: "Share",
        UTI: "public.png",
      });
      return true;
    }
  } catch (e) {
    Sentry.captureException(e);
  }

  try {
    await RNShare.share({ url: fileUri });
    return true;
  } catch (e) {
    Sentry.captureException(e);
    return false;
  }
}

async function safeUnlink(uri: string) {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch (e) {
    Sentry.captureException(e);
    // ignore
  }
}

export const shareService = {
  async shareImageUriAsync(fileUri: string): Promise<ShareResult> {
    const ok = await shareImageAsync(fileUri);
    void safeUnlink(fileUri);

    if (ok) return { ok: true, mode: "image", shared: true };
    return { ok: false, mode: "image", error: "Share cancelled or failed." };
  },
};
