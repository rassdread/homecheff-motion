/**
 * Generate favicon + touch icons from public/homecheff-globe-man.png (SSOT).
 * Run: npm run generate:brand-icons
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import toIco from "to-ico";
import { HOMECHEFF_BRAND_ICON_ASSET_VERSION } from "../src/lib/homecheff-brand-icon-version";

const ROOT = process.cwd();
const SOURCE = resolve(ROOT, "public/homecheff-globe-man.png");
const OUT = resolve(ROOT, "public");
const V = HOMECHEFF_BRAND_ICON_ASSET_VERSION;

const V4_FILES = {
  favicon16: `homecheff-favicon-16-${V}.png`,
  favicon32: `homecheff-favicon-32-${V}.png`,
  appleTouch: `homecheff-apple-touch-icon-${V}.png`,
  faviconIco: `homecheff-favicon-${V}.ico`,
} as const;

async function resizePng(size: number): Promise<Buffer> {
  return sharp(readFileSync(SOURCE))
    .resize(size, size, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toBuffer();
}

async function main() {
  const favicon16 = await resizePng(16);
  const favicon32 = await resizePng(32);
  const appleTouch = await resizePng(180);
  const ico = await toIco([favicon16, favicon32]);

  writeFileSync(resolve(OUT, V4_FILES.favicon16), favicon16);
  writeFileSync(resolve(OUT, V4_FILES.favicon32), favicon32);
  writeFileSync(resolve(OUT, V4_FILES.appleTouch), appleTouch);
  writeFileSync(resolve(OUT, V4_FILES.faviconIco), ico);

  // Legacy root fallbacks (same bytes — not primary in metadata).
  writeFileSync(resolve(OUT, "favicon-16x16.png"), favicon16);
  writeFileSync(resolve(OUT, "favicon-32x32.png"), favicon32);
  writeFileSync(resolve(OUT, "apple-touch-icon.png"), appleTouch);
  writeFileSync(resolve(OUT, "favicon.ico"), ico);

  const manifest = {
    name: "HomeCheff Studio",
    short_name: "HomeCheff",
    description: "Your AI production line — create once, adapt endlessly.",
    start_url: "/",
    display: "standalone",
    background_color: "#041428",
    theme_color: "#006D52",
    icons: [
      {
        src: `/${V4_FILES.favicon16}`,
        sizes: "16x16",
        type: "image/png",
      },
      {
        src: `/${V4_FILES.favicon32}`,
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: `/${V4_FILES.appleTouch}`,
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/homecheff-globe-man.png",
        sizes: "1254x1254",
        type: "image/png",
        purpose: "any",
      },
    ],
  };

  writeFileSync(
    resolve(OUT, "site.webmanifest"),
    `${JSON.stringify(manifest, null, 2)}\n`
  );

  console.log(`Generated HomeCheff brand icons in public/ (${V} filenames)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
