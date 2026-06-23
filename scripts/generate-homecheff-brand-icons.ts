/**
 * Generate favicon + touch icons from public/homecheff-globe-man.png (SSOT).
 * Run: npm run generate:brand-icons
 *
 * Safari fetches bare /favicon.ico before HTML — static public/ files only.
 * Do NOT use src/app/icon.* (Next.js adds hashed URLs Safari may ignore).
 */
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { HOMECHEFF_BRAND_ICON_ASSET_VERSION } from "../src/lib/homecheff-brand-icon-version";

const ROOT = process.cwd();
const SOURCE = resolve(ROOT, "public/homecheff-globe-man.png");
const OUT = resolve(ROOT, "public");
const APP = resolve(ROOT, "src/app");
const V = HOMECHEFF_BRAND_ICON_ASSET_VERSION;

const FILES = {
  favicon16: `homecheff-favicon-16-${V}.png`,
  favicon32: `homecheff-favicon-32-${V}.png`,
  appleTouch: `homecheff-apple-touch-icon-${V}.png`,
} as const;

const LEGACY_PUBLIC_FILES = [
  "homecheff-favicon-16-v4.png",
  "homecheff-favicon-32-v4.png",
  "homecheff-apple-touch-icon-v4.png",
  "homecheff-favicon-16-v5.png",
  "homecheff-favicon-32-v5.png",
  "homecheff-apple-touch-icon-v5.png",
  "homecheff-favicon-16-v6.png",
  "homecheff-favicon-32-v6.png",
  "homecheff-apple-touch-icon-v6.png",
  "homecheff-favicon-16-v7.png",
  "homecheff-favicon-32-v7.png",
  "homecheff-apple-touch-icon-v7.png",
  "homecheff-favicon-16-v8.png",
  "homecheff-favicon-32-v8.png",
  "homecheff-apple-touch-icon-v8.png",
  "homecheff-favicon-16-v9.png",
  "homecheff-favicon-32-v9.png",
  "homecheff-apple-touch-icon-v9.png",
  "favicon-16x16.png",
  "favicon-32x32.png",
] as const;

const APP_ICON_FILES = ["favicon.ico", "icon.png", "apple-icon.png"] as const;

/** Opaque white — Safari dark tabs need contrast. */
const FAVICON_BG = { r: 255, g: 255, b: 255, alpha: 1 } as const;

async function resizePng(size: number): Promise<Buffer> {
  return sharp(readFileSync(SOURCE))
    .resize(size, size, {
      fit: "contain",
      background: FAVICON_BG,
    })
    .png()
    .toBuffer();
}

async function main() {
  const favicon16 = await resizePng(16);
  const favicon32 = await resizePng(32);
  const appleTouch = await resizePng(180);

  writeFileSync(resolve(OUT, FILES.favicon16), favicon16);
  writeFileSync(resolve(OUT, FILES.favicon32), favicon32);
  writeFileSync(resolve(OUT, FILES.appleTouch), appleTouch);

  // Served by app routes with correct image/png MIME (Safari caches static root paths).
  for (const legacyRoot of ["favicon.ico", "apple-touch-icon.png"] as const) {
    try {
      unlinkSync(resolve(OUT, legacyRoot));
    } catch {
      // already removed
    }
  }
  writeFileSync(resolve(OUT, "icon.png"), favicon32);

  for (const legacy of LEGACY_PUBLIC_FILES) {
    try {
      unlinkSync(resolve(OUT, legacy));
    } catch {
      // already removed
    }
  }

  for (const appIcon of APP_ICON_FILES) {
    try {
      unlinkSync(resolve(APP, appIcon));
    } catch {
      // already removed
    }
  }

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
        src: `/${FILES.favicon16}`,
        sizes: "16x16",
        type: "image/png",
      },
      {
        src: `/${FILES.favicon32}`,
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: `/${FILES.appleTouch}`,
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

  console.log(`Generated favicon assets (${V}); /favicon.ico via app route`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
