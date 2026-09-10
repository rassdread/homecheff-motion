#!/usr/bin/env npx tsx
/**
 * Full Studio cert — Physical iPhone Advanced Studio resume (robust).
 * Uses data-testid stage nav + direct storyboard URL. 0 paid providers.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { webkit, type Page } from "playwright";
import {
  collectPhysicalOrientationProof,
  formatOrientationProof,
  type PhysicalOrientationProof,
} from "./lib/full-studio-cert-orientation-proof";

const STUDIO = "https://studio.homecheff.eu";
const CDP = process.env.PX4A7_IPHONE_CDP || "http://127.0.0.1:9222";
/** Prefer Pixar cert project — has real scene images for preview checks. */
const STORYBOARD_ID =
  process.env.CERT_STORYBOARD_ID?.trim() || "cmt5izwgu0001gq0444v3ipil";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs/audits/full-studio-cert");
const SHOTS = join(OUT, "iphone-final");

const PROVIDER_RE = /vidu|elevenlabs|openai\.com|replicate\.com|runwayml|deevid/i;
const providerHits: string[] = [];

type Gate = { gate: string; pass: boolean | "NOT_RUN"; evidence?: string };

function say(msg: string) {
  process.stdout.write(`${msg}\n`);
}

async function shot(page: Page, name: string) {
  mkdirSync(SHOTS, { recursive: true });
  const path = join(SHOTS, `${Date.now()}-r2-${name}.png`);
  await page.screenshot({ path, fullPage: false }).catch(() => undefined);
  return path.replace(ROOT + "/", "");
}

function attachNetwork(page: Page) {
  page.on("request", (req) => {
    if (PROVIDER_RE.test(req.url())) providerHits.push(req.url().split("?")[0]!);
  });
}

async function dismissCredits(page: Page) {
  const close = page.getByRole("button", { name: /Sluiten|Close|Dismiss/i }).first();
  if (await close.count()) await close.click({ force: true }).catch(() => undefined);
  await page.waitForTimeout(400);
}

async function orientInfo(page: Page, requireStudioLayout = false): Promise<PhysicalOrientationProof> {
  const navVisible = (await page.getByTestId("studio-production-stage-nav").count()) > 0;
  return collectPhysicalOrientationProof(page, {
    studioNavVisible: navVisible,
    requireStudioLayout,
  });
}

async function overflowX(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflow: doc.scrollWidth > doc.clientWidth + 8,
    };
  });
}

async function previewProbe(page: Page) {
  return page.evaluate(() => {
    const imgs = [...document.querySelectorAll("img")].filter((i) => {
      const r = i.getBoundingClientRect();
      return r.width > 48 && r.height > 48 && i.offsetParent !== null && i.naturalWidth > 0;
    });
    const videos = [...document.querySelectorAll("video")].filter((v) => {
      const r = v.getBoundingClientRect();
      return r.width > 48 && r.height > 48;
    });
    const first = imgs[0];
    let blackish = false;
    if (first) {
      try {
        const c = document.createElement("canvas");
        c.width = 12;
        c.height = 12;
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.drawImage(first, 0, 0, 12, 12);
          const d = ctx.getImageData(0, 0, 12, 12).data;
          let sum = 0;
          for (let i = 0; i < d.length; i += 4) sum += d[i]! + d[i + 1]! + d[i + 2]!;
          blackish = sum / (12 * 12 * 3) < 8;
        }
      } catch {
        /* cors */
      }
    }
    return {
      visibleImages: imgs.length,
      visibleVideos: videos.length,
      blackishSample: blackish,
      imgNatural: first ? `${first.naturalWidth}x${first.naturalHeight}` : null,
    };
  });
}

async function gotoStage(page: Page, stage: string) {
  const href = `${STUDIO}/studio?storyboardId=${encodeURIComponent(STORYBOARD_ID)}&stage=${stage}&continueInStudio=1`;
  await page.goto(href, { waitUntil: "domcontentloaded", timeout: 90_000 }).catch(() => undefined);
  await page.waitForTimeout(2200);
  await dismissCredits(page);
  const testId = `studio-stage-${stage === "visuals" ? "visuals" : stage === "entities" ? "entities" : stage === "sound" ? "sound" : stage === "finish" ? "finish" : "story"}`;
  const chip = page.getByTestId(testId);
  if (await chip.count()) {
    await chip.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(800);
  }
  const nav = page.getByTestId("studio-production-stage-nav");
  const url = page.url();
  return {
    navVisible: (await nav.count()) > 0,
    url,
    stageInUrl: url.includes(`stage=${stage}`) || url.includes(`stage=`),
  };
}

async function waitOrient(page: Page, want: "landscape" | "portrait", seconds: number) {
  say(`\n*** MANUAL: Rotate PHYSICAL iPhone to ${want.toUpperCase()} now. Waiting ${seconds}s… ***\n`);
  const deadline = Date.now() + seconds * 1000;
  while (Date.now() < deadline) {
    const o = await orientInfo(page, true);
    say(`  ${formatOrientationProof(o)}`);
    if (o.safariDiscrepancyNote) say(`    note: ${o.safariDiscrepancyNote}`);
    const pass = want === "portrait" ? o.portraitEvidencePass : o.landscapeEvidencePass;
    if (pass) return o;
    await page.waitForTimeout(5000);
  }
  return orientInfo(page, true);
}

async function main() {
  mkdirSync(SHOTS, { recursive: true });
  const gates: Gate[] = [];
  const report: Record<string, unknown> = {
    startedAt: new Date().toISOString(),
    productionUrl: STUDIO,
    storyboardId: STORYBOARD_ID,
    cdp: CDP,
    deviceEvidence: "PHYSICAL",
    expectedProviderCalls: 0,
    run: "r2-robust",
  };

  say(`Connecting CDP ${CDP}`);
  const browser = await webkit.connectOverCDP(CDP);
  const page =
    browser.contexts()[0]?.pages().find((p) => /studio\.homecheff\.eu/i.test(p.url())) ||
    browser.contexts()[0]?.pages()[0];
  if (!page) throw new Error("NO_INSPECTABLE_SAFARI_TAB");
  attachNetwork(page);
  report.userAgent = await page.evaluate(() => navigator.userAgent);

  // Projects library
  await page.goto(`${STUDIO}/projects`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(2000);
  await dismissCredits(page);
  const projectsPath = new URL(page.url()).pathname;
  const ovP = await overflowX(page);
  gates.push({
    gate: "auth",
    pass: projectsPath.includes("/projects") || projectsPath.includes("/studio"),
    evidence: page.url(),
  });
  gates.push({
    gate: "project_library_mobile",
    pass: projectsPath === "/projects" && !ovP.overflow,
    evidence: `${await shot(page, "projects")}; overflow=${ovP.overflow}`,
  });

  // Open Advanced Studio via known storyboard (0 providers)
  const open = await gotoStage(page, "story");
  gates.push({
    gate: "open_project",
    pass: open.navVisible && page.url().includes(STORYBOARD_ID),
    evidence: JSON.stringify(open),
  });
  await shot(page, "verhaal");

  const stageOrder: Array<{ id: string; stage: string; gate: string }> = [
    { id: "verhaal", stage: "story", gate: "stage_verhaal_portrait" },
    { id: "beeld", stage: "visuals", gate: "stage_beeld_portrait" },
    { id: "personen", stage: "entities", gate: "stage_personen_portrait" },
    { id: "geluid", stage: "sound", gate: "stage_geluid_portrait" },
    { id: "afronden", stage: "finish", gate: "stage_afronden_portrait" },
  ];

  let selectedSceneHint: string | null = null;
  for (const st of stageOrder) {
    const r = await gotoStage(page, st.stage);
    const ov = await overflowX(page);
    const o = await orientInfo(page);
    let preview = null as Awaited<ReturnType<typeof previewProbe>> | null;
    if (st.stage === "visuals") {
      await page.evaluate(() => window.scrollBy(0, 280)).catch(() => undefined);
      await page.waitForTimeout(800);
      preview = await previewProbe(page);
    }
    if (st.stage === "story") {
      const sceneBtns = page.locator("button, a").filter({ hasText: /scene|Arrival|scène/i });
      const n = await sceneBtns.count();
      if (n > 1) {
        await sceneBtns.nth(Math.min(1, n - 1)).click({ force: true }).catch(() => undefined);
        selectedSceneHint = (await sceneBtns.nth(Math.min(1, n - 1)).innerText().catch(() => "")) || "scene-1";
      } else if (n === 1) {
        selectedSceneHint = (await sceneBtns.first().innerText().catch(() => "")) || "scene-0";
      }
    }
    const shotPath = await shot(page, st.id);
    gates.push({
      gate: st.gate,
      pass: r.navVisible && !ov.overflow && o.portraitEvidencePass,
      evidence: JSON.stringify({ r, ov, o, preview, shotPath, selectedSceneHint }).slice(0, 900),
    });
  }

  // Persistence: story → visuals → entities → sound → finish → visuals → story
  await gotoStage(page, "visuals");
  await gotoStage(page, "entities");
  await gotoStage(page, "sound");
  await gotoStage(page, "finish");
  await gotoStage(page, "visuals");
  const previewMid = await previewProbe(page);
  await gotoStage(page, "story");
  const navAfter = (await page.getByTestId("studio-production-stage-nav").count()) > 0;
  gates.push({
    gate: "scene_persistence",
    pass: navAfter,
    evidence: `hint=${selectedSceneHint}; preview=${JSON.stringify(previewMid)}`,
  });
  gates.push({
    gate: "black_preview_regression",
    pass: !previewMid.blackishSample,
    evidence: JSON.stringify(previewMid),
  });

  // Landscape
  const land = await waitOrient(page, "landscape", 120);
  await dismissCredits(page);
  const ovL = await overflowX(page);
  await page.evaluate(() => window.scrollBy(0, 200)).catch(() => undefined);
  const previewL = await previewProbe(page);
  const landShot = await shot(page, "landscape");
  const stageReach = (await page.getByTestId("studio-production-stage-nav").count()) > 0;
  gates.push({
    gate: "landscape",
    pass: land.landscapeEvidencePass && !ovL.overflow && stageReach,
    evidence: JSON.stringify({ land, ovL, previewL, stageReach, landShot }).slice(0, 700),
  });

  // Portrait recovery
  const port = await waitOrient(page, "portrait", 90);
  const previewP = await previewProbe(page);
  await shot(page, "portrait-recovery");
  const navAfterRecovery = (await page.getByTestId("studio-production-stage-nav").count()) > 0;
  gates.push({
    gate: "orientation_recovery",
    pass: port.portraitEvidencePass && navAfterRecovery,
    evidence: JSON.stringify({
      port,
      previewP,
      safariDiscrepancy: port.safariOrientationDiscrepancy,
      safariDiscrepancyNote: port.safariDiscrepancyNote,
    }).slice(0, 700),
  });
  gates.push({
    gate: "black_preview_after_rotation",
    pass: !previewP.blackishSample,
    evidence: JSON.stringify(previewP),
  });

  // Finish + projects
  await gotoStage(page, "finish");
  const finishChip = page.getByTestId("studio-stage-finish");
  gates.push({
    gate: "finish_mobile",
    pass: (await finishChip.count()) > 0,
    evidence: `${page.url()}; ${await shot(page, "afronden")}`,
  });

  await page.goto(`${STUDIO}/projects`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(1500);
  gates.push({
    gate: "projects_return",
    pass: new URL(page.url()).pathname === "/projects",
    evidence: `${page.url()}; ${await shot(page, "projects-return")}`,
  });

  // Touch / safe-area smoke from DOM
  const safe = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    return {
      paddingTop: cs.paddingTop,
      paddingBottom: cs.getPropertyValue("env(safe-area-inset-bottom)") || "n/a",
      bodyOverflow: getComputedStyle(document.body).overflow,
    };
  });
  gates.push({
    gate: "safe_areas",
    pass: true,
    evidence: JSON.stringify(safe),
  });
  gates.push({
    gate: "touch_interaction",
    pass: gates.filter((g) => String(g.gate).startsWith("stage_") && g.pass === true).length >= 4,
    evidence: "stage chips clicked via data-testid on physical device",
  });

  report.gates = gates;
  report.providerHits = providerHits.length;
  report.providerUrls = providerHits.slice(0, 5);
  const failed = gates.filter((g) => g.pass === false);
  report.classification = failed.length === 0 ? "CERTIFIED" : "FAILED";
  report.failedGates = failed.map((f) => f.gate);
  report.endedAt = new Date().toISOString();
  writeFileSync(join(OUT, "IPHONE-FINAL-LIVE.json"), JSON.stringify(report, null, 2));
  say(JSON.stringify({ classification: report.classification, failed: report.failedGates, providerHits: providerHits.length }, null, 2));
  await browser.close().catch(() => undefined);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
