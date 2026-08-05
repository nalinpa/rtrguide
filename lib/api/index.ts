import { createClient } from "@blacksands/client";
import { getToken } from "./auth";

export const client = createClient("rotoruaguide", { getToken });
