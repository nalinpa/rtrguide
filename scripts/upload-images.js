#!/usr/bin/env node
/**
 * Upload processed images to R2 via the admin API.
 *
 * Input: scripts/images/processed/{full,thumb}/*.webp
 * Requires: ADMIN_TOKEN env var (Firebase ID token for an admin UID)
 *
 * Usage:
 *   ADMIN_TOKEN=... node upload-images.js
 */

const fs = require("fs");
const path = require("path");

const APP_ID = "rtrguide";
const API_BASE = "https://api.blacksands.app";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!ADMIN_TOKEN) {
  console.error("Set ADMIN_TOKEN (Firebase ID token for an admin UID) first.");
  process.exit(1);
}

async function upload(dir) {
  for (const file of fs.readdirSync(dir)) {
    const bytes = fs.readFileSync(path.join(dir, file));
    const res = await fetch(`${API_BASE}/v1/${APP_ID}/admin/images`, {
      method: "POST",
      headers: {
        "Content-Type": "image/webp",
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: bytes,
    });
    const json = await res.json();
    if (!json.ok) {
      console.error(`✗ ${file}: ${json.error}`);
      continue;
    }
    console.log(`✓ ${file} → ${json.data.url}`);
  }
}

(async () => {
  await upload(path.join(__dirname, "images/processed/full"));
  await upload(path.join(__dirname, "images/processed/thumb"));
})();
