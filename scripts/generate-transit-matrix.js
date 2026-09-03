/**
 * Generates assets/data/rotorua-transit.json
 * Uses Google Maps Distance Matrix API (driving mode) for real road times
 * between all active, itinerary-eligible sites. Driving, not transit,
 * because Rotorua's own guide content says most sites are a car trip —
 * public transport is one hourly bus route that doesn't cover the
 * parks/walks/lookouts.
 *
 * Two cost cuts vs. a naive full matrix, both free of accuracy loss:
 *   - Accommodation sites are excluded — the app already blocks "Add to
 *     Itinerary" for them everywhere (map overlay, site detail), so they
 *     can never appear in a getRequiredTransitSlots() lookup.
 *   - Each pair is fetched once (A->B) and mirrored for B->A, instead of
 *     fetching both directions — driving time is close enough either way
 *     at this app's 30-min-slot bucketing.
 *
 * Cost: ~$0.005 per origin/destination pair. ~77 eligible sites -> ~2900
 * unordered pairs -> roughly $15, covered by Google's $200/month free
 * credit if nothing else on the project is using it.
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
  const allSites = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((s) => s.lat && s.lng);
  // Accommodation is never an itinerary item (see file header) - no point paying to route it.
  const sites = allSites.filter((s) => !s.category?.includes("Accommodation"));

  const totalPairs = (sites.length * (sites.length - 1)) / 2;
  console.log(`Found ${allSites.length} active sites, ${sites.length} itinerary-eligible.`);
  console.log(`Pairs to fetch (unordered, mirrored both ways): ${totalPairs}`);

  const matrix = {};
  for (const s of sites) matrix[s.id] = {};

  // API limits: 25 origins, 25 destinations, 100 elements per request.
  // Each origin only queries sites after it in the list (j > i) - the
  // result is mirrored into both matrix[from][to] and matrix[to][from].
  const DEST_BATCH = 25;
  let reqNum = 0;
  const totalRequests = sites.reduce((sum, _, i) => sum + Math.ceil((sites.length - i - 1) / DEST_BATCH), 0);

  for (let i = 0; i < sites.length; i++) {
    const from = sites[i];
    const destinations = sites.slice(i + 1);

    for (let j = 0; j < destinations.length; j += DEST_BATCH) {
      const destBatch = destinations.slice(j, j + DEST_BATCH);
      if (destBatch.length === 0) continue;
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
        const el = row.elements[c];
        const slots =
          el.status === "OK"
            ? durationToSlots(el.duration.value)
            : kmToSlots(haversineKm(from.lat, from.lng, to.lat, to.lng));
        matrix[from.id][to.id] = slots;
        matrix[to.id][from.id] = slots;
      }

      console.log(" done");
      await sleep(200);
    }
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(matrix, null, 2));
  console.log(`\nWritten to ${OUTPUT_PATH}`);
  console.log(`  ${sites.length} sites -> ${totalPairs} pairs fetched, ${sites.length * (sites.length - 1)} directed entries written`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
