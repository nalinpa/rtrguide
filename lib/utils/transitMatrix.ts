export function getRequiredTransitSlots(fromSiteId: string, toSiteId: string): number {
  if (fromSiteId === toSiteId) return 0;
  return 1; // flat default (30 min) -- no precomputed matrix yet, see spec
}