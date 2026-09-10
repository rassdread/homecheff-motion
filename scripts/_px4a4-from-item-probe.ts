#!/usr/bin/env npx tsx
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const STUDIO = "https://studio.homecheff.eu";
const HC = "https://homecheff.eu";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROFILE = join(ROOT, ".px4a4-chrome-profile");
const OUT = join(ROOT, "docs/audits/px4a4-human-cert");
const SHOT = join(OUT, "shots-final");

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

  await page.goto(`${STUDIO}/studio/photo-video/from-item`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(2000);
  const resume = page.getByTestId("px4a-resume-continue");
  if (await resume.count()) await resume.click();
  await page.waitForTimeout(1500);
  await page.getByTestId("px4a-composer").waitFor({ timeout: 20_000 });

  log.url = page.url();
  log.bodyHead = (await page.locator("body").innerText()).slice(0, 900);
  log.durationLabels = await page.locator('[data-testid="px4a-video-duration"] button').allTextContents();
  log.maxSeconds = await page.getByTestId("px4a-max-seconds").textContent();
  log.hcHint = await page.getByTestId("px4a-video-duration-homecheff-hint").textContent().catch(() => null);
  log.back = await page.getByTestId("px4a-item-back").count();
  log.finish = await page.getByTestId("px4a-item-finish").count();
  log.finishHint = await page.getByTestId("px4a-item-finish-hint").innerText().catch(() => "");
  log.finishDisabled = await page.getByTestId("px4a-item-finish").isDisabled().catch(() => null);
  log.photoCount = await page.locator('[data-testid^="px4a-photo-"]').count();
  log.addLabel = await page.locator("label").filter({ hasText: /Foto/ }).first().innerText().catch(() => "");
  log.genericHome = /Wat wil je maken\?/.test(String(log.bodyHead));
  log.credits = /Koop credits/.test(String(log.bodyHead));
  log.itemShell = await page.getByTestId("px4a-item-shell").count();
  log.durationSummary = await page.getByTestId("px4a-duration").textContent().catch(() => "");
  log.movement = await page.locator('[data-testid="px4a-movement"] button').allTextContents();
  await page.screenshot({ path: join(SHOT, "from-item-contextual.png") });

  if (log.photoCount >= 3) {
    const idsBefore = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-testid^="px4a-photo-"]')).map((el) => el.getAttribute("data-testid"))
    );
    const later = page.locator('[data-testid="px4a-photo-2"]').getByRole("button", { name: /Eerder/i });
    if (await later.count()) {
      await later.click();
      await later.click();
    }
    await page.waitForTimeout(500);
    log.idsAfterMove = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-testid^="px4a-photo-"]')).map((el) => el.getAttribute("data-testid"))
    );
    log.idsBeforeMove = idsBefore;
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    if (await page.getByTestId("px4a-resume-continue").count()) await page.getByTestId("px4a-resume-continue").click();
    await page.waitForTimeout(1000);
    log.idsAfterRefresh = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-testid^="px4a-photo-"]')).map((el) => el.getAttribute("data-testid"))
    );
    log.durationAfterRefresh = await page.getByTestId("px4a-duration").textContent().catch(() => "");
  }

  await page.goto(`${HC}/sell/new`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(3000);
  log.hcUrl = page.url();
  log.hcButtons = await page.evaluate(() =>
    Array.from(document.querySelectorAll("button,a,[data-testid]"))
      .map((el) => ({
        tag: el.tagName,
        testid: el.getAttribute("data-testid"),
        text: (el.textContent || "").trim().slice(0, 80),
      }))
      .filter((row) => /video|foto|gratis|studio|vervang/i.test(`${row.testid} ${row.text}`))
      .slice(0, 40)
  );
  log.hcHasCta = (await page.locator('[data-testid="px4a-make-free-video"]').count()) > 0;
  log.hcTextHasCta = /Maak gratis video/.test(await page.locator("body").innerText());
  log.hcAttribution = /Mogelijk gemaakt door HomeCheff Studio/.test(await page.locator("body").innerText());
  await page.screenshot({ path: join(SHOT, "sell-new.png"), fullPage: true });

  writeFileSync(join(OUT, "from-item-probe.json"), JSON.stringify(log, null, 2));
  console.log(JSON.stringify(log, null, 2));
  await context.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
