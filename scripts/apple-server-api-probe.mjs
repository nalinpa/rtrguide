// Read-only probe: sign an App Store Server API JWT the same way commerce-api does
// (src/lib/apple.ts signAppStoreConnectJwt) and look up one transaction.
import { readFileSync } from "node:fs";
import { createPrivateKey, sign } from "node:crypto";

const [keyPath, keyId, issuerId, bundleId, txId] = process.argv.slice(2);
const b64u = (b) => Buffer.from(b).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const input = `${b64u(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" }))}.${b64u(JSON.stringify({ iss: issuerId, iat: now, exp: now + 1200, aud: "appstoreconnect-v1", bid: bundleId }))}`;
const sig = sign("sha256", Buffer.from(input), { key: createPrivateKey(readFileSync(keyPath)), dsaEncoding: "ieee-p1363" });
const jwt = `${input}.${b64u(sig)}`;

for (const host of ["api.storekit.itunes.apple.com", "api.storekit-sandbox.itunes.apple.com"]) {
  const res = await fetch(`https://${host}/inApps/v1/transactions/${txId}`, { headers: { Authorization: `Bearer ${jwt}` } });
  const text = await res.text();
  let info = text.slice(0, 200);
  try {
    const p = JSON.parse(JSON.parse(text) && Buffer.from(JSON.parse(text).signedTransactionInfo.split(".")[1], "base64url").toString());
    info = JSON.stringify({ productId: p.productId, bundleId: p.bundleId, environment: p.environment, hasAppAccountToken: !!p.appAccountToken, purchaseDate: new Date(p.purchaseDate).toISOString() });
  } catch {}
  console.log(host, res.status, info);
}
