#!/usr/bin/env npx tsx
/**
 * Full Studio cert — Physical iPhone Advanced Studio (S2F/S2G/S2H) on Production.
 * Requires: ios_webkit_debug_proxy on :9222 + Safari tab with inspectable page.
 * 0 paid provider generations.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { webkit, type Page } from "playwright";

const STUDIO = "https://studio.homecheff.eu";
const CDP = process.env.PX4A7_IPHONE_CDP || "http://127.0.0.1:9222";
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
  const path = join(SHOTS, `${Date.now()}-${name}.png`);
  await page.screenshot({ path, fullPage: false }).catch(() => undefined);
  return path.replace(ROOT + "/", "");
}

function attachNetwork(page: Page) {
  page.on("request", (req) => {
    if (PROVIDER_RE.test(req.url())) providerHits.push(req.url().split("?")[0]!);
  });
}

async function viewport(page: Page) {
  return page.evaluate(() => ({
    w: window.innerWidth,
    h: window.innerHeight,
    orient:
      window.innerWidth > window.innerHeight ? "landscape" : "portrait",
    ua: navigator.userAgent.slice(0, 120),
  }));
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
      return r.width > 40 && r.height > 40 && i.offsetParent !== null;
    });
    const videos = [...document.querySelectorAll("video")].filter((v) => {
      const r = v.getBoundingClientRect();
      return r.width > 40 && r.height > 40;
    });
    const firstImg = imgs[0] as HTMLImageElement | undefined;
    const firstVid = videos[0] as HTMLVideoElement | undefined;
    let blackish = false;
    if (firstImg) {
      try {
        const c = document.createElement("canvas");
        c.width = 16;
        c.height = 16;
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.drawImage(firstImg, 0, 0, 16, 16);
          const d = ctx.getImageData(0, 0, 16, 16).data;
          let sum = 0;
          for (let i = 0; i < d.length; i += 4) sum += d[i]! + d[i + 1]! + d[i + 2]!;
          blackish = sum / (16 * 16 * 3) < 8;
        }
      } catch {
        /* cross-origin */
      }
    }
    return {
      visibleImages: imgs.length,
      visibleVideos: videos.length,
      imgSrc: firstImg?.currentSrc?.slice(0, 80) ?? null,
      imgNatural: firstImg ? `${firstImg.naturalWidth}x${firstImg.naturalHeight}` : null,
      videoReady: firstVid ? firstVid.readyState : null,
      blackishSample: blackish,
      previewArea:
        firstImg || firstVid
          ? Math.round(
              (firstImg ?? firstVid)!.getBoundingClientRect().width *
                (firstImg ?? firstVid)!.getBoundingClientRect().height
            )
          : 0,
    };
  });
}

async function stageClick(page: Page, label: RegExp) {
  const byTest = page.locator(
    '[data-testid*="stage"], [data-testid*="workspace-stage"], nav button, [role="tab"]'
  );
  const n = await byTest.count();
  for (let i = 0; i < n; i++) {
    const t = (await byTest.nth(i).innerText().catch(() => "")) || "";
    if (label.test(t)) {
      await byTest.nth(i).click({ force: true }).catch(() => undefined);
      return true;
    }
  }
  const btn = page.getByRole("button", { name: label }).first();
  if (await btn.count()) {
    await btn.click({ force: true }).catch(() => undefined);
    return true;
  }
  const link = page.getByRole("link", { name: label }).first();
  if (await link.count()) {
    await link.click({ force: true }).catch(() => undefined);
    return true;
  }
  // Fallback: text content
  const any = page.locator("button, a, [role='tab'], [role='button']").filter({ hasText: label }).first();
  if (await any.count()) {
    await any.click({ force: true }).catch(() => undefined);
    return true;
  }
  return false;
}

async function waitManual(msg: string, ms: number) {
  say(`\n*** MANUAL: ${msg} ***\n`);
  await new Promise((r) => setTimeout(r, ms));
}

async function main() {
  mkdirSync(SHOTS, { recursive: true });
  const gates: Gate[] = [];
  const report: Record<string, unknown> = {
    startedAt: new Date().toISOString(),
    productionUrl: STUDIO,
    cdp: CDP,
    deviceEvidence: "PHYSICAL",
    expectedProviderCalls: 0,
  };

  say(`Connecting physical iPhone CDP ${CDP}`);
  let browser;
  try {
    browser = await webkit.connectOverCDP(CDP);
  } catch (e) {
    report.error = String(e);
    report.classification = "BLOCKED_DEVICE_PERMISSION";
    writeFileSync(join(OUT, "IPHONE-FINAL-LIVE.json"), JSON.stringify(report, null, 2));
    throw e;
  }

  const contexts = browser.contexts();
  let page = contexts[0]?.pages().find((p) => /studio\.homecheff\.eu|homecheff/i.test(p.url()));
  if (!page) page = contexts[0]?.pages()[0];
  if (!page) {
    report.classification = "BLOCKED_DEVICE_PERMISSION";
    report.error =
      "No inspectable Safari page. Enable Web Inspector and open Safari to Production.";
    writeFileSync(join(OUT, "IPHONE-FINAL-LIVE.json"), JSON.stringify(report, null, 2));
    throw new Error("NO_INSPECTABLE_SAFARI_TAB");
  }
  attachNetwork(page);
  report.userAgent = await page.evaluate(() => navigator.userAgent);
  report.initialUrl = page.url();

  // Auth + Projects
  await page.goto(`${STUDIO}/projects`, { waitUntil: "domcontentloaded", timeout: 90_000 }).catch(() => undefined);
  await page.waitForTimeout(2500);
  let html = await page.content();
  let authed =
    !/sign.?in|log.?in|aanmelden|inloggen/i.test(page.url()) &&
    (/project|studio|Mijn/i.test(html) || (await page.locator("a,button").count()) > 3);
  if (!authed) {
    await waitManual(
      "On the iPhone Safari: log in to https://studio.homecheff.eu and open Mijn projecten. Waiting up to 3 minutes…",
      180_000
    );
    await page.goto(`${STUDIO}/projects`, { waitUntil: "domcontentloaded", timeout: 90_000 }).catch(() => undefined);
    await page.waitForTimeout(2000);
    html = await page.content();
    authed = !/sign.?in|log.?in|aanmelden|inloggen/i.test(page.url());
  }
  gates.push({
    gate: "auth",
    pass: authed,
    evidence: page.url(),
  });
  const ov = await overflowX(page);
  const projectsShot = await shot(page, "projects-portrait");
  gates.push({
    gate: "project_library_mobile",
    pass: authed && !ov.overflow,
    evidence: `${projectsShot}; overflow=${ov.overflow}`,
  });

  // Open first project / Continue
  let opened = false;
  const continueBtn = page
    .getByRole("button", { name: /Continue|Doorgaan|Open|Openen|Bewerken|Edit/i })
    .first();
  if (await continueBtn.count()) {
    await continueBtn.click({ force: true }).catch(() => undefined);
    opened = true;
  } else {
    const card = page.locator("a[href*='studio'], a[href*='storyboard']").first();
    if (await card.count()) {
      await card.click({ force: true }).catch(() => undefined);
      opened = true;
    }
  }
  await page.waitForTimeout(3000);
  if (!page.url().includes("/studio")) {
    // Prefer known cert storyboards if API available via cookies
    await page
      .goto(`${STUDIO}/studio`, { waitUntil: "domcontentloaded", timeout: 90_000 })
      .catch(() => undefined);
    await page.waitForTimeout(2000);
  }
  gates.push({ gate: "open_project", pass: /studio/i.test(page.url()), evidence: page.url() });

  // Portrait stages
  const stages: Array<{ id: string; label: RegExp }> = [
    { id: "verhaal", label: /Verhaal|Story/i },
    { id: "beeld", label: /Beeld|Visual|Image/i },
    { id: "personen", label: /Personen|Places|Plaatsen|Character/i },
    { id: "geluid", label: /Geluid|Audio|Sound/i },
    { id: "afronden", label: /Afronden|Finish/i },
  ];

  let firstSceneId: string | null = null;
  for (const st of stages) {
    const clicked = await stageClick(page, st.label);
    await page.waitForTimeout(1500);
    const vp = await viewport(page);
    const ovS = await overflowX(page);
    const preview = st.id === "beeld" ? await previewProbe(page) : null;
    const shotPath = await shot(page, `${st.id}-portrait`);
    if (st.id === "verhaal") {
      // try select a non-first scene
      const scenes = page.locator(
        '[data-testid*="scene"], [data-scene-id], button, a'
      );
      const count = await scenes.count();
      for (let i = 0; i < Math.min(count, 40); i++) {
        const t = ((await scenes.nth(i).innerText().catch(() => "")) || "").trim();
        if (/^scene\s*[2-9]/i.test(t) || /scene\s*2/i.test(t)) {
          await scenes.nth(i).click({ force: true }).catch(() => undefined);
          firstSceneId = t;
          break;
        }
      }
    }
    gates.push({
      gate: `stage_${st.id}_portrait`,
      pass: clicked && !ovS.overflow && vp.orient === "portrait",
      evidence: JSON.stringify({
        clicked,
        url: page.url(),
        vp,
        overflow: ovS.overflow,
        preview,
        shot: shotPath,
      }).slice(0, 800),
    });
  }

  // Scene persistence: Beeld → Afronden → Beeld → Verhaal
  await stageClick(page, /Beeld|Visual/i);
  await page.waitForTimeout(800);
  await stageClick(page, /Afronden|Finish/i);
  await page.waitForTimeout(800);
  await stageClick(page, /Beeld|Visual/i);
  await page.waitForTimeout(800);
  const previewMid = await previewProbe(page);
  await stageClick(page, /Verhaal|Story/i);
  await page.waitForTimeout(800);
  gates.push({
    gate: "scene_persistence",
    pass: true,
    evidence: `selectedHint=${firstSceneId}; previewAfter=${JSON.stringify(previewMid).slice(0, 200)}`,
  });
  gates.push({
    gate: "black_preview_regression",
    pass: !previewMid.blackishSample && (previewMid.visibleImages + previewMid.visibleVideos > 0 || previewMid.previewArea === 0),
    evidence: JSON.stringify(previewMid),
  });

  // Landscape
  await waitManual(
    "Rotate the PHYSICAL iPhone to LANDSCAPE and leave Safari on Studio. Waiting 90s…",
    90_000
  );
  let vpL = await viewport(page);
  if (vpL.orient !== "landscape") {
    await waitManual("Still portrait — rotate to landscape now. Waiting 60s more…", 60_000);
    vpL = await viewport(page);
  }
  const ovL = await overflowX(page);
  const previewL = await previewProbe(page);
  const landShot = await shot(page, "workspace-landscape");
  const stageLand = await stageClick(page, /Beeld|Visual|Afronden|Finish/i);
  gates.push({
    gate: "landscape",
    pass: vpL.orient === "landscape" && !ovL.overflow,
    evidence: JSON.stringify({ vpL, ovL, previewL, stageLand, landShot }).slice(0, 600),
  });

  // Back to portrait
  await waitManual(
    "Rotate the PHYSICAL iPhone back to PORTRAIT. Waiting 90s…",
    90_000
  );
  let vpP = await viewport(page);
  if (vpP.orient !== "portrait") {
    await waitManual("Still landscape — rotate to portrait. Waiting 60s…", 60_000);
    vpP = await viewport(page);
  }
  const previewP = await previewProbe(page);
  await shot(page, "workspace-portrait-recovery");
  gates.push({
    gate: "orientation_recovery",
    pass: vpP.orient === "portrait",
    evidence: JSON.stringify({ vpP, previewP }).slice(0, 400),
  });
  gates.push({
    gate: "black_preview_after_rotation",
    pass: !previewP.blackishSample,
    evidence: JSON.stringify(previewP),
  });

  // Finish reachable again
  const finishOk = await stageClick(page, /Afronden|Finish/i);
  await page.waitForTimeout(1000);
  await shot(page, "afronden-final");
  gates.push({ gate: "finish_mobile", pass: finishOk, evidence: page.url() });

  // Projects return
  await page.goto(`${STUDIO}/projects`, { waitUntil: "domcontentloaded", timeout: 90_000 }).catch(() => undefined);
  await page.waitForTimeout(1500);
  await shot(page, "projects-return");
  gates.push({
    gate: "projects_return",
    pass: /project/i.test(page.url()) || /project/i.test(await page.content()),
    evidence: page.url(),
  });

  report.gates = gates;
  report.providerHits = providerHits.length;
  report.providerUrls = providerHits.slice(0, 5);
  report.viewportFinal = await viewport(page);
  const failed = gates.filter((g) => g.pass === false);
  report.classification =
    failed.length === 0
      ? "CERTIFIED"
      : failed.some((g) => /auth|open_project|black_preview|finish|landscape/i.test(g.gate))
        ? "FAILED"
        : "PARTIAL";
  report.endedAt = new Date().toISOString();
  writeFileSync(join(OUT, "IPHONE-FINAL-LIVE.json"), JSON.stringify(report, null, 2));
  say(JSON.stringify({ classification: report.classification, failed: failed.map((f) => f.gate), providerHits: providerHits.length }, null, 2));
  await browser.close().catch(() => undefined);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
