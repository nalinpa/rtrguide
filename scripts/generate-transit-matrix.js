/**
 * Generates assets/data/rotorua-transit.json
 * Uses Google Maps Distance Matrix API (driving mode) for real road times
 * between all active sites. Driving, not transit, because Rotorua's own
 * guide content says most sites are a car trip — public transport is one
 * hourly bus route that doesn't cover the parks/walks/lookouts.
 *
 * Cost: ~$0.005 per origin/destination pair. For ~93 sites (~8500 pairs)
 * that's roughly $40, covered by Google's $200/month free credit if nothing
 * else on the project is using it.
 *
 * Setup:
 *   1. Firebase service account key → scripts/*firebase-adminsdk*.json
 *      (already present for the other scripts/ jobs in this repo)
 *   2. Google Maps API key with Distance Matrix API enabled
 *      (console.cloud.google.com → APIs & Services → enable "Distance Matrix API")
 *   3. node scripts/generate-transit-matrix.js YOUR_GOOGLE_MAPS_API_KEY
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const https = require("https");
const fs = require("fs");
const path = require("path");

const GOOGLE_API_KEY = process.argv[2];
const OUTPUT_PATH = path.join(__dirname, "../assets/data/rotorua-transit.json");

// Slots = 30-min blocks. Driving-tuned thresholds (Rotorua sites are mostly
// a short drive apart, unlike Auckland's transit-paced original thresholds).
function durationToSlots(seconds) {
  if (seconds <= 10 * 60) return 1; // <= 10 min -> 1 slot
  if (seconds <= 25 * 60) return 2; // 11-25 min -> 2 slots
  if (seconds <= 40 * 60) return 3; // 26-40 min -> 3 slots
  return 4; // > 40 min -> 4 slots
}

// Haversine fallback for when driving routing isn't available.
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function kmToSlots(km) {
  if (km < 5) return 1;
  if (km < 15) return 2;
  if (km < 30) return 3;
  return 4;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Google Distance Matrix API — returns the raw response JSON
function fetchMatrix(origins, destinations, apiKey) {
  const originsStr = origins.map((s) => `${s.lat},${s.lng}`).join("|");
  const destsStr = destinations.map((s) => `${s.lat},${s.lng}`).join("|");
  const url =
    `https://maps.googleapis.com/maps/api/distancematrix/json` +
    `?origins=${encodeURIComponent(originsStr)}` +
    `&destinations=${encodeURIComponent(destsStr)}` +
    `&mode=driving` +
    `&key=${apiKey}`;

  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

async function main() {
  if (!GOOGLE_API_KEY) {
    console.error("Usage: node scripts/generate-transit-matrix.js YOUR_GOOGLE_MAPS_API_KEY");
    process.exit(1);
  }
  const keyFile = fs.readdirSync(__dirname).find((f) => f.includes("firebase-adminsdk"));
  if (!keyFile) {
    console.error("No *firebase-adminsdk*.json key found in scripts/. Download one from Firebase console > Project settings > Service accounts (project: rotoruaguide-d8274).");
    process.exit(1);
  }

  initializeApp({ credential: cert(require(path.join(__dirname, keyFile))) });
  const db = getFirestore();

  console.log("Fetching sites from Firestore...");
  const snap = await db.collection("sites").where("active", "==", true).get();
  const sites = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((s) => s.lat && s.lng);

  console.log(`Found ${sites.length} active sites.`);
  console.log(`Pairs to fetch: ${sites.length * (sites.length - 1)}`);

  const matrix = {};
  for (const s of sites) matrix[s.id] = {};

  // API limits: 25 origins, 25 destinations, 100 elements per request
  // Strategy: 1 origin at a time, destinations batched in groups of 25
  const DEST_BATCH = 25;
  const totalRequests = sites.length * Math.ceil(sites.length / DEST_BATCH);
  let reqNum = 0;

  for (let i = 0; i < sites.length; i++) {
    const from = sites[i];
    for (let j = 0; j < sites.length; j += DEST_BATCH) {
      const destBatch = sites.slice(j, j + DEST_BATCH);
      reqNum++;
      process.stdout.write(`Request ${reqNum}/${totalRequests} (site ${i + 1}/${sites.length})...`);

      let response;
      try {
        response = await fetchMatrix([from], destBatch, GOOGLE_API_KEY);
      } catch (e) {
        console.error("\nAPI request failed:", e.message);
        process.exit(1);
      }

      if (response.status !== "OK") {
        console.error("\nAPI error:", response.status, response.error_message);
        process.exit(1);
      }

      const row = response.rows[0];
      for (let c = 0; c < destBatch.length; c++) {
        const to = destBatch[c];
        if (from.id === to.id) continue;
        const el = row.elements[c];
        if (el.status === "OK") {
          matrix[from.id][to.id] = durationToSlots(el.duration.value);
        } else {
          const km = haversineKm(from.lat, from.lng, to.lat, to.lng);
          matrix[from.id][to.id] = kmToSlots(km);
        }
      }

      console.log(" done");
      await sleep(200);
    }
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(matrix, null, 2));
  console.log(`\nWritten to ${OUTPUT_PATH}`);
  console.log(`  ${sites.length} sites -> ${sites.length * (sites.length - 1)} pairs`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
