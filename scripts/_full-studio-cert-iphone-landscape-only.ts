#!/usr/bin/env npx tsx
/**
 * Landscape-only physical iPhone resume with CDP reconnect resilience.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, webkit, type Browser, type Page } from "playwright";
import {
  collectPhysicalOrientationProof,
  formatOrientationProof,
  type PhysicalOrientationProof,
} from "./lib/full-studio-cert-orientation-proof";

const STUDIO = "https://studio.homecheff.eu";
const CDP = process.env.PX4A7_IPHONE_CDP || "http://127.0.0.1:9222";
const STORYBOARD_ID = process.env.CERT_STORYBOARD_ID?.trim() || "cmt5izwgu0001gq0444v3ipil";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs/audits/full-studio-cert");
const SHOTS = join(OUT, "iphone-final");
const LIVE = join(OUT, "IPHONE-FINAL-LIVE.json");

function say(m: string) {
  process.stdout.write(`${m}\n`);
}

async function waitForTabs(ms: number): Promise<number> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${CDP}/json`);
      const d = (await res.json()) as unknown[];
      if (Array.isArray(d) && d.length > 0) return d.length;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return 0;
}

async function connectBrowser(): Promise<Browser> {
  const n = await waitForTabs(60_000);
  if (!n) throw new Error("NO_INSPECTABLE_SAFARI_TAB");
  say(`tabs=${n}; connecting…`);
  try {
    return await webkit.connectOverCDP(CDP, { timeout: 25_000 });
  } catch (e1) {
    say(`webkit failed: ${String(e1).slice(0, 120)}; trying chromium…`);
    return await chromium.connectOverCDP(CDP, { timeout: 25_000 });
  }
}

async function orient(page: Page): Promise<PhysicalOrientationProof> {
  const navVisible = (await page.getByTestId("studio-production-stage-nav").count()) > 0;
  return collectPhysicalOrientationProof(page, {
    studioNavVisible: navVisible,
    requireStudioLayout: true,
  });
}

async function preview(page: Page) {
  return page.evaluate(() => {
    const imgs = [...document.querySelectorAll("img")].filter((i) => {
      const r = i.getBoundingClientRect();
      return r.width > 48 && r.height > 48 && i.naturalWidth > 0;
    });
    const first = imgs[0];
    let blackish = false;
    if (first) {
      try {
        const c = document.createElement("canvas");
        c.width = 10;
        c.height = 10;
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.drawImage(first, 0, 0, 10, 10);
          const d = ctx.getImageData(0, 0, 10, 10).data;
          let sum = 0;
          for (let i = 0; i < d.length; i += 4) sum += d[i]! + d[i + 1]! + d[i + 2]!;
          blackish = sum / (10 * 10 * 3) < 8;
        }
      } catch {
        /* cors */
      }
    }
    return { visibleImages: imgs.length, blackishSample: blackish, natural: first ? `${first.naturalWidth}x${first.naturalHeight}` : null };
  });
}

async function main() {
  mkdirSync(SHOTS, { recursive: true });
  const browser = await connectBrowser();
  const page =
    browser.contexts()[0]?.pages().find((p) => /studio\.homecheff\.eu/i.test(p.url())) ||
    browser.contexts()[0]?.pages()[0];
  if (!page) throw new Error("NO_PAGE");

  const before = await orient(page);
  say(`START ${formatOrientationProof(before)}`);
  if (!before.portraitEvidencePass) {
    say("Expected portrait at start — continue anyway.");
  }

  await page.goto(
    `${STUDIO}/studio?storyboardId=${STORYBOARD_ID}&stage=visuals&continueInStudio=1`,
    { waitUntil: "domcontentloaded", timeout: 90_000 }
  ).catch(() => undefined);
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: /Sluiten|Close/i }).first().click({ force: true }).catch(() => undefined);

  say("\n*** Orientation Lock OFF. Physically rotate iPhone to LANDSCAPE now. Waiting up to 3 min… ***\n");
  let land = before;
  const d1 = Date.now() + 180_000;
  while (Date.now() < d1) {
    land = await orient(page);
    say(`  ${formatOrientationProof(land)}`);
    if (land.safariDiscrepancyNote) say(`    note: ${land.safariDiscrepancyNote}`);
    if (land.landscapeEvidencePass) break;
    await page.waitForTimeout(3000);
  }

  const nav = (await page.getByTestId("studio-production-stage-nav").count()) > 0;
  const stages: Record<string, boolean> = {};
  for (const id of ["story", "visuals", "entities", "sound", "finish"] as const) {
    const chip = page.getByTestId(`studio-stage-${id}`);
    stages[id] = (await chip.count()) > 0;
    if (stages[id]) await chip.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(400);
  }
  await page.getByTestId("studio-stage-visuals").click({ force: true }).catch(() => undefined);
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollBy(0, 200)).catch(() => undefined);
  const previewL = await preview(page);
  const ovL = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 8
  );
  const landShot = join(SHOTS, `${Date.now()}-land-pass.png`);
  await page.screenshot({ path: landShot, fullPage: false }).catch(() => undefined);

  const landscapePass =
    land.landscapeEvidencePass &&
    nav &&
    !ovL &&
    Object.values(stages).every(Boolean) &&
    !previewL.blackishSample;

  say("\n*** Rotate back to PORTRAIT now. Waiting 2 min… ***\n");
  let port = land;
  const d2 = Date.now() + 120_000;
  while (Date.now() < d2) {
    port = await orient(page);
    say(`  ${formatOrientationProof(port)}`);
    if (port.safariDiscrepancyNote) say(`    note: ${port.safariDiscrepancyNote}`);
    if (port.portraitEvidencePass) break;
    await page.waitForTimeout(3000);
  }
  const previewP = await preview(page);
  const navP = (await page.getByTestId("studio-production-stage-nav").count()) > 0;
  const portShot = join(SHOTS, `${Date.now()}-port-recovery.png`);
  await page.screenshot({ path: portShot, fullPage: false }).catch(() => undefined);
  const recoveryPass =
    port.portraitEvidencePass && navP && !previewP.blackishSample;

  const prev = existsSync(LIVE) ? JSON.parse(readFileSync(LIVE, "utf8")) : {};
  const gates = Array.isArray(prev.gates) ? [...prev.gates] : [];
  const upsert = (gate: string, pass: boolean, evidence: unknown) => {
    const i = gates.findIndex((g: { gate: string }) => g.gate === gate);
    const row = { gate, pass, evidence: JSON.stringify(evidence).slice(0, 900) };
    if (i >= 0) gates[i] = row;
    else gates.push(row);
  };
  upsert("landscape", landscapePass, { land, nav, ovL, stages, previewL, landShot });
  upsert("orientation_recovery", recoveryPass, { port, navP, previewP, portShot });
  upsert("black_preview_after_rotation", !previewL.blackishSample && !previewP.blackishSample, {
    previewL,
    previewP,
  });

  const failed = gates.filter((g: { pass: boolean }) => g.pass === false);
  const report = {
    ...prev,
    gates,
    landscapeResumeAt: new Date().toISOString(),
    classification: failed.length === 0 ? "CERTIFIED" : "FAILED",
    failedGates: failed.map((f: { gate: string }) => f.gate),
    providerHits: 0,
    before,
    land,
    port,
  };
  writeFileSync(LIVE, JSON.stringify(report, null, 2));
  say(
    JSON.stringify(
      {
        classification: report.classification,
        failed: report.failedGates,
        landscapePass,
        recoveryPass,
        land,
        port,
      },
      null,
      2
    )
  );
  await browser.close().catch(() => undefined);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
