const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

const keyFile = fs.readdirSync(__dirname).find((f) => f.includes("firebase-adminsdk"));
initializeApp({ credential: cert(require(path.join(__dirname, keyFile))) });
const db = getFirestore();

const norm = (s) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

(async () => {
  const snap = await db.collection("sites").get();
  const byName = new Map();
  snap.docs.forEach((d) => byName.set(norm(d.data().name || ""), { id: d.id, name: d.data().name }));

  const rough = JSON.parse(fs.readFileSync(path.join(__dirname, "rough-prices.json"), "utf8"));

  const matched = [];
  const unmatchedInRough = [];
  const emptyPrice = [];

  for (const entry of rough) {
    const site = byName.get(norm(entry.name));
    if (!site) {
      unmatchedInRough.push(entry.name);
      continue;
    }
    if (!entry.price || !entry.price.trim()) {
      emptyPrice.push(entry.name);
      continue;
    }
    matched.push({ id: site.id, name: site.name, price: entry.price });
  }

  const roughNamesNorm = new Set(rough.map((e) => norm(e.name)));
  const missingFromRough = [...byName.entries()]
    .filter(([n]) => !roughNamesNorm.has(n))
    .map(([, v]) => v.name);

  fs.writeFileSync(path.join(__dirname, "price-updates.json"), JSON.stringify(matched, null, 2));

  console.log(`Matched: ${matched.length}`);
  console.log(`Unmatched (name in rough-prices.json not found in Firestore): ${unmatchedInRough.length}`, unmatchedInRough);
  console.log(`Skipped (empty price in rough-prices.json): ${emptyPrice.length}`, emptyPrice);
  console.log(`Firestore sites with no entry at all in rough-prices.json: ${missingFromRough.length}`, missingFromRough);
})();
