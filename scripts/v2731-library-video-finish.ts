/**
 * Trim the overlapping earlier video through the timeline UI,
 * then play and export the distinct library video.
 */
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "playwright";

const base = "http://127.0.0.1:3462";
const password = "v272-local-only-password";
const projectId = "cmvrdlbwg0005dh92s468jz8g";
const evidence = path.resolve("docs/studio-v27-3-1/evidence");
const distinct = "bd69cebc-1fc1-4784-ace9-c90fbda23d8f";
const report: Record<string, unknown> = {};

function sql(query: string) {
  return execFileSync("/opt/homebrew/bin/psql", [
    "postgresql://sergioarrias@127.0.0.1:5432/homecheff_studio_v27_2_test",
    "-At",
    "-c",
    query,
  ], { encoding: "utf8" }).trim();
}

async function login(page: Page) {
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.locator('input[name="email"]').fill("v272-user-a@studio.local.test");
  await page.locator('input[name="password"]').fill(password);
  const button = page.locator('form button[type="submit"]');
  await button.waitFor();
  await page.waitForFunction(() => Object.keys(document.querySelector('form button[type="submit"]') ?? {}).some((key) => key.startsWith("__react")));
  await button.evaluate((node) => (node as HTMLButtonElement).click());
  await page.waitForURL((url) => !url.toString().includes("/login"), { timeout: 20000 }).catch(() => undefined);
  if (page.url().includes("/login")) {
    const status = await page.evaluate(async (input) => {
      const next = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      return next.status;
    }, { email: "v272-user-a@studio.local.test", password });
    if (status !== 200) throw new Error("Login failed");
  }
}

async function main() {
  const url = new URL(process.env.DATABASE_URL || "");
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/homecheff_studio_v27_2_test") {
    throw new Error("Certification refused a non-disposable database.");
  }
  await mkdir(evidence, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  page.setDefaultTimeout(90000);
  await login(page);
  await page.goto(`${base}/studio/projects/${projectId}?section=timeline&workflow=film`, { waitUntil: "commit" });
  await page.locator('[data-testid="film-timeline-play"]').waitFor();
  const opened = await page.evaluate(() => {
    const row = document.querySelector(".relative.h-16");
    const button = [...(row?.querySelectorAll("button") ?? [])].find((item) => (item as HTMLElement).style.left === "40px");
    if (!button) return false;
    button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 12, clientY: 12 }));
    window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 12, clientY: 12 }));
    return true;
  });
  report.openedEarlierClip = opened;
  await page.locator('[data-testid="film-clip-duration"]').waitFor();
  report.durationBefore = await page.locator('[data-testid="film-clip-duration"]').inputValue();
  const saved = await page.evaluate(() => {
    const input = document.querySelector('[data-testid="film-clip-duration"]') as HTMLInputElement | null;
    if (!input) return "missing";
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, "4500");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.form?.requestSubmit();
    return input.value;
  });
  report.durationDraft = saved;
  let duration = "";
  for (let attempt = 0; attempt < 15; attempt += 1) {
    await page.waitForTimeout(500);
    duration = sql(`SELECT "durationMs" FROM "StudioTimelineClip" WHERE id = 'cmvre3o2h002idh92vvf573le'`);
    if (duration === "4500") break;
  }
  report.earlierDuration = duration;
  report.videoClips = sql(`
    SELECT c."startMs" || '-' || c."durationMs" || ':' || left(c."sourceId", 28)
    FROM "StudioTimelineClip" c
    JOIN "StudioTimelineTrack" t ON t.id = c."trackId"
    JOIN "StudioTimeline" tl ON tl.id = t."timelineId"
    WHERE tl."projectId" = '${projectId}' AND t.type = 'VIDEO'
    ORDER BY c."startMs"
  `);

  await page.reload({ waitUntil: "commit" });
  await page.locator('[data-testid="film-timeline-play"]').waitFor();
  await page.locator('[data-testid="film-timeline-seek"]').fill("5500");
  await page.locator('[data-testid="film-timeline-seek"]').evaluate((node) => {
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.locator('[data-testid="film-timeline-play"]').evaluate((node) => (node as HTMLButtonElement).click());
  await page.waitForTimeout(1500);
  report.preview = await page.locator('[data-testid="film-timeline-video"]').evaluate((node) => {
    const video = node as HTMLVideoElement;
    return {
      src: video.currentSrc || video.src,
      currentTimeMs: Math.round(video.currentTime * 1000),
      readyState: video.readyState,
      paused: video.paused,
    };
  });
  report.previewIsDistinct = String((report.preview as { src?: string }).src ?? "").includes(distinct);

  page.on("response", (response) => {
    if (response.url().includes("/timeline/render") && response.request().method() === "POST") {
      report.exportStatus = response.status();
    }
  });
  const downloadPromise = page.waitForEvent("download", { timeout: 150000 }).catch(() => null);
  await page.locator('[data-testid="film-export-mp4"]').evaluate((node) => (node as HTMLButtonElement).click());
  const download = await downloadPromise;
  if (download) {
    const target = path.join(evidence, "v2731-film.mp4");
    await download.saveAs(target);
    report.export = { suggested: download.suggestedFilename(), bytes: (await readFile(target)).length };
  }
  await writeFile(path.join(evidence, "library-video-finish.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch(async (error) => {
  report.fatal = error instanceof Error ? error.message : "failed";
  await mkdir(evidence, { recursive: true });
  await writeFile(path.join(evidence, "library-video-finish.json"), JSON.stringify(report, null, 2));
  console.error(report.fatal);
  process.exit(1);
});
