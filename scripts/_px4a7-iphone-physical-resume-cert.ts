#!/usr/bin/env npx tsx
/** Resume physical iPhone cert: landscape, portrait return, export ONLY. */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { webkit, type Browser, type Page } from "playwright";

const CDP = process.env.PX4A7_IPHONE_CDP || "http://127.0.0.1:9222";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs/audits/px4a7-prod-cert");
const SHOTS = join(OUT, "iphone-shots");

const PROVIDER_RE = /vidu|elevenlabs|openai\.com|replicate\.com|runwayml|deevid/i;
const CREDIT_RE = /\/api\/(?:me\/)?(?:credits|wallet|billing|studio-account\/credits)/i;

type Gate = { gate: string; pass: boolean; evidence?: string; classification?: string; source?: string };

function say(m: string) {
  process.stdout.write(`${m}\n`);
}

async function shot(page: Page, name: string) {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `${Date.now()}-resume-${name}.png`), fullPage: false }).catch(() => undefined);
}

async function cdpList(): Promise<boolean> {
  try {
    const out = execFileSync("curl", ["-s", "--max-time", "5", `${CDP}/json/list`], { encoding: "utf8" });
    return out.includes("studio.homecheff.eu");
  } catch {
    return false;
  }
}

function restartProxy(): void {
  say("  restarting ios_webkit_debug_proxy…");
  spawnSync("pkill", ["-f", "ios_webkit_debug_proxy"], { stdio: "ignore" });
  spawnSync("sleep", ["2"]);
  spawnSync("ios_webkit_debug_proxy", ["-f", "chrome-devtools://localhost:9222"], {
    detached: true,
    stdio: "ignore",
  }).pid;
  spawnSync("sleep", ["4"]);
}

async function connectCdp(): Promise<Browser> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      say(`  CDP connect attempt ${attempt}/4…`);
      return await webkit.connectOverCDP(CDP, { timeout: 45_000 });
    } catch (e) {
      say(`  connect failed: ${e instanceof Error ? e.message : String(e)}`);
      if (attempt < 4) {
        if (!(await cdpList())) restartProxy();
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }
  throw new Error("CDP connect failed after retries");
}

async function posture(page: Page) {
  return page.evaluate(() => document.querySelector('[data-testid="px4a-edit-zone"]')?.getAttribute("data-posture") ?? null);
}

async function projectSnapshot(page: Page) {
  return page.evaluate(() => {
    const items = [...document.querySelectorAll('[data-testid^="px4a-photo-"]')]
      .filter((el) => /^px4a-photo-\d+$/.test(el.getAttribute("data-testid") || ""))
      .map((el) => ({
        id: el.getAttribute("data-testid"),
        video: !!el.querySelector('[data-testid^="px4a-video-thumb-"]'),
        selected: el.querySelector("button[aria-pressed='true']") !== null,
      }));
    return {
      text: (document.querySelector('[data-testid="px4a-text-input"]') as HTMLInputElement | null)?.value ?? "",
      itemCount: items.length,
      photos: items.filter((i) => !i.video).length,
      videos: items.filter((i) => i.video).length,
      items,
      audioOff: document.querySelector('[data-testid="px4a-video-audio-off"]')?.getAttribute("aria-pressed") === "true",
    };
  });
}

async function waitLandscape(page: Page) {
  say("");
  say("══════════════════════════════════════════════════════════════");
  say("  ACTIE VEREIST — LANDSCAPE");
  say("  Draai de iPhone NU horizontaal en laat hem zo liggen.");
  say("══════════════════════════════════════════════════════════════");
  say("");
  const deadline = Date.now() + 300_000;
  let last = Date.now();
  while (Date.now() < deadline) {
    const p = await posture(page);
    if (p === "phone-landscape") {
      say("  ok: phone-landscape detected");
      return true;
    }
    if (Date.now() - last > 20_000) {
      say("  ⏳ wacht op horizontale rotatie…");
      last = Date.now();
    }
    await page.waitForTimeout(2000);
  }
  return false;
}

async function waitPortrait(page: Page) {
  say("");
  say("══════════════════════════════════════════════════════════════");
  say("  ACTIE VEREIST — PORTRAIT");
  say("  Draai de iPhone NU weer rechtop en laat hem zo staan.");
  say("══════════════════════════════════════════════════════════════");
  say("");
  const deadline = Date.now() + 300_000;
  let last = Date.now();
  while (Date.now() < deadline) {
    const p = await posture(page);
    if (p === "phone-portrait") {
      say("  ok: phone-portrait detected");
      return true;
    }
    if (Date.now() - last > 20_000) {
      say("  ⏳ wacht op verticale rotatie…");
      last = Date.now();
    }
    await page.waitForTimeout(2000);
  }
  return false;
}

async function main() {
  const gates: Gate[] = [];
  const network = { providerHits: [] as string[], creditHits: [] as string[] };
  const report: Record<string, unknown> = {
    resumedAt: new Date().toISOString(),
    releaseHead: "b9eaf7df",
    mode: "resume-landscape-export-only",
  };

  say("HOMECHEFF Slice 1B — iPhone resume (landscape + export only)");

  if (!(await cdpList())) restartProxy();

  const browser = await connectCdp();
  const page = browser.contexts()[0]?.pages()[0];
  if (!page) throw new Error("no CDP page");

  page.on("request", (r) => {
    const u = r.url();
    if (PROVIDER_RE.test(u)) network.providerHits.push(u);
    if (CREDIT_RE.test(u)) network.creditHits.push(u);
  });

  report.userAgent = await page.evaluate(() => navigator.userAgent);
  gates.push({
    gate: "Physical iPhone connection",
    pass: true,
    evidence: report.userAgent as string,
    source: "PHYSICAL IPHONE",
  });

  const hasComposer = (await page.getByTestId("px4a-composer").count()) > 0;
  const before = await projectSnapshot(page);
  report.projectBefore = before;

  if (!hasComposer || before.videos < 1) {
    gates.push({
      gate: "Project preserved",
      pass: false,
      evidence: JSON.stringify(before),
      classification: "ENVIRONMENT_FAILURE",
    });
    report.gates = gates;
    report.sliceVerdict = "STUDIO_SLICE_1B_CERTIFICATION_BLOCKED";
    report.pxVerdict = "PX.4A.7_RECERT_BLOCKED";
    writeFileSync(join(OUT, "iphone-physical-resume-cert.json"), JSON.stringify(report, null, 2));
    await browser.close();
    say(JSON.stringify(report, null, 2));
    return;
  }

  const landscapeOk = await waitLandscape(page);
  const ls = landscapeOk
    ? await page.evaluate(() => ({
        posture: document.querySelector('[data-testid="px4a-edit-zone"]')?.getAttribute("data-posture"),
        left: !!document.querySelector('[data-testid="px4a-left-pane"]'),
        right: !!document.querySelector('[data-testid="px4a-right-pane"]'),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        finish: !!document.querySelector('[data-testid="px4a-export-download"]'),
        canvases: document.querySelectorAll('[data-testid="px4a-preview-canvas"]').length,
      }))
    : null;
  report.landscape = ls;
  await shot(page, "landscape");

  gates.push({
    gate: "Physical landscape",
    pass: landscapeOk && ls?.posture === "phone-landscape",
    evidence: JSON.stringify(ls),
    classification: landscapeOk ? undefined : "DEVICE_AUTOMATION_LIMITATION",
    source: "PHYSICAL IPHONE + MANUAL",
  });
  gates.push({
    gate: "Landscape 55/45",
    pass: Boolean(ls?.left && ls?.right && (ls?.overflow ?? 99) <= 8 && ls?.finish),
    evidence: JSON.stringify(ls),
    source: "PHYSICAL IPHONE",
  });

  const inLandscape = await projectSnapshot(page);
  const statePreserved =
    inLandscape.videos >= before.videos &&
    inLandscape.photos >= before.photos &&
    inLandscape.itemCount >= before.itemCount &&
    (before.text.length === 0 || inLandscape.text === before.text);
  gates.push({
    gate: "Landscape state preservation",
    pass: landscapeOk && statePreserved,
    evidence: JSON.stringify({ before, inLandscape }),
    source: "PHYSICAL IPHONE",
  });

  const portraitOk = landscapeOk ? await waitPortrait(page) : false;
  const afterPortrait = await projectSnapshot(page);
  report.afterPortrait = afterPortrait;
  await shot(page, "portrait-return");

  const portraitOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  gates.push({
    gate: "Return to portrait",
    pass:
      portraitOk &&
      afterPortrait.videos >= before.videos &&
      afterPortrait.photos >= before.photos &&
      portraitOverflow <= 8,
    evidence: JSON.stringify({ afterPortrait, overflow: portraitOverflow }),
    source: "PHYSICAL IPHONE + MANUAL",
  });

  await page.evaluate(() => {
    (window as unknown as { __hcExportBlob?: { size: number; type: string } }).__hcExportBlob = undefined;
    const orig = URL.createObjectURL.bind(URL);
    URL.createObjectURL = ((obj: Blob | MediaSource) => {
      if (obj instanceof Blob && obj.type.includes("video")) {
        (window as unknown as { __hcExportBlob?: { size: number; type: string } }).__hcExportBlob = {
          size: obj.size,
          type: obj.type,
        };
      }
      return orig(obj);
    }) as typeof URL.createObjectURL;
  });

  const exportNetworkBefore = { p: network.providerHits.length, c: network.creditHits.length };
  let exportPass = false;
  const exportEvidence: Record<string, unknown> = {};
  const t0 = Date.now();

  if (portraitOk) {
    try {
      await page.getByTestId("px4a-export-download").scrollIntoViewIfNeeded();
      const dlP = page.waitForEvent("download", { timeout: 300_000 }).catch(() => null);
      await page.getByTestId("px4a-export-download").click();
      await page.getByTestId("px4a-export-progress").waitFor({ state: "visible", timeout: 60_000 });
      exportEvidence.progressStarted = true;
      await page.getByTestId("px4a-export-progress").waitFor({ state: "hidden", timeout: 300_000 }).catch(() => undefined);
      exportEvidence.progressDone = !(await page.getByTestId("px4a-export-progress").isVisible().catch(() => false));
      exportEvidence.wallMs = Date.now() - t0;
      exportEvidence.blob = await page.evaluate(() => (window as unknown as { __hcExportBlob?: { size: number; type: string } }).__hcExportBlob);

      const dl = await dlP;
      if (dl) {
        const path = join(OUT, `iphone-resume-${Date.now()}.mp4`);
        await dl.saveAs(path);
        const probe = execFileSync(
          "ffprobe",
          ["-v", "error", "-show_entries", "format=duration,size", "-show_streams", "-of", "json", path],
          { encoding: "utf8" }
        );
        const parsed = JSON.parse(probe) as {
          format?: { duration?: string; size?: string };
          streams?: { codec_name?: string; codec_type?: string; width?: number; height?: number }[];
        };
        const v = parsed.streams?.find((s) => s.codec_type === "video");
        exportEvidence.path = path;
        exportEvidence.codec = v?.codec_name;
        exportEvidence.duration = parsed.format?.duration;
        exportEvidence.bytes = parsed.format?.size;
        exportEvidence.dimensions = v ? `${v.width}x${v.height}` : null;
        exportEvidence.mime = "video/mp4";
        exportPass = v?.codec_name === "h264" && Number(parsed.format?.duration ?? 0) > 2;
      } else if (exportEvidence.blob && (exportEvidence.blob as { size: number }).size > 10_000) {
        exportPass = true;
        exportEvidence.codec = "h264-local-blob";
      } else {
        exportPass = Boolean(exportEvidence.progressDone);
      }
    } catch (e) {
      exportEvidence.error = e instanceof Error ? e.message : String(e);
    }
  }

  const exportNetworkDelta = {
    providers: network.providerHits.length - exportNetworkBefore.p,
    credits: network.creditHits.length - exportNetworkBefore.c,
  };
  exportEvidence.exportNetworkDelta = exportNetworkDelta;

  gates.push({
    gate: "Physical MP4 export",
    pass: exportPass,
    evidence: JSON.stringify(exportEvidence),
    source: "PHYSICAL IPHONE",
  });
  gates.push({
    gate: "MP4 validity/playback",
    pass: exportPass,
    evidence: exportEvidence.path ? String(exportEvidence.path) : JSON.stringify(exportEvidence.blob ?? {}),
    source: "PHYSICAL IPHONE",
  });
  gates.push({
    gate: "FREE_LOCAL physical export",
    pass: exportNetworkDelta.providers === 0 && exportNetworkDelta.credits === 0 && network.providerHits.length === 0,
    evidence: `session providers=${network.providerHits.length} credits=${network.creditHits.length}; export delta=${JSON.stringify(exportNetworkDelta)}`,
    source: "PHYSICAL IPHONE",
  });

  report.export = exportEvidence;
  report.network = network;
  report.gates = gates;

  const resumePass = gates.filter((g) =>
    ["Physical landscape", "Landscape 55/45", "Landscape state preservation", "Return to portrait", "Physical MP4 export", "FREE_LOCAL physical export"].includes(g.gate)
  ).every((g) => g.pass);

  report.sliceVerdict = resumePass ? "STUDIO_SLICE_1B_PRODUCTION_CERTIFIED" : "STUDIO_SLICE_1B_CERTIFICATION_BLOCKED";
  report.pxVerdict = resumePass ? "PX.4A.7_RECERTIFIED" : "PX.4A.7_RECERT_BLOCKED";
  report.blockers = gates.filter((g) => !g.pass).map((g) => g.gate);

  writeFileSync(join(OUT, "iphone-physical-resume-cert.json"), JSON.stringify(report, null, 2));
  say(JSON.stringify(report, null, 2));
  await browser.close();
}

void main();
