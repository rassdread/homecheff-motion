#!/usr/bin/env npx tsx
/**
 * PX.4A.4 certification probe — text overlay size + watermark (Production).
 * Writes under docs/audits/px4a4-human-cert/text-probe/ (gitignored).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import sharp from "sharp";

const OUT = join(process.cwd(), "docs/audits/px4a4-human-cert/text-probe");

async function fontProbe(page: Page) {
  return page.evaluate(() => {
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d")!;
    const geist = getComputedStyle(document.documentElement).getPropertyValue("--font-geist-sans");
    const candidates = [
      "700 48px var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
      "700 48px ui-sans-serif, system-ui, sans-serif",
      "700 48px Arial, sans-serif",
      `700 48px ${geist.trim() || "sans-serif"}`,
    ];
    return {
      geistVar: geist.trim(),
      rows: candidates.map((font) => {
        ctx.font = "10px sans-serif";
        ctx.font = font;
        return {
          requested: font.slice(0, 90),
          applied: ctx.font,
          width: Math.round(ctx.measureText("Test").width),
        };
      }),
    };
  });
}

async function overlayMetrics(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("[data-testid='px4a-preview-canvas']");
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const { width: w, height: h } = canvas;
    const data = ctx.getImageData(0, 0, w, h).data;
    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;
    let white = 0;
    let green = 0;
    const top = Math.floor(h * 0.45);
    for (let y = 0; y < top; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const i = (y * w + x) * 4;
        const r = data[i]!;
        const g = data[i + 1]!;
        const b = data[i + 2]!;
        const isWhite = r > 200 && g > 200 && b > 200;
        const isGreen = g > 90 && g > r + 40 && g > b + 20;
        if (!isWhite && !isGreen) continue;
        if (isWhite) white += 1;
        if (isGreen) green += 1;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    const boxH = maxY >= minY ? maxY - minY + 1 : 0;
    const boxW = maxX >= minX ? maxX - minX + 1 : 0;
    return { canvas: { w, h }, white, green, boxW, boxH, minY, expectedMinEdge: Math.min(w, h) };
  });
}

async function addDarkPhotos(page: Page) {
  const dark = await sharp({
    create: { width: 640, height: 640, channels: 3, background: { r: 18, g: 18, b: 18 } },
  })
    .png()
    .toBuffer();
  const resume = page.getByTestId("px4a-draft-new");
  if (await resume.count()) await resume.click();
  const input = page.getByTestId("px4a-file-input");
  await input.setInputFiles([
    { name: "dark-a.png", mimeType: "image/png", buffer: dark },
    { name: "dark-b.png", mimeType: "image/png", buffer: dark },
  ]);
  await page.getByTestId("px4a-photo-0").waitFor({ timeout: 15_000 });
}

async function runSurface(url: string, name: string) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const composer = page.getByTestId("px4a-composer");
  try {
    await composer.waitFor({ timeout: 20_000 });
  } catch {
    const current = page.url();
    await browser.close();
    return { skipped: true as const, url: current };
  }
  const fonts = await fontProbe(page);
  await addDarkPhotos(page);
  await page.getByTestId("px4a-add-text").click();
  await page.getByTestId("px4a-text-input").fill("Test");
  await page.waitForTimeout(500);

  const ratios: Array<{ label: string; file: string }> = [
    { label: "Verticaal", file: "9x16" },
    { label: "Vierkant", file: "1x1" },
    { label: "Liggend", file: "16x9" },
  ];
  const shots: Array<{ file: string; metrics: Awaited<ReturnType<typeof overlayMetrics>> }> = [];
  for (const r of ratios) {
    await page.getByTestId("px4a-ratio").getByRole("button", { name: r.label }).click();
    await page.waitForTimeout(350);
    const file = join(OUT, `${name}-${r.file}-modern.png`);
    await page.getByTestId("px4a-preview-canvas").screenshot({ path: file });
    shots.push({ file, metrics: await overlayMetrics(page) });
  }

  await page.getByTestId("px4a-text-font").getByRole("button", { name: "Sterk" }).click().catch(async () => {
    await page.getByTestId("px4a-text-font").getByRole("button", { name: "Strong" }).click();
  });
  await page.waitForTimeout(350);
  const strongFile = join(OUT, `${name}-9x16-strong.png`);
  await page.getByTestId("px4a-ratio").getByRole("button", { name: "Verticaal" }).click();
  await page.waitForTimeout(250);
  await page.getByTestId("px4a-preview-canvas").screenshot({ path: strongFile });
  const strong = await overlayMetrics(page);

  await browser.close();
  return { skipped: false as const, fonts, shots, strong: { file: strongFile, metrics: strong } };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const publicRun = await runSurface("https://studio.homecheff.eu/studio/photo-video", "public");
  const itemRun = await runSurface("https://studio.homecheff.eu/studio/photo-video/from-item", "from-item");
  const report = { at: new Date().toISOString(), public: publicRun, fromItem: itemRun };
  writeFileSync(join(OUT, "metrics.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
