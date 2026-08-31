#!/usr/bin/env node
/**
 * Resize and convert site images for R2 upload.
 *
 * Input:  C:\Users\User\Desktop\health\rtr\*.{jpg,jpeg,png,webp,heic,avif}
 * Output: scripts/images/processed/full/{name}.webp   — 1200px wide
 *         scripts/images/processed/thumb/{name}.webp  — 400px wide
 *
 * Usage:
 *   node resize-images.js
 *   node resize-images.js --quality 85
 */

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const INPUT_DIR = "C:/Users/User/Desktop/health/rtr";
const OUTPUT_FULL = path.join(__dirname, "images/processed/full");
const OUTPUT_THUMB = path.join(__dirname, "images/processed/thumb");
const SUPPORTED = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".heic", ".heif"]);

const args = process.argv.slice(2);
const qualityArg = args.indexOf("--quality");
const QUALITY = qualityArg !== -1 ? parseInt(args[qualityArg + 1], 10) : 82;

fs.mkdirSync(OUTPUT_FULL, { recursive: true });
fs.mkdirSync(OUTPUT_THUMB, { recursive: true });

const files = fs.readdirSync(INPUT_DIR).filter((f) => {
  const ext = path.extname(f).toLowerCase();
  return SUPPORTED.has(ext) && !f.startsWith(".");
});

if (!files.length) {
  console.error(`No images found in ${INPUT_DIR}`);
  process.exit(1);
}

console.log(`Processing ${files.length} image(s) at quality ${QUALITY}...\n`);

let done = 0;
let failed = 0;

async function processFile(file) {
  const name = path.basename(file, path.extname(file));
  const src = path.join(INPUT_DIR, file);

  const fullPath = path.join(OUTPUT_FULL, `${name}.webp`);
  const thumbPath = path.join(OUTPUT_THUMB, `${name}.webp`);

  try {
    const img = sharp(src).rotate(); // auto-rotate from EXIF

    await img
      .clone()
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(fullPath);

    await img
      .clone()
      .resize({ width: 400, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(thumbPath);

    const [srcStat, fullStat, thumbStat] = [src, fullPath, thumbPath].map(
      (p) => fs.statSync(p)
    );
    const saving = (((srcStat.size - fullStat.size) / srcStat.size) * 100).toFixed(0);

    console.log(
      `✓ ${file.padEnd(40)} ${kb(srcStat.size)} → full ${kb(fullStat.size)} / thumb ${kb(thumbStat.size)}  (${saving}% smaller)`
    );
    done++;
  } catch (err) {
    console.error(`✗ ${file}: ${err.message}`);
    failed++;
  }
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(0)}kb`.padStart(7);
}

(async () => {
  for (const file of files) {
    await processFile(file);
  }

  console.log(`\n${done} succeeded${failed ? `, ${failed} failed` : ""}.`);
  console.log(`Full images → ${OUTPUT_FULL}`);
  console.log(`Thumbnails  → ${OUTPUT_THUMB}`);
})();
