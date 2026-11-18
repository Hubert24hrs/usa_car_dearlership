#!/usr/bin/env node
/**
 * Self-host the demo vehicle photos.
 *
 * Downloads every source image in prisma/seed-data/vehicle-images.json (and the
 * homepage hero), writes a compressed JPEG (max 1280px wide, ~100 KB) to
 * public/vehicles/, and points the manifest at the local file while keeping the
 * original URL as `source`. Next.js then serves AVIF/WebP variants from these
 * small local files, so pages never wait on large remote PNGs.
 *
 *   node scripts/optimize-vehicle-images.mjs
 *
 * Runs in GitHub Actions ("Optimize vehicle photos" workflow) where downloads
 * are fast; safe to re-run (already-local entries are skipped).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "prisma/seed-data/vehicle-images.json");
const siteConfigPath = path.join(root, "lib/site.config.ts");
const outDir = path.join(root, "public/vehicles");
const CONCURRENCY = 8;

const slug = (s) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function download(url, attempts = 4) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (error) {
      if (attempt >= attempts) throw error;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}

const toJpeg = (input, width) =>
  sharp(input).resize({ width, withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true, progressive: true }).toBuffer();

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
await mkdir(outDir, { recursive: true });

const queue = [];
for (const [key, photos] of Object.entries(manifest.images)) {
  const [make, model] = key.split("|");
  for (const photo of photos) if (/^https?:\/\//.test(photo.url)) queue.push({ make, model, photo });
}
const total = queue.length;
let written = 0;
let bytes = 0;
const failures = [];

async function worker() {
  for (let job = queue.shift(); job; job = queue.shift()) {
    const { make, model, photo } = job;
    const file = `${slug(make)}-${slug(model)}-${slug(photo.color)}.jpg`;
    try {
      const output = await toJpeg(await download(photo.url), 1280);
      await writeFile(path.join(outDir, file), output);
      photo.source = photo.url;
      photo.url = `/vehicles/${file}`;
      bytes += output.length;
      if (++written % 50 === 0) console.log(`  ${written}/${total} photos`);
    } catch (error) {
      failures.push(`${make} ${model} (${photo.color}): ${error.message}`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

// Homepage hero image (lib/site.config.ts → HERO_IMAGE.src)
const siteConfig = await readFile(siteConfigPath, "utf8");
const heroUrl = siteConfig.match(/HERO_IMAGE = \{\s*src: "(https:\/\/[^"]+)"/)?.[1];
if (heroUrl) {
  try {
    const hero = await toJpeg(await download(heroUrl), 1920);
    await writeFile(path.join(root, "public/hero-showroom.jpg"), hero);
    await writeFile(siteConfigPath, siteConfig.replace(heroUrl, "/hero-showroom.jpg"));
    console.log(`hero: ${(hero.length / 1024).toFixed(0)} KB`);
  } catch (error) {
    failures.push(`hero: ${error.message}`);
  }
}

manifest.note =
  "AI-generated illustrative vehicle photos (Higgsfield, model gpt_image_2_6) for demo inventory only, self-hosted as compressed JPEGs in public/vehicles. Keyed by 'Make|Model', one entry per paint color; `source` is the original generation URL. Not photos of actual units for sale.";
await writeFile(manifestPath, JSON.stringify(manifest, null, 1) + "\n");

console.log(`photos written: ${written}/${total}, ${(bytes / 1024 / 1024).toFixed(1)} MB total, avg ${written ? Math.round(bytes / written / 1024) : 0} KB`);
if (failures.length) {
  console.error(`failures (${failures.length}):\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
