#!/usr/bin/env node
// Render every placement for the given versions at exact pixel size, then flatten to
// opaque RGB PNG (App Store rejects alpha).
//   node assets/store/src/render.mjs A B        -> assets/store/versions/<V>/*.png
//   node assets/store/src/render.mjs --final B  -> also copies B to assets/store/*.png
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { execFileSync } from "node:child_process";
import { mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const storeDir = join(here, "..");
export const TARGETS = [
  { file: "header-21x9-3840x1646.png", page: "header.html", w: 3840, h: 1646 },
  { file: "header-16x9-5244x2950.png", page: "header.html", w: 5244, h: 2950 },
  { file: "search-3x2-3840x2560.png", page: "search.html", w: 3840, h: 2560 },
  { file: "search-16x9-5244x2950.png", page: "search.html", w: 5244, h: 2950 },
];

const args = process.argv.slice(2);
const finalIdx = args.indexOf("--final");
const final = finalIdx >= 0 ? args.splice(finalIdx, 2)[1] : null;
const versions = [...new Set([...(args.length ? args : ["A"]), ...(final ? [final] : [])])];

const browser = await chromium.launch();
for (const v of versions) {
  const out = join(storeDir, "versions", v);
  mkdirSync(out, { recursive: true });
  for (const t of TARGETS) {
    const page = await browser.newPage({ viewport: { width: t.w, height: t.h }, deviceScaleFactor: 1 });
    const url = pathToFileURL(join(here, t.page)).href + `?v=${v}&w=${t.w}&h=${t.h}`;
    await page.goto(url);
    await page.waitForSelector("body[data-ready='1']");
    const info = await page.evaluate(() => ({ ...document.body.dataset }));
    const dest = join(out, t.file);
    await page.screenshot({ path: dest, clip: { x: 0, y: 0, width: t.w, height: t.h } });
    await page.close();
    execFileSync("python3", ["-I", join(here, "flatten.py"), dest, String(t.w), String(t.h)], { stdio: "inherit" });
    console.log(`${v}/${t.file}`, info.headline ? `headline ${info.headline}px sub ${info.sub}px` : "");
  }
  if (v === final) {
    for (const t of TARGETS) copyFileSync(join(out, t.file), join(storeDir, t.file));
    console.log(`copied ${v} to assets/store/`);
  }
}
await browser.close();
