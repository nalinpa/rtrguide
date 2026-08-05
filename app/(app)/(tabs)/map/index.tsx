import React from "react";
import { Screen, AppText, Stack } from "@/lib/uiKit";

export default function MapScreen() {
  return (
    <Screen padded>
      <Stack gap="sm">
        <AppText variant="screenTitle">Map</AppText>
        <AppText variant="body" status="hint">
          Coming soon.
        </AppText>
      </Stack>
    </Screen>
  );
}
