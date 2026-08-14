// rotorua-guide/lib/iap/deriveAppAccountToken.ts
//
// Ported verbatim from enginev1/commerce-api/src/lib/appAccountToken.ts —
// see that file's comment for why the namespace doesn't need to be secret.
// The namespace constant and bit-twiddling below MUST stay byte-identical
// to the commerce-api copy, or the backend's uid-binding check
// (COMMERCE-SPEC.md §7) will reject every real purchase.
import * as Crypto from "expo-crypto";

const NAMESPACE = "blacksands.iap.appAccountToken.v1";

export function formatAsUuid(hex32: string): string {
  const chars = hex32.slice(0, 32).split("");
  chars[12] = "4";
  chars[16] = ((parseInt(chars[16], 16) & 0x3) | 0x8).toString(16);
  const h = chars.join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

export async function deriveAppAccountToken(uid: string): Promise<string> {
  const hex = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${NAMESPACE}:${uid}`);
  return formatAsUuid(hex);
}
