import React from "react";
import { Screen, AppText, Stack } from "@/lib/uiKit";

export default function ItineraryScreen() {
  return (
    <Screen padded>
      <Stack gap="sm">
        <AppText variant="screenTitle">Itinerary</AppText>
        <AppText variant="body" status="hint">
          Coming soon.
        </AppText>
      </Stack>
    </Screen>
  );
}
