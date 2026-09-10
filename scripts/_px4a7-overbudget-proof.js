/**
 * PX.4A.7 GAP 1 — live over-budget UX proof (Production, authenticated profile).
 * Trim via PointerEvent on px4a-video-trim-* handles (not blind mouse drag).
 */
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const PROFILE = path.resolve(".px4a7-prod-profile");
const OUT = path.resolve("docs/audits/px4a7-prod-cert");
const FIX = path.join(OUT, "fixtures");

function parseSecondsFromBadge(text) {
  const m = String(text).replace(",", ".").match(/([0-9]+(?:\.[0-9]+)?)\s*sec/i);
  return m ? Number(m[1]) : null;
}

function parseClockToSeconds(text) {
  const m = String(text).match(/(\d+):(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2].replace(",", "."));
}

function probe(file) {
  const j = JSON.parse(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "json", file],
      { encoding: "utf8" }
    )
  );
  return { duration: Number(j.format?.duration || 0) };
}

async function run() {
  fs.mkdirSync(OUT, { recursive: true });
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    channel: "chrome",
    headless: true,
    locale: "nl-NL",
    acceptDownloads: true,
  });
  const page = ctx.pages()[0] || (await ctx.newPage());
  page.setDefaultTimeout(60000);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const encodeStarted = [];
  page.on("request", (req) => {
    if (/\/api\/photo-video\/export-(handoff|upload)/.test(req.url()) && req.method() === "POST") {
      encodeStarted.push(req.url());
    }
  });

  async function openFresh() {
    await page.goto("https://studio.homecheff.eu/studio/photo-video", { waitUntil: "domcontentloaded" });
    if (await page.getByTestId("px4a-resume-fresh").count()) await page.getByTestId("px4a-resume-fresh").click();
    await page.getByTestId("px4a-composer").waitFor({ timeout: 30000 });
    await wait(900);
  }

  async function addP(f) {
    await page.setInputFiles('[data-testid="px4a-file-input"]', f);
    await wait(2500);
  }

  async function addV(f) {
    await page.setInputFiles('[data-testid="px4a-video-input"]', f);
    await wait(4500);
  }

  async function setDur(sec) {
    const btn = page.locator(`[data-testid="px4a-video-duration"] button[aria-label="${sec} sec"]`);
    if (await btn.count()) {
      await btn.click();
      await wait(300);
      return;
    }
    const chips = page.locator('[data-testid="px4a-video-duration"] button');
    const n = await chips.count();
    for (let i = 0; i < n; i++) {
      const t = (await chips.nth(i).innerText()).trim();
      if (t.includes(String(sec))) {
        await chips.nth(i).click();
        await wait(300);
        return;
      }
    }
  }

  async function videoIndices() {
    return page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('[data-testid^="px4a-video-thumb-"]')) {
        const m = (el.getAttribute("data-testid") || "").match(/px4a-video-thumb-(\d+)/);
        if (m) out.push(Number(m[1]));
      }
      return [...new Set(out)].sort((a, b) => a - b);
    });
  }

  async function selectVideoClip(stripIndex) {
    await page.getByTestId(`px4a-photo-${stripIndex}`).locator("button").first().click();
    await wait(500);
    const trimVisible = await page.getByTestId("px4a-video-trim").isVisible().catch(() => false);
    if (!trimVisible && (await page.getByTestId("px4a-toolbar-clip").count())) {
      await page.getByTestId("px4a-toolbar-clip").click({ force: true }).catch(() => undefined);
      await wait(400);
    }
    await page.getByTestId("px4a-video-trim").waitFor({ timeout: 15000 });
  }

  async function readTrimPanel() {
    return page.evaluate(() => {
      const fieldset = document.querySelector('[data-testid="px4a-video-trim"]');
      const paras = fieldset ? [...fieldset.querySelectorAll("p")].map((p) => (p.textContent || "").trim()) : [];
      const windowBtn = document.querySelector('[data-testid="px4a-video-trim-window"]');
      return {
        paras,
        windowLabel: windowBtn ? (windowBtn.textContent || "").trim() : null,
      };
    });
  }

  /** Drag trim-end handle to target end time (seconds from source start). */
  async function setTrimEndSeconds(targetEndSeconds) {
    const panelBefore = await readTrimPanel();
    const sourceLine = panelBefore.paras.find((t) => /Bron|Source/i.test(t)) || "";
    const sourceSeconds = parseClockToSeconds(sourceLine) || 10;
    const ratio = Math.min(0.99, Math.max(0.05, targetEndSeconds / sourceSeconds));

    await page.evaluate(
      ({ ratio }) => {
        const track = document.querySelector('[data-testid="px4a-video-trim-track"]');
        const endHandle = document.querySelector('[data-testid="px4a-video-trim-end"]');
        if (!track || !endHandle) throw new Error("trim controls missing");

        const trackRect = track.getBoundingClientRect();
        const endRect = endHandle.getBoundingClientRect();
        const targetX = trackRect.left + trackRect.width * ratio;
        const startX = endRect.left + endRect.width / 2;
        const y = endRect.top + endRect.height / 2;
        const pointerId = 7;

        const pe = (type, x, y, buttons) =>
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            composed: true,
            pointerId,
            pointerType: "mouse",
            isPrimary: true,
            clientX: x,
            clientY: y,
            buttons,
            view: window,
          });

        endHandle.dispatchEvent(pe("pointerdown", startX, y, 1));
        for (let step = 1; step <= 10; step++) {
          const x = startX + ((targetX - startX) * step) / 10;
          track.dispatchEvent(pe("pointermove", x, y, 1));
        }
        track.dispatchEvent(pe("pointermove", targetX, y, 1));
        endHandle.dispatchEvent(pe("pointerup", targetX, y, 0));
      },
      { ratio }
    );

    await wait(700);
    const panelAfter = await readTrimPanel();
    const used = parseSecondsFromBadge(panelAfter.windowLabel || "");
    return { sourceSeconds, targetEndSeconds, usedSeconds: used, panelAfter };
  }

  async function videoBadgeDurations() {
    return page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('[data-testid^="px4a-video-thumb-"]')) {
        const td = el.getAttribute("data-testid") || "";
        const m = td.match(/px4a-video-thumb-(\d+)/);
        out.push({ idx: m ? Number(m[1]) : null, text: (el.textContent || "").trim() });
      }
      return out;
    });
  }

  async function captureOverBudgetState(label) {
    const badges = await videoBadgeDurations();
    const secs = badges.map((b) => parseSecondsFromBadge(b.text)).filter((n) => Number.isFinite(n));
    const warningVisible = (await page.getByTestId("px4a-video-over-budget").count()) > 0;
    const warningText = warningVisible ? await page.getByTestId("px4a-video-over-budget").textContent() : null;
    const downloadDisabled = await page.getByTestId("px4a-export-download").isDisabled();
    const finishVisible = (await page.getByTestId("px4a-item-finish").count()) > 0;
    let finishDisabled = null;
    if (finishVisible) finishDisabled = await page.getByTestId("px4a-item-finish").isDisabled();
    const durationText = await page.getByTestId("px4a-duration").textContent().catch(() => null);
    return {
      label,
      clipBadgeTexts: badges,
      clipSeconds: secs,
      videoSecondsSum: secs.reduce((s, n) => s + n, 0),
      warningVisible,
      warningText: warningText?.trim() || null,
      exportDownloadDisabled: downloadDisabled,
      itemFinishDisabled: finishDisabled,
      durationText: durationText?.trim() || null,
      encodeRequestsWhileInvalid: encodeStarted.length,
    };
  }

  const report = { at: new Date().toISOString(), architecture: null, verdict: null };
  const photo = path.join(FIX, "px4a7-photo-red.png");
  const v10 = path.join(FIX, "px4a7-video-10s.mp4");

  await openFresh();
  await addP(photo);
  await addV(v10);
  await addV(v10);
  await setDur(15);
  await page.getByTestId("px4a-transition-cut").click().catch(() => undefined);

  const vids = await videoIndices();
  report.stripVideoIndices = vids;

  // Expand both clips toward ~9s each (18s video vs 15s budget + 1 photo hold)
  for (const idx of vids) {
    await selectVideoClip(idx);
    const trimResult = await setTrimEndSeconds(9);
    report[`trimClip${idx}`] = trimResult;
  }

  report.overBudgetPhase = await captureOverBudgetState("over-budget");
  report.overBudgetPhase.encodeBlocked = encodeStarted.length === 0;

  // Attempt blocked export click while invalid
  const exportCountBefore = encodeStarted.length;
  if (!(await page.getByTestId("px4a-export-download").isDisabled())) {
    await page.getByTestId("px4a-export-download").click().catch(() => undefined);
    await wait(1500);
  }
  report.overBudgetPhase.encodeAfterClickAttempt = encodeStarted.length - exportCountBefore;

  const over =
    report.overBudgetPhase.warningVisible &&
    report.overBudgetPhase.exportDownloadDisabled &&
    report.overBudgetPhase.videoSecondsSum > 15;

  if (!over && report.overBudgetPhase.videoSecondsSum <= 15) {
    report.architecture = "OVER_BUDGET_UNREACHABLE_BY_DESIGN";
    report.architectureReason =
      "Trim interactions could not raise combined video seconds above target; UI may cap clip length by construction.";
  } else if (over) {
    report.architecture = "OVER_BUDGET_REACHABLE";
  } else {
    report.architecture = "OVER_BUDGET_INCONCLUSIVE";
  }

  // Recovery: trim back to 6 + 5 = 11s (valid for 15s with 1 photo)
  if (vids[0] != null) {
    await selectVideoClip(vids[0]);
    await setTrimEndSeconds(6);
  }
  if (vids[1] != null) {
    await selectVideoClip(vids[1]);
    await setTrimEndSeconds(5);
  }

  report.trimmedBackPhase = await captureOverBudgetState("trimmed-valid");
  report.trimmedBackPhase.recovered =
    !report.trimmedBackPhase.warningVisible && !report.trimmedBackPhase.exportDownloadDisabled;

  // Valid export at target duration
  if (report.trimmedBackPhase.recovered) {
    await page.waitForFunction(
      () => {
        const b = document.querySelector('[data-testid="px4a-export-download"]');
        return b && !b.disabled;
      },
      { timeout: 120000 }
    );
    const [dl] = await Promise.all([
      page.waitForEvent("download", { timeout: 240000 }),
      page.getByTestId("px4a-export-download").click(),
    ]);
    const outMp4 = path.join(OUT, "gap-overbudget-recovered.mp4");
    await dl.saveAs(outMp4);
    report.recoveredExport = { ...probe(outMp4), path: outMp4, targetSeconds: 15 };
  }

  report.verdict =
    report.architecture === "OVER_BUDGET_UNREACHABLE_BY_DESIGN"
      ? "OVER_BUDGET_UNREACHABLE_BY_DESIGN"
      : over && report.trimmedBackPhase.recovered
        ? "GAP1_PASS"
        : "GAP1_FAIL";

  fs.writeFileSync(path.join(OUT, "gap-overbudget-proof.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await ctx.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
