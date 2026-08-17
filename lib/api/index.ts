import { createClient } from "@blacksands/client";
import { createItinerariesApi } from "@blacksands/client/itineraries";
import { getToken } from "./auth";
import type { Site } from "@/lib/models";

export const client = createClient<Site>("rotoruaguide", {
  getToken,
  commerceBaseUrl: "https://commerce-staging.blacksands.app",
});
export const itinerariesApi = createItinerariesApi("rotoruaguide", { getToken });
