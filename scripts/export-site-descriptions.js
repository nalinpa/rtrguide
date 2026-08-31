const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

const keyFile = fs.readdirSync(__dirname).find((f) => f.includes("firebase-adminsdk"));
if (!keyFile) {
  console.error("No *firebase-adminsdk*.json key found in scripts/. Download one from Firebase console > Project settings > Service accounts (project: rotoruaguide-d8274).");
  process.exit(1);
}

initializeApp({ credential: cert(require(path.join(__dirname, keyFile))) });

const db = getFirestore();

(async () => {
  const snap = await db.collection("sites").get();
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  fs.writeFileSync(path.join(__dirname, "sites.json"), JSON.stringify(docs, null, 2));

  const descriptions = docs.map(({ id, description }) => ({ id, description }));
  fs.writeFileSync(path.join(__dirname, "site-descriptions.json"), JSON.stringify(descriptions, null, 2));

  console.log(`Exported ${docs.length} docs to sites.json and site-descriptions.json`);
})();
