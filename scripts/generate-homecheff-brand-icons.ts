/**
 * Generate favicon + touch icons from public/homecheff-globe-man.png
 * Run: npx tsx scripts/generate-homecheff-brand-icons.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import toIco from "to-ico";

const ROOT = process.cwd();
const SOURCE = resolve(ROOT, "public/homecheff-globe-man.png");
const OUT = resolve(ROOT, "public");

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

  writeFileSync(resolve(OUT, "favicon-16x16.png"), favicon16);
  writeFileSync(resolve(OUT, "favicon-32x32.png"), favicon32);
  writeFileSync(resolve(OUT, "apple-touch-icon.png"), appleTouch);

  const ico = await toIco([favicon16, favicon32]);
  writeFileSync(resolve(OUT, "favicon.ico"), ico);

  const b64 = favicon32.toString("base64");
  writeFileSync(
    resolve(OUT, "favicon.svg"),
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 32 32" role="img" aria-label="HomeCheff"><image width="32" height="32" xlink:href="data:image/png;base64,${b64}"/></svg>`
  );

  console.log("Generated HomeCheff brand icons in public/");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
