import { createClient } from "@blacksands/client";
import { createItinerariesApi } from "@blacksands/client/itineraries";
import { getToken } from "./auth";
import { COMMERCE_BASE_URL } from "@/lib/constants/commerce";
import type { Site } from "@/lib/models";

export const client = createClient<Site>("rotoruaguide", {
  getToken,
  commerceBaseUrl: COMMERCE_BASE_URL,
});
export const itinerariesApi = createItinerariesApi("rotoruaguide", { getToken });
