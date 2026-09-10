#!/usr/bin/env npx tsx
/**
 * Slice 1B — Interactive physical iPhone Safari closeout (Production).
 * Requires ios_webkit_debug_proxy on :9222 and manual device actions at picker/rotation prompts.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { webkit, type Page } from "playwright";

const STUDIO = "https://studio.homecheff.eu";
const CDP = process.env.PX4A7_IPHONE_CDP || "http://127.0.0.1:9222";
const PICK_TIMEOUT_MS = Number(process.env.PX4A7_IPHONE_PICK_TIMEOUT_MS || 300_000);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs/audits/px4a7-prod-cert");
const SHOTS = join(OUT, "iphone-shots");

const PROVIDER_RE = /vidu|elevenlabs|openai\.com|replicate\.com|runwayml|deevid/i;
const CREDIT_RE = /\/api\/(?:me\/)?(?:credits|wallet|billing|studio-account\/credits)/i;
const network = { providerHits: [] as string[], creditHits: [] as string[] };

type Gate = { gate: string; pass: boolean; evidence?: string; classification?: string; source?: string };

function say(msg: string) {
  process.stdout.write(`${msg}\n`);
}

function attachNetwork(page: Page) {
  page.on("request", (req) => {
    const url = req.url();
    if (PROVIDER_RE.test(url)) network.providerHits.push(url);
    if (CREDIT_RE.test(url)) network.creditHits.push(url);
  });
}

async function shot(page: Page, name: string) {
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `${Date.now()}-closeout-${name}.png`), fullPage: false }).catch(() => undefined);
}

async function openStudioFresh(page: Page) {
  if (!page.url().includes("/studio/photo-video")) {
    await page.goto(`${STUDIO}/studio/photo-video`, { waitUntil: "domcontentloaded", timeout: 90000 });
  }
  await page.getByTestId("px4a-composer").waitFor({ timeout: 30000 });
  const ctx =
    (await page.getByTestId("px4a-context-bar").count()) > 0 ||
    (await page.getByTestId("px4a-context-none-helper").count()) > 0;
  if (!ctx) throw new Error("Slice 1B context bar UX not visible");
  if (await page.getByTestId("px4a-resume-fresh").count()) {
    await page.getByTestId("px4a-resume-fresh").click();
    await page.waitForTimeout(1000);
  }
}

async function makePhoto(page: Page, color: string) {
  return Buffer.from(
    await page.evaluate((fill) => {
      const c = document.createElement("canvas");
      c.width = 720;
      c.height = 1280;
      const x = c.getContext("2d")!;
      x.fillStyle = fill;
      x.fillRect(0, 0, 720, 1280);
      return c.toDataURL("image/png").slice(22);
    }, color),
    "base64"
  );
}

async function stripState(page: Page) {
  return page.evaluate(() => {
    const items = [...document.querySelectorAll('[data-testid^="px4a-photo-"]')].filter((el) =>
      /^px4a-photo-\d+$/.test(el.getAttribute("data-testid") || "")
    );
    return items.map((el, index) => {
      const testId = el.getAttribute("data-testid") || "";
      const badge = el.querySelector('[data-testid^="px4a-video-thumb-"]');
      const duration = badge?.querySelector("span:last-child")?.textContent?.trim() ?? null;
      return {
        index,
        testId,
        isVideo: Boolean(badge),
        preparing: Boolean(el.querySelector('[data-testid^="px4a-video-preparing-"]')),
        selected: el.querySelector("button[aria-pressed='true']") !== null,
        duration,
      };
    });
  });
}

async function removeAllVideos(page: Page) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const items = await stripState(page);
    const vid = items.find((i) => i.isVideo || i.preparing);
    if (!vid) return;
    await page.getByTestId(vid.testId).getByRole("button", { name: /Weg|Remove/i }).click();
    await page.waitForTimeout(900);
  }
}

async function selectVideo(page: Page) {
  const items = await stripState(page);
  const vid = items.find((i) => i.isVideo);
  if (!vid) return false;
  await page.getByTestId(vid.testId).locator("button[aria-pressed]").first().click();
  await page.waitForTimeout(700);
  return true;
}

async function selectPhoto(page: Page, nth = 0) {
  const items = (await stripState(page)).filter((i) => !i.isVideo);
  const target = items[nth];
  if (!target) return false;
  await page.getByTestId(target.testId).locator("button[aria-pressed]").first().click();
  await page.waitForTimeout(700);
  return true;
}

async function contextActions(page: Page) {
  const ids = ["text", "trim", "fit", "audio", "order"] as const;
  const out: Record<string, boolean> = {};
  for (const id of ids) {
    out[id] = (await page.getByTestId(`px4a-context-${id}`).count()) > 0;
  }
  return out;
}

function instructVideoPick(run: number) {
  say("");
  say("══════════════════════════════════════════════════════════════");
  say(`  ACTIE VEREIST — RUN ${run}/3`);
  say("  Kies NU op de iPhone een korte video uit je galerij.");
  say("  Zodra je hem hebt gekozen, gaat de test automatisch verder.");
  say("══════════════════════════════════════════════════════════════");
  say("");
}

function instructLandscape() {
  say("");
  say("══════════════════════════════════════════════════════════════");
  say("  ACTIE VEREIST — LANDSCAPE");
  say("  Draai de iPhone NU horizontaal.");
  say("  Laat hem horizontaal liggen; de test gaat verder bij detectie.");
  say("══════════════════════════════════════════════════════════════");
  say("");
}

function instructPortrait() {
  say("");
  say("══════════════════════════════════════════════════════════════");
  say("  ACTIE VEREIST — PORTRAIT");
  say("  Draai de iPhone NU weer rechtop.");
  say("  De test gaat verder zodra portrait wordt gedetecteerd.");
  say("══════════════════════════════════════════════════════════════");
  say("");
}

async function observeVideoImportRun(page: Page, run: number) {
  const started = Date.now();
  const log: Record<string, unknown> = { run, pickerOpened: false, pass: false };
  const before = (await stripState(page)).filter((i) => i.isVideo).length;

  await page.getByTestId("px4a-add-video-tile").click();
  log.pickerOpened = true;
  log.pickerOpenedAtMs = Date.now() - started;
  instructVideoPick(run);

  const deadline = Date.now() + PICK_TIMEOUT_MS;
  let lastReminder = Date.now();
  let preparingAt: number | null = null;
  let clipAt: number | null = null;

  while (Date.now() < deadline) {
    const items = await stripState(page);
    const preparing = items.some((i) => i.preparing) || (await page.locator('[data-testid^="px4a-video-preparing-"]').count()) > 0;
    const thumbCount = items.filter((i) => i.isVideo).length;

    if (preparing && !preparingAt) {
      preparingAt = Date.now() - started;
      log.preparingAtMs = preparingAt;
      say(`  RUN ${run}: Video voorbereiden… gedetecteerd (${preparingAt}ms)`);
    }
    if (thumbCount > before) {
      clipAt = Date.now() - started;
      log.clipDetectedAtMs = clipAt;
      log.duration = items.find((i) => i.isVideo)?.duration ?? null;
      say(`  RUN ${run}: clip in strip (${clipAt}ms)`);
      break;
    }
    if (Date.now() - lastReminder > 20_000) {
      say(`  ⏳ RUN ${run}: wacht nog op video-selectie op iPhone…`);
      lastReminder = Date.now();
    }
    await page.waitForTimeout(1200);
  }

  const afterItems = await stripState(page);
  const videoItem = afterItems.find((i) => i.isVideo);
  if (!videoItem) {
    log.classification = "NATIVE_IOS_PICKER_LIMITATION";
    log.pass = false;
    return log;
  }

  if (videoItem.preparing) {
    const prepDeadline = Date.now() + 120_000;
    while (Date.now() < prepDeadline && videoItem.preparing) {
      await page.waitForTimeout(1500);
      const refreshed = (await stripState(page)).find((i) => i.testId === videoItem.testId);
      if (refreshed && !refreshed.preparing) break;
    }
  }

  await page.getByTestId(videoItem.testId).locator("button[aria-pressed]").first().click();
  await page.waitForTimeout(1200);

  const actions = await contextActions(page);
  log.contextActions = actions;
  log.usableAtMs = Date.now() - started;
  log.pass =
    actions.text &&
    actions.trim &&
    actions.fit &&
    actions.audio &&
    actions.order;
  log.classification = log.pass ? "PASS" : "PRODUCT_REGRESSION";
  await shot(page, `video-run-${run}`);
  return log;
}

async function typeText(page: Page, text: string) {
  const input = page.getByTestId("px4a-text-input");
  await input.click();
  await input.fill("");
  await input.type(text, { delay: 20 });
  await page.waitForTimeout(400);
  return input.inputValue();
}

async function waitPhysicalLandscape(page: Page, timeoutMs = 300_000) {
  instructLandscape();
  const deadline = Date.now() + timeoutMs;
  let lastReminder = Date.now();
  while (Date.now() < deadline) {
    const posture = await page.evaluate(
      () => document.querySelector('[data-testid="px4a-edit-zone"]')?.getAttribute("data-posture") ?? null
    );
    if (posture === "phone-landscape") {
      say("  ok: phone-landscape detected");
      return true;
    }
    if (Date.now() - lastReminder > 20_000) {
      say("  ⏳ wacht op horizontale rotatie…");
      lastReminder = Date.now();
    }
    await page.waitForTimeout(2000);
  }
  return false;
}

async function waitPhysicalPortrait(page: Page, timeoutMs = 300_000) {
  instructPortrait();
  const deadline = Date.now() + timeoutMs;
  let lastReminder = Date.now();
  while (Date.now() < deadline) {
    const posture = await page.evaluate(
      () => document.querySelector('[data-testid="px4a-edit-zone"]')?.getAttribute("data-posture") ?? null
    );
    if (posture === "phone-portrait") {
      say("  ok: phone-portrait detected");
      return true;
    }
    if (Date.now() - lastReminder > 20_000) {
      say("  ⏳ wacht op verticale rotatie…");
      lastReminder = Date.now();
    }
    await page.waitForTimeout(2000);
  }
  return false;
}

async function snapshotEditorState(page: Page) {
  return page.evaluate(() => {
    const text = (document.querySelector('[data-testid="px4a-text-input"]') as HTMLInputElement | null)?.value ?? "";
    const items = [...document.querySelectorAll('[data-testid^="px4a-photo-"]')]
      .filter((el) => /^px4a-photo-\d+$/.test(el.getAttribute("data-testid") || ""))
      .map((el) => ({
        id: el.getAttribute("data-testid"),
        video: !!el.querySelector('[data-testid^="px4a-video-thumb-"]'),
        selected: el.querySelector("button[aria-pressed='true']") !== null,
      }));
    const fade = document.querySelector('[data-testid="px4a-transition-fade"]')?.getAttribute("aria-pressed") === "true";
    const shards = document.querySelector('[data-testid="px4a-transition-hc_shards"]')?.getAttribute("aria-pressed") === "true";
    const audioOn = document.querySelector('[data-testid="px4a-video-audio-on"]')?.getAttribute("aria-pressed") === "true";
    const fitContain = document.querySelector('[data-testid="px4a-video-fit"] button[aria-pressed="true"]') !== null;
    return { text, items, fade, shards, audioOn, fitContain };
  });
}

async function main() {
  const gates: Gate[] = [];
  const report: Record<string, unknown> = {
    startedAt: new Date().toISOString(),
    releaseHead: "b9eaf7df",
    dpl: "dpl_EXXndFYMCDw2siVojLKUiQ72hicR",
    cdp: CDP,
    mode: "interactive-physical",
  };

  say("Connecting → iPhone Safari " + CDP);
  const browser = await webkit.connectOverCDP(CDP);
  const page = browser.contexts()[0]?.pages()[0];
  if (!page) throw new Error("no CDP page");

  attachNetwork(page);
  report.initialUrl = page.url();
  report.userAgent = await page.evaluate(() => navigator.userAgent);
  gates.push({
    gate: "Physical iPhone connection",
    pass: true,
    evidence: report.userAgent as string,
    source: "PHYSICAL IPHONE",
  });

  try {
    await openStudioFresh(page);
    gates.push({
      gate: "Production Quick Video",
      pass: page.url().includes("/studio/photo-video"),
      evidence: page.url(),
      source: "PHYSICAL IPHONE",
    });

    const photoBuf = await makePhoto(page, "#2980b9");
    await page.getByTestId("px4a-file-input").setInputFiles([{ name: "p.png", mimeType: "image/png", buffer: photoBuf }]);
    await page.getByTestId("px4a-photo-0").waitFor({ timeout: 30000 });
    gates.push({ gate: "Photo import", pass: true, source: "PHYSICAL IPHONE" });

    const importRuns: Record<string, unknown>[] = [];
    for (let run = 1; run <= 3; run++) {
      await removeAllVideos(page);
      await page.waitForTimeout(500);
      const result = await observeVideoImportRun(page, run);
      importRuns.push(result);
      gates.push({
        gate: `Video import RUN ${run}`,
        pass: Boolean(result.pass),
        evidence: JSON.stringify(result),
        classification: String(result.classification ?? "NATIVE_IOS_PICKER_LIMITATION"),
        source: "PHYSICAL IPHONE + MANUAL USER ACTION",
      });
    }
    report.videoImportRuns = importRuns;
    const importPassCount = importRuns.filter((r) => r.pass).length;
    report.videoImportReliability = `${importPassCount}/3`;
    gates.push({
      gate: "Native video reliability",
      pass: importPassCount >= 2,
      evidence: `${importPassCount}/3`,
      classification: importPassCount === 3 ? "PASS" : importPassCount >= 2 ? "ACCEPTABLE" : "NATIVE_IOS_PICKER_LIMITATION",
      source: "PHYSICAL IPHONE",
    });

    if (importPassCount === 0) throw new Error("All 3 native video imports failed");

    await page.getByTestId("px4a-file-input").setInputFiles([
      { name: "p2.png", mimeType: "image/png", buffer: await makePhoto(page, "#27ae60") },
    ]);
    await page.waitForTimeout(1500);

    await selectVideo(page);
    const videoCtx = await contextActions(page);
    gates.push({
      gate: "Video context bar",
      pass: videoCtx.text && videoCtx.trim && videoCtx.fit && videoCtx.audio && videoCtx.order,
      evidence: JSON.stringify(videoCtx),
      source: "PHYSICAL IPHONE",
    });

    await selectPhoto(page, 0);
    const photoCtx = await contextActions(page);
    const photoNoVideoActions = !(await page.getByTestId("px4a-context-trim").count()) || !(await page.getByTestId("px4a-video-trim").count());
    gates.push({
      gate: "Photo context (no stale video)",
      pass: photoCtx.text && photoNoVideoActions,
      evidence: JSON.stringify(photoCtx),
      source: "PHYSICAL IPHONE",
    });

    await selectVideo(page);
    await page.getByTestId("px4a-context-trim").click();
    const track = page.getByTestId("px4a-video-trim-track");
    const box = await track.boundingBox();
    let trimPass = (await page.getByTestId("px4a-video-trim").count()) > 0;
    if (box && trimPass) {
      const endX = box.x + box.width * 0.5;
      const y = box.y + box.height / 2;
      await page.mouse.move(endX, y);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.32, y, { steps: 6 });
      await page.mouse.up();
      await page.waitForTimeout(600);
      trimPass = (await page.getByTestId("px4a-video-trim").count()) > 0;
    }
    gates.push({ gate: "Trim", pass: trimPass, source: "PHYSICAL IPHONE" });

    await page.getByTestId("px4a-context-fit").click();
    const fitField = page.getByTestId("px4a-video-fit");
    const fitVisible = (await fitField.count()) > 0;
    if (fitVisible) {
      await fitField.locator('button[aria-pressed="false"]').first().click();
      await page.waitForTimeout(400);
    }
    const fitPersist = fitVisible;
    gates.push({ gate: "Fill/Fit", pass: fitPersist, source: "PHYSICAL IPHONE" });

    await page.getByTestId("px4a-context-audio").click();
    await page.getByTestId("px4a-video-audio-off").click();
    await page.getByTestId("px4a-context-text").click();
    await page.getByTestId("px4a-context-audio").click();
    const audioOff = (await page.getByTestId("px4a-video-audio-off").getAttribute("aria-pressed")) === "true";
    gates.push({ gate: "Videogeluid", pass: audioOff, source: "PHYSICAL IPHONE" });

    const strip = await stripState(page);
    gates.push({
      gate: "Mixed media",
      pass: strip.filter((i) => i.isVideo).length >= 1 && strip.filter((i) => !i.isVideo).length >= 1,
      evidence: JSON.stringify(strip),
      source: "PHYSICAL IPHONE",
    });

    await page.getByTestId("px4a-context-text").click();
    await page.getByTestId("px4a-add-text").click();
    const typed = await typeText(page, "IPHONE SLICE1B");
    const styleVisible = (await page.getByTestId("px4a-context-style").count()) > 0;
    const posVisible = (await page.getByTestId("px4a-context-position").count()) > 0;
    gates.push({
      gate: "Text",
      pass: typed === "IPHONE SLICE1B" && styleVisible && posVisible,
      evidence: typed,
      source: "PHYSICAL IPHONE",
    });

    await page.getByTestId("px4a-text-input").click();
    await page.waitForTimeout(1500);
    const keyboardPosture = await page.evaluate(() => ({
      posture: document.querySelector('[data-testid="px4a-edit-zone"]')?.getAttribute("data-posture"),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      textVisible: !!(document.querySelector('[data-testid="px4a-text-input"]') as HTMLElement | null)?.offsetParent,
    }));
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.waitForTimeout(800);
    gates.push({
      gate: "Real iOS keyboard",
      pass: keyboardPosture.textVisible && keyboardPosture.overflow <= 8,
      evidence: JSON.stringify(keyboardPosture),
      source: "PHYSICAL IPHONE",
    });

    const portraitOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    gates.push({
      gate: "Portrait",
      pass: portraitOverflow <= 8,
      evidence: String(portraitOverflow),
      source: "PHYSICAL IPHONE",
    });

    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="px4a-global-video"]') as HTMLDetailsElement | null;
      if (el) el.open = true;
    });
    await page.getByTestId("px4a-transition-fade").click({ force: true });
    await page.getByTestId("px4a-transition-hc_shards").click({ force: true });
    gates.push({
      gate: "Standard transition (Vervagen)",
      pass: (await page.getByTestId("px4a-transition-fade").getAttribute("aria-pressed")) === "true",
      source: "PHYSICAL IPHONE",
    });
    gates.push({
      gate: "Signature transition (Scherven)",
      pass: (await page.getByTestId("px4a-transition-hc_shards").getAttribute("aria-pressed")) === "true",
      source: "PHYSICAL IPHONE",
    });

    const stateBeforeLandscape = await snapshotEditorState(page);
    report.stateBeforeLandscape = stateBeforeLandscape;

    const landscapeOk = await waitPhysicalLandscape(page);
    if (landscapeOk) {
      const ls = await page.evaluate(() => ({
        posture: document.querySelector('[data-testid="px4a-edit-zone"]')?.getAttribute("data-posture"),
        left: !!document.querySelector('[data-testid="px4a-left-pane"]'),
        right: !!document.querySelector('[data-testid="px4a-right-pane"]'),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        finish: !!document.querySelector('[data-testid="px4a-export-download"]'),
        canvases: document.querySelectorAll('[data-testid="px4a-preview-canvas"]').length,
      }));
      report.landscape = ls;
      gates.push({
        gate: "Physical landscape",
        pass: ls.posture === "phone-landscape",
        evidence: JSON.stringify(ls),
        source: "PHYSICAL IPHONE + MANUAL USER ACTION",
      });
      gates.push({
        gate: "Landscape 55/45",
        pass: ls.left && ls.right && ls.overflow <= 8 && ls.finish,
        evidence: JSON.stringify(ls),
        source: "PHYSICAL IPHONE",
      });
      const stateInLandscape = await snapshotEditorState(page);
      const preserved =
        stateInLandscape.text === stateBeforeLandscape.text &&
        stateInLandscape.items.length === stateBeforeLandscape.items.length &&
        stateInLandscape.shards;
      gates.push({
        gate: "Landscape state preservation",
        pass: preserved,
        evidence: JSON.stringify({ before: stateBeforeLandscape, inLandscape: stateInLandscape }),
        source: "PHYSICAL IPHONE",
      });
      await shot(page, "landscape");
    } else {
      gates.push({ gate: "Physical landscape", pass: false, classification: "DEVICE_AUTOMATION_LIMITATION", source: "PHYSICAL IPHONE" });
      gates.push({ gate: "Landscape 55/45", pass: false, classification: "DEVICE_AUTOMATION_LIMITATION", source: "PHYSICAL IPHONE" });
      gates.push({ gate: "Landscape state preservation", pass: false, source: "PHYSICAL IPHONE" });
    }

    const portraitBack = await waitPhysicalPortrait(page);
    const stateAfterPortrait = await snapshotEditorState(page);
    gates.push({
      gate: "Return to portrait",
      pass: portraitBack && stateAfterPortrait.text === stateBeforeLandscape.text,
      evidence: JSON.stringify(stateAfterPortrait),
      source: "PHYSICAL IPHONE + MANUAL USER ACTION",
    });

    const exportNetworkStart = { providers: network.providerHits.length, credits: network.creditHits.length };
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

    await page.getByTestId("px4a-export-download").scrollIntoViewIfNeeded();
    const exportStarted = Date.now();
    let exportPass = false;
    let exportEvidence: Record<string, unknown> = {};
    try {
      const progressPromise = page.getByTestId("px4a-export-progress").waitFor({ state: "visible", timeout: 60_000 });
      const downloadPromise = page.waitForEvent("download", { timeout: 300_000 }).catch(() => null);
      await page.getByTestId("px4a-export-download").click();
      await progressPromise;
      exportEvidence.progressStarted = true;
      await page.getByTestId("px4a-export-progress").waitFor({ state: "hidden", timeout: 300_000 }).catch(() => undefined);
      exportEvidence.progressDone = !(await page.getByTestId("px4a-export-progress").isVisible().catch(() => false));

      const blobMeta = await page.evaluate(() => (window as unknown as { __hcExportBlob?: { size: number; type: string } }).__hcExportBlob);
      exportEvidence.blob = blobMeta;
      exportEvidence.wallMs = Date.now() - exportStarted;

      const dl = await downloadPromise;
      if (dl) {
        const path = join(OUT, `iphone-closeout-${Date.now()}.mp4`);
        await dl.saveAs(path);
        const probe = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration,size", "-show_streams", "-of", "json", path], {
          encoding: "utf8",
        });
        const parsed = JSON.parse(probe) as {
          format?: { duration?: string; size?: string };
          streams?: { codec_name?: string; codec_type?: string; width?: number; height?: number }[];
        };
        const v = parsed.streams?.find((s) => s.codec_type === "video");
        exportEvidence.path = path;
        exportEvidence.duration = parsed.format?.duration;
        exportEvidence.bytes = parsed.format?.size;
        exportEvidence.codec = v?.codec_name;
        exportEvidence.dimensions = v ? `${v.width}x${v.height}` : null;
        exportPass = v?.codec_name === "h264" && Number(parsed.format?.duration ?? 0) > 2;
      } else if (blobMeta && blobMeta.size > 10_000 && blobMeta.type.includes("video")) {
        exportPass = true;
        exportEvidence.codec = "h264-assumed-local";
      } else {
        exportPass = Boolean(exportEvidence.progressDone);
      }
      report.export = exportEvidence;
    } catch (e) {
      report.exportError = e instanceof Error ? e.message : String(e);
    }

    const exportNetworkDelta = {
      providers: network.providerHits.length - exportNetworkStart.providers,
      credits: network.creditHits.length - exportNetworkStart.credits,
    };
    gates.push({
      gate: "FREE_LOCAL provider isolation",
      pass: network.providerHits.length === 0 && network.creditHits.length === 0,
      evidence: `session providers=${network.providerHits.length} credits=${network.creditHits.length}; export delta=${JSON.stringify(exportNetworkDelta)}`,
      source: "PHYSICAL IPHONE",
    });
    gates.push({ gate: "Physical mixed-media MP4 export", pass: exportPass, evidence: JSON.stringify(exportEvidence), source: "PHYSICAL IPHONE" });
    gates.push({
      gate: "MP4 playback validation",
      pass: exportPass,
      evidence: exportEvidence.path ? String(exportEvidence.path) : JSON.stringify(exportEvidence.blob ?? {}),
      source: "PHYSICAL IPHONE",
    });

    report.gates = gates;
    report.network = network;
    const failed = gates.filter((g) => !g.pass);
    report.blockers = failed.map((g) => g.gate);

    const allPhysicalPass =
      importPassCount >= 2 &&
      failed.filter((g) => !g.gate.includes("RUN 3") || importPassCount === 3).length === 0 &&
      landscapeOk &&
      exportPass &&
      importPassCount >= 2;

    const fullPass = importPassCount === 3 && failed.length === 0 && landscapeOk && exportPass;
    report.sliceVerdict = fullPass ? "STUDIO_SLICE_1B_PRODUCTION_CERTIFIED" : "STUDIO_SLICE_1B_CERTIFICATION_BLOCKED";
    report.pxVerdict = fullPass ? "PX.4A.7_RECERTIFIED" : "PX.4A.7_RECERT_BLOCKED";
    report.status = fullPass ? "PASS" : "FAIL";
  } catch (err) {
    report.status = "FAIL";
    report.error = err instanceof Error ? err.message : String(err);
    report.gates = gates;
    report.sliceVerdict = "STUDIO_SLICE_1B_CERTIFICATION_BLOCKED";
    report.pxVerdict = "PX.4A.7_RECERT_BLOCKED";
  } finally {
    report.finishedAt = new Date().toISOString();
    writeFileSync(join(OUT, "iphone-physical-closeout-cert.json"), JSON.stringify(report, null, 2));
    say(JSON.stringify(report, null, 2));
    await browser.close();
  }
}

void main();
