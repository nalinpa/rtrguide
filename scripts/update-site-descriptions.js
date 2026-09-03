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
  const rewritten = JSON.parse(fs.readFileSync(path.join(__dirname, "rewritten-descriptions.json"), "utf8"));

  const toWrite = rewritten.filter((r) => r.description && r.description.trim());
  const skipped = rewritten.filter((r) => !r.description || !r.description.trim());

  const batch = db.batch();
  for (const { id, description } of toWrite) {
    batch.update(db.collection("sites").doc(id), { description });
  }
  await batch.commit();

  console.log(`Updated ${toWrite.length} site descriptions in Firestore.`);
  if (skipped.length) {
    console.log(`Skipped ${skipped.length} with empty description (left untouched): ${skipped.map((s) => s.id).join(", ")}`);
  }
})();
