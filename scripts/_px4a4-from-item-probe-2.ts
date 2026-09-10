#!/usr/bin/env npx tsx
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "playwright";

const STUDIO = "https://studio.homecheff.eu";
const HC = "https://homecheff.eu";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROFILE = join(ROOT, ".px4a4-chrome-profile");
const OUT = join(ROOT, "docs/audits/px4a4-human-cert");
const SHOT = join(OUT, "shots-final");

async function srcs(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-testid^="px4a-photo-"] img')).map(
      (img) => (img as HTMLImageElement).currentSrc || (img as HTMLImageElement).src
    )
  );
}

async function continueResume(page: Page) {
  const cont = page.getByTestId("px4a-resume-continue");
  if (await cont.count()) {
    await cont.click();
    await page.waitForTimeout(1200);
  }
}

async function main() {
  mkdirSync(SHOT, { recursive: true });
  const context = await chromium.launchPersistentContext(PROFILE, {
    channel: "chrome",
    headless: true,
    viewport: { width: 1280, height: 900 },
    locale: "nl-NL",
    args: ["--disable-blink-features=AutomationControlled", "--headless=new"],
  });
  const page = context.pages()[0] || (await context.newPage());
  const log: Record<string, unknown> = {};

  // --- HomeCheff wizard: find Maak gratis video ---
  await page.goto(`${HC}/sell/new`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(2000);
  const bied = page.getByText("Ik bied iets aan", { exact: false }).first();
  if (await bied.count()) await bied.click();
  await page.waitForTimeout(800);
  for (const label of ["Koken", "Groeien", "Maken", "Tuin", "Moestuin", "Planten"]) {
    const el = page.getByText(label, { exact: false }).first();
    if (await el.count()) {
      await el.click().catch(() => undefined);
      await page.waitForTimeout(400);
    }
  }
  for (const label of ["Volgende", "Doorgaan", "Verder", "Start", "Kies"]) {
    const btn = page.getByRole("button", { name: label }).first();
    if (await btn.count()) {
      await btn.click().catch(() => undefined);
      await page.waitForTimeout(600);
    }
  }
  await page.waitForTimeout(1500);
  log.hcAfterClicks = page.url();
  log.hcSnippet = (await page.locator("body").innerText()).slice(0, 1200).replace(/\n+/g, " | ");
  log.hcCta = (await page.locator('[data-testid="px4a-make-free-video"]').count()) > 0;
  log.hcCtaText = /Maak gratis video/.test(String(log.hcSnippet));
  log.hcAttrib = /Mogelijk gemaakt door HomeCheff Studio/.test(String(log.hcSnippet));
  log.hcPx3 = /Wat wil je maken\?|Wat wil je doen\?/.test(String(log.hcSnippet));
  await page.screenshot({ path: join(SHOT, "sell-new-after-intent.png"), fullPage: true });

  // --- Contextual creator ---
  await page.goto(`${STUDIO}/studio/photo-video/from-item`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(1500);
  await continueResume(page);
  await page.getByTestId("px4a-composer").waitFor({ timeout: 20_000 });

  const labels = await page.locator('[data-testid="px4a-video-duration"] button').allTextContents();
  log.hcDurationLabels = labels;
  log.no45 = !labels.some((l) => /45/.test(l));
  log.no60 = !labels.some((l) => /60/.test(l));
  log.max = await page.getByTestId("px4a-max-seconds").textContent();
  log.hint = await page.getByTestId("px4a-video-duration-homecheff-hint").textContent();

  const before = await srcs(page);
  log.photoSrcsBefore = before.map((s) => s.slice(-40));
  if (before.length >= 3) {
    const photo2 = page.getByTestId("px4a-photo-2").getByRole("button", { name: "Eerder" });
    await photo2.click();
    await photo2.click();
    await page.waitForTimeout(400);
  }
  const afterMove = await srcs(page);
  log.photoSrcsAfterMove = afterMove.map((s) => s.slice(-40));
  log.moved = before[2] && afterMove[0] === before[2];

  await page.getByTestId("px4a-video-duration").getByRole("button", { name: "15 sec", exact: true }).click();
  await page.waitForTimeout(300);
  log.summary15 = await page.getByTestId("px4a-duration").textContent();
  await page.getByTestId("px4a-video-duration").getByRole("button", { name: "30 sec", exact: true }).click();
  await page.waitForTimeout(300);
  log.summary30 = await page.getByTestId("px4a-duration").textContent();
  await page.getByTestId("px4a-video-duration").getByRole("button", { name: "Automatisch" }).click();
  await page.waitForTimeout(300);
  log.summaryAuto = await page.getByTestId("px4a-duration").textContent();
  writeFileSync(join(OUT, "from-item-probe-2.json"), JSON.stringify(log, null, 2));

  await page.getByTestId("px4a-photo-0").scrollIntoViewIfNeeded().catch(() => undefined);
  if ((await page.getByTestId("px4a-photo-0").count()) > 0) {
    await page.getByTestId("px4a-photo-0").click({ force: true, timeout: 8_000 }).catch(() => undefined);
  }
  if ((await page.getByTestId("px4a-add-text").count()) > 0 && (await page.getByTestId("px4a-add-text").isEnabled())) {
    await page.getByTestId("px4a-add-text").click();
    await page.getByTestId("px4a-text-input").fill("Test");
    await page.waitForTimeout(400);
    log.textWhite = await page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>("[data-testid='px4a-preview-canvas']");
      if (!canvas) return 0;
      const ctx = canvas.getContext("2d");
      if (!ctx) return 0;
      const { width: w, height: h } = canvas;
      const data = ctx.getImageData(0, 0, w, h).data;
      let white = 0;
      for (let y = 0; y < Math.floor(h * 0.55); y += 1) {
        for (let x = 0; x < w; x += 1) {
          const i = (y * w + x) * 4;
          if (data[i]! > 200 && data[i + 1]! > 200 && data[i + 2]! > 200) white += 1;
        }
      }
      return white;
    });
  }
  await page.screenshot({ path: join(SHOT, "from-item-text.png") });

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await continueResume(page);
  await page.getByTestId("px4a-composer").waitFor({ timeout: 20_000 }).catch(() => undefined);
  const afterReload = await srcs(page);
  log.photoSrcsAfterReload = afterReload.map((s) => s.slice(-40));
  log.reloadKeptOrder = afterMove[0] != null && afterReload[0] === afterMove[0];
  log.reloadSummary = await page.getByTestId("px4a-duration").textContent().catch(() => "");
  log.reloadResume = (await page.getByTestId("px4a-resume-continue").count()) > 0;
  await page.screenshot({ path: join(SHOT, "from-item-after-reload.png") });

  const finishHint = await page.getByTestId("px4a-item-finish-hint").innerText().catch(() => "");
  log.finishHint = finishHint;
  log.falseAttach = /Video toegevoegd|Upload voltooid|MP4 klaar/.test(finishHint);

  writeFileSync(join(OUT, "from-item-probe-2.json"), JSON.stringify(log, null, 2));
  console.log(JSON.stringify(log, null, 2));
  await context.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
