/**
 * Continues the signed-in film on the disposable database:
 * trims duplicate clips in the timeline UI, then uses the product export button.
 */
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { chromium, type Page } from "playwright";

const execFileAsync = promisify(execFile);
const base = "http://127.0.0.1:3462";
const password = "v272-local-only-password";
const projectId = "cmvrdlbwg0005dh92s468jz8g";
const evidence = path.resolve("docs/studio-v27-2/evidence");
const ffprobe = process.env.FFPROBE || "/opt/homebrew/bin/ffprobe";
const report: Record<string, unknown> = {};

function assertLocal() {
  const url = new URL(process.env.DATABASE_URL || "");
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/homecheff_studio_v27_2_test") {
    throw new Error("Certification refused a non-disposable database.");
  }
}

async function login(page: Page, email: string) {
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  const button = page.locator('form button[type="submit"]');
  await button.waitFor();
  await page.waitForFunction(() => {
    const node = document.querySelector('form button[type="submit"]');
    return !!node && Object.keys(node).some((key) => key.startsWith("__react"));
  });
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 60000, waitUntil: "commit" }),
    button.evaluate((node) => (node as HTMLButtonElement).click()),
  ]);
}

async function timeline(page: Page) {
  return page.evaluate(async (id) => {
    const response = await fetch(`/api/studio/projects/${id}/timeline`);
    const body = await response.json();
    return body.timeline as {
      revision: number;
      tracks: Array<{ type: string; clips: Array<{ id: string; startMs: number; durationMs: number }> }>;
    };
  }, projectId);
}

async function selectClip(page: Page, index: number) {
  await page.locator("button.absolute.top-2").nth(index).evaluate((node) => {
    const button = node as HTMLButtonElement;
    const rect = button.getBoundingClientRect();
    const x = rect.left + 8;
    button.dispatchEvent(new PointerEvent("pointerdown", { clientX: x, bubbles: true }));
    window.dispatchEvent(new PointerEvent("pointerup", { clientX: x, bubbles: true }));
  });
  await page.getByTestId("film-clip-start").waitFor({ timeout: 10000 });
}

async function main() {
  assertLocal();
  await mkdir(evidence, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ acceptDownloads: true, viewport: { width: 1440, height: 900 } });
  page.on("dialog", (dialog) => void dialog.accept());
  try {
    await login(page, "v272-user-a@studio.local.test");
    await page.goto(`${base}/studio/projects/${projectId}?section=timeline`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("film-timeline-play").waitFor({ timeout: 30000 });
    const mode = page.getByTestId("film-timeline-mode");
    if ((await mode.innerText()).includes("Advanced")) {
      await mode.evaluate((node) => (node as HTMLButtonElement).click());
    }
    await page.locator("button.absolute.top-2").first().waitFor({ state: "visible", timeout: 20000 });

    for (let guard = 0; guard < 12; guard += 1) {
      const body = await timeline(page);
      const videos = body.tracks.filter((track) => track.type === "VIDEO").flatMap((track) => track.clips);
      const music = body.tracks.filter((track) => track.type === "MUSIC").flatMap((track) => track.clips);
      const extraVideo = videos.length > 4;
      const extraMusic = music.length > 1;
      if (!extraVideo && !extraMusic) break;
      const index = extraVideo ? videos.length - 1 : videos.length + music.length - 1;
      await selectClip(page, index);
      await page.getByTestId("film-clip-remove").evaluate((node) => (node as HTMLButtonElement).click());
      await page.waitForTimeout(400);
    }

    const before = await timeline(page);
    const videos = before.tracks.filter((track) => track.type === "VIDEO").flatMap((track) => track.clips);
    const first = videos[0];
    if (first && first.startMs + first.durationMs > (videos[1]?.startMs ?? first.startMs + first.durationMs)) {
      await selectClip(page, 0);
      const duration = String((videos[1]?.startMs ?? first.startMs + first.durationMs) - first.startMs);
      await page.getByTestId("film-clip-duration").evaluate((node, value) => {
        const input = node as HTMLInputElement;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        setter?.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }, duration);
      await page.getByRole("button", { name: "Save clip" }).evaluate((node) => (node as HTMLButtonElement).click());
      await page.getByText("Clip saved").waitFor({ timeout: 15000 });
    }

    const dialogue = (await timeline(page)).tracks.filter((track) => track.type === "DIALOGUE").flatMap((track) => track.clips);
    report.dialogueBefore = dialogue.length;
    if (dialogue.length === 0) {
      const uploaded = page.waitForResponse((response) => response.url().includes("/api/studio/orchestrator/upload-asset") && response.request().method() === "POST");
      await page.locator('input[accept*="audio/wav"]').first().setInputFiles("/tmp/homecheff-studio-v27-2-cert-media/voice.wav");
      report.voiceUpload = (await uploaded).status();
      await page.getByText(/Voice added|Save failed|already on the track/i).waitFor({ timeout: 20000 });
    }

    const arranged = await timeline(page);
    report.arranged = arranged.tracks.map((track) => ({
      type: track.type,
      clips: track.clips.map((clip) => ({ startMs: clip.startMs, durationMs: clip.durationMs })),
    }));

    await page.getByTestId("film-timeline-play").evaluate((node) => (node as HTMLButtonElement).click());
    await page.waitForTimeout(1000);
    report.playback = await page.getByTestId("film-timeline-video").evaluate((node) => {
      const video = node as HTMLVideoElement;
      return { paused: video.paused, readyState: video.readyState, currentTime: video.currentTime, duration: video.duration };
    });

    const downloadPromise = page.waitForEvent("download", { timeout: 180000 }).catch(() => null);
    const renderPromise = page.waitForResponse(
      (response) => response.url().includes("/timeline/render") && (response.request().postData() || "").includes("\"phase\":\"render\""),
      { timeout: 180000 },
    );
    await page.getByTestId("film-export-mp4").evaluate((node) => (node as HTMLButtonElement).click());
    const render = await renderPromise;
    report.exportStatus = render.status();
    report.exportType = render.headers()["content-type"] || "";
    const download = await downloadPromise;
    const downloadPath = path.join(evidence, "v272-film.mp4");
    if (download) {
      await download.saveAs(downloadPath);
      report.downloadEvent = download.suggestedFilename();
    } else if (render.ok()) {
      await writeFile(downloadPath, Buffer.from(await render.body()));
      report.downloadEvent = "response-body";
    }
    report.exportNote = await page.locator("[role='status']").last().innerText().catch(() => "");
    if (report.downloadEvent) {
      const probe = await execFileAsync(ffprobe, ["-v", "error", "-show_entries", "format=duration,size:stream=codec_type,codec_name", "-of", "json", downloadPath]);
      report.exportProbe = JSON.parse(probe.stdout);
    }
    await page.screenshot({ path: path.join(evidence, "timeline-1440.png") });
  } finally {
    await writeFile(path.join(evidence, "export-report.json"), JSON.stringify(report, null, 2));
    await browser.close();
  }
  console.log(JSON.stringify(report, null, 2));
}

main().catch(async (error) => {
  report.fatal = error instanceof Error ? error.stack ?? error.message : String(error);
  await mkdir(evidence, { recursive: true }).catch(() => undefined);
  await writeFile(path.join(evidence, "export-report.json"), JSON.stringify(report, null, 2)).catch(() => undefined);
  console.error(error);
  process.exit(1);
});
