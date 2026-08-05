import React from "react";
import { router } from "expo-router";
import { Screen, AppText, AppButton, Stack } from "@/lib/uiKit";

export default function ShareFrameScreen() {
  return (
    <Screen padded>
      <Stack gap="md">
        <AppText variant="screenTitle">Share</AppText>
        <AppText variant="body" status="hint">
          Sharing is coming soon.
        </AppText>
        <AppButton variant="secondary" onPress={() => router.back()}>
          Close
        </AppButton>
      </Stack>
    </Screen>
  );
}
