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
  const updates = JSON.parse(fs.readFileSync(path.join(__dirname, "price-updates.json"), "utf8"));

  const batch = db.batch();
  for (const { id, price } of updates) {
    batch.update(db.collection("sites").doc(id), { price });
  }
  await batch.commit();

  console.log(`Updated ${updates.length} site prices in Firestore.`);
})();
