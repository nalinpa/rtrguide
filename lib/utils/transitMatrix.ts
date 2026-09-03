import rotoruaMatrix from "@/assets/data/rotorua-transit.json";

export function getRequiredTransitSlots(fromSiteId: string, toSiteId: string): number {
  if (fromSiteId === toSiteId) return 0;

  const slots = (rotoruaMatrix as Record<string, Record<string, number>>)[fromSiteId]?.[toSiteId];

  // Not in the matrix (not generated yet, or a site added since) -> flat
  // 1-slot (30 min) default so scheduling never breaks.
  return slots !== undefined ? slots : 1;
}
