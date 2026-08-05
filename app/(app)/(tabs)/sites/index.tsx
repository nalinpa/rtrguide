import React from "react";
import { Screen, AppText, Stack } from "@/lib/uiKit";

export default function SiteListScreen() {
  return (
    <Screen padded>
      <Stack gap="sm">
        <AppText variant="screenTitle">Locations</AppText>
        <AppText variant="body" status="hint">
          Coming soon.
        </AppText>
      </Stack>
    </Screen>
  );
}
