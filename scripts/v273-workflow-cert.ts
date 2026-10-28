/**
 * Authenticated browser certification for the V27.3 film connections.
 * Uses the disposable local database and synthetic files only.
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
const storyboardId = "cmvrdlcet0007dh92f8qonc00";
const scene2 = "cmvrdnblh000bdh92jjl4bhrb";
const media = "/tmp/homecheff-studio-v27-2-cert-media";
const evidence = path.resolve("docs/studio-v27-3/evidence");
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
  const posted = page.waitForResponse((response) => response.url().includes("/api/auth/login") && response.request().method() === "POST", { timeout: 20000 }).catch(() => null);
  await button.evaluate((node) => (node as HTMLButtonElement).click());
  const response = await posted;
  if (!response?.ok()) {
    const status = await page.evaluate(async (input) => {
      const next = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      return next.status;
    }, { email, password });
    if (status !== 200) throw new Error(`Login for ${email} failed`);
  }
  if (page.url().includes("/login")) await page.goto(`${base}/studio`, { waitUntil: "domcontentloaded" });
}

async function clickText(page: Page, text: string) {
  await page.evaluate((label) => {
    const nodes = Array.from(document.querySelectorAll("a,button"));
    const node = nodes.find((item) => item.textContent?.trim() === label);
    (node as HTMLElement | undefined)?.click();
  }, text);
}

async function overflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

async function sceneRows() {
  const { stdout } = await execFileAsync("/opt/homebrew/bin/psql", [
    "-h", "127.0.0.1", "-p", "5432", "-d", "homecheff_studio_v27_2_test", "-t", "-A", "-F", "|",
    "-c",
    `SELECT s."order", s.title, COALESCE(s."selectedSceneImageId", ''), COALESCE(i."imageUrl", '')
     FROM "StudioScene" s
     LEFT JOIN "StudioSceneImage" i ON i.id = s."selectedSceneImageId"
     WHERE s."storyboardId" = '${storyboardId}'
     ORDER BY s."order";`,
  ]);
  return stdout.trim().split("\n").filter(Boolean);
}

async function main() {
  assertLocal();
  await mkdir(evidence, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  await login(page, "v272-user-a@studio.local.test");
  await page.goto(`${base}/studio/projects/${projectId}?section=scenes&workflow=film&scene=${scene2}`, { waitUntil: "domcontentloaded" });
  await page.getByText("Main action").first().waitFor();
  await clickText(page, "Main action");
  await page.locator(`a[href*="scene=${scene2}"][href*="/studio/photo-video"]`).waitFor();
  await page.locator(`a[href*="scene=${scene2}"][href*="/studio/photo-video"]`).evaluate((node) => (node as HTMLAnchorElement).click());
  await page.waitForURL(/\/studio\/photo-video/, { timeout: 45000, waitUntil: "commit" });
  report.wizardUrl = page.url();
  await page.locator('[data-testid="px4a-file-input"]').waitFor({ state: "attached" });
  const ideaVisible = await page.locator('[data-testid="studio-v23-preserved-idea"]').textContent().catch(() => "");
  report.wizardIdea = ideaVisible;
  await page.locator('[data-testid="px4a-file-input"]').setInputFiles(path.join(media, "kitchen.png"));
  await page.waitForFunction(() => {
    const node = document.querySelector('[data-testid="studio-v273-upload-status"]');
    return Boolean(node && (node.textContent ?? "").trim().length > 0);
  });
  report.uploadStatus = await page.locator('[data-testid="studio-v273-upload-status"]').innerText();
  report.uploadUrl = await page.locator('[data-testid="studio-v273-upload-url"]').innerText().catch(() => "");
  const previewCount = await page.locator("img").count();
  report.wizardPreviewImages = previewCount;
  await page.screenshot({ path: path.join(evidence, "wizard-upload-1440.png") });
  await page.locator('[data-testid="studio-v273-use-on-scene"]').evaluate((node) => (node as HTMLButtonElement).click());
  await page.waitForURL(/section=scenes/, { timeout: 30000, waitUntil: "commit" });
  report.returnedUrl = page.url();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByText("Main action").first().waitFor();
  report.sceneRowsAfterRefresh = await sceneRows();
  await page.screenshot({ path: path.join(evidence, "scene-return-1440.png") });

  await clickText(page, "Main action");
  await page.locator('[data-testid="studio-v273-browse-library"]').evaluate((node) => (node as HTMLButtonElement).click());
  await page.waitForTimeout(1500);
  const libraryButtons = await page.locator('[data-testid^="studio-v273-attach-asset-"]').count();
  report.libraryChoices = libraryButtons;
  if (libraryButtons > 0) {
    await page.locator('[data-testid^="studio-v273-attach-asset-"]').first().evaluate((node) => (node as HTMLButtonElement).click());
    await page.waitForTimeout(1500);
    await page.reload({ waitUntil: "domcontentloaded" });
    report.sceneRowsAfterLibrary = await sceneRows();
  }

  await page.goto(`${base}/studio/projects/${projectId}?section=scenes&workflow=film&scene=${scene2}`, { waitUntil: "domcontentloaded" });
  await page.locator(`a[href*="scene=${scene2}"][href*="tool=voice"]`).waitFor();
  await page.locator(`a[href*="scene=${scene2}"][href*="tool=voice"]`).evaluate((node) => (node as HTMLAnchorElement).click());
  await page.waitForURL(/mode=voice/, { timeout: 40000, waitUntil: "commit" });
  await page.locator('[data-testid="studio-v27-voice-form"]').waitFor({ timeout: 20000 });
  const voiceText = await page.locator("body").innerText();
  report.voiceFormVisible = voiceText.includes("script") || (await page.locator('[data-testid="studio-v27-voice-script"]').count()) > 0;
  report.voiceStillLoading = voiceText.includes("Loading workspace");
  report.voiceQuote = await page.locator('[data-testid="studio-v27-audio-quote"]').innerText();
  report.voiceRequest = await page.locator('[data-testid="studio-v27-voice-request"]').innerText();
  await page.screenshot({ path: path.join(evidence, "voice-form-1440.png") });
  await page.locator('[data-testid="studio-v273-audio-file"]').setInputFiles(path.join(media, "voice.wav"));
  await page.waitForURL(/section=scenes/, { timeout: 30000, waitUntil: "commit" });
  report.voiceReturned = page.url();

  await page.goto(`${base}/studio/projects/${projectId}?section=scenes&workflow=film&scene=${scene2}`, { waitUntil: "domcontentloaded" });
  await page.locator(`a[href*="scene=${scene2}"][href*="tool=music"]`).waitFor();
  await page.locator(`a[href*="scene=${scene2}"][href*="tool=music"]`).evaluate((node) => (node as HTMLAnchorElement).click());
  await page.waitForURL(/mode=music/, { timeout: 40000, waitUntil: "commit" });
  report.musicPanel = await page.locator("body").innerText().then((text) => text.includes("Loading workspace") ? "loading" : "loaded");
  await page.locator('[data-testid="studio-v273-audio-file"]').setInputFiles(path.join(media, "music-tone.wav"));
  await page.waitForURL(/section=scenes/, { timeout: 30000, waitUntil: "commit" });
  report.musicReturned = page.url();

  await page.goto(`${base}/studio/projects/${projectId}?section=scenes&workflow=film&scene=${scene2}`, { waitUntil: "domcontentloaded" });
  await page.locator(`a[href*="scene=${scene2}"][href*="tool=sound"]`).waitFor();
  await page.locator(`a[href*="scene=${scene2}"][href*="tool=sound"]`).evaluate((node) => (node as HTMLAnchorElement).click());
  await page.waitForURL(/mode=sfx/, { timeout: 40000, waitUntil: "commit" });
  await page.locator('[data-testid="studio-v273-audio-file"]').setInputFiles(path.join(media, "sfx-tone.wav"));
  await page.waitForURL(/section=scenes/, { timeout: 30000, waitUntil: "commit" });
  report.sfxReturned = page.url();

  await page.goto(`${base}/studio/projects/${projectId}?section=timeline&workflow=film`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="film-timeline-play"]').waitFor({ timeout: 30000 });
  await page.locator('[data-testid="film-timeline-play"]').evaluate((node) => (node as HTMLButtonElement).click());
  await page.waitForTimeout(2500);
  const probe = await page.locator('[data-testid="film-timeline-audio"]').evaluate((node) => ({
    markers: (node as HTMLElement).dataset.markers ?? "",
    mixMuted: (node as HTMLElement).dataset.mixMuted ?? "",
    mixPaused: (node as HTMLElement).dataset.mixPaused ?? "",
    mixVolume: (node as HTMLElement).dataset.mixVolume ?? "",
    mixTime: (node as HTMLElement).dataset.mixTime ?? "",
    mixSrc: (node as HTMLElement).dataset.mixSrc ?? "",
  }));
  report.audioProbe = probe;
  if (probe.mixSrc) {
    report.audioRms = await page.evaluate(async (src) => {
      const response = await fetch(src);
      const bytes = await response.arrayBuffer();
      const context = new AudioContext();
      const decoded = await context.decodeAudioData(bytes.slice(0));
      const channel = decoded.getChannelData(0);
      let sum = 0;
      const step = 40;
      let count = 0;
      for (let index = 0; index < channel.length; index += step) {
        sum += channel[index] * channel[index];
        count += 1;
      }
      await context.close();
      return { rms: Math.sqrt(sum / Math.max(1, count)), samples: channel.length, status: response.status };
    }, probe.mixSrc);
  }
  const end = Number(await page.locator('[data-testid="film-timeline-seek"]').getAttribute("max"));
  await page.locator('[data-testid="film-timeline-seek"]').fill(String(Math.max(0, end - 400)));
  await page.locator('[data-testid="film-timeline-play"]').evaluate((node) => (node as HTMLButtonElement).click());
  await page.waitForFunction(() => {
    const clock = document.querySelector('[data-testid="film-timeline-clock"]');
    const max = Number(document.querySelector('[data-testid="film-timeline-seek"]')?.getAttribute("max") ?? "0");
    return Number(clock?.getAttribute("data-ms") ?? "0") >= max - 200;
  }, { timeout: 15000 }).catch(() => undefined);
  report.clock = await page.locator('[data-testid="film-timeline-clock"]').innerText();
  report.clockMs = await page.locator('[data-testid="film-timeline-clock"]').getAttribute("data-ms");
  const video = page.locator('[data-testid="film-timeline-video"]');
  report.videoReady = await video.evaluate((node) => (node as HTMLVideoElement).readyState).catch(() => 0);
  await page.screenshot({ path: path.join(evidence, "timeline-preview-1440.png") });

  const widths = [1440, 1280, 1080, 1024, 768, 390, 360];
  const layout: Record<string, number> = {};
  for (const width of widths) {
    await page.setViewportSize({ width, height: width < 800 ? 800 : 900 });
    layout[`timeline-${width}`] = await overflow(page);
  }
  await page.setViewportSize({ width: 390, height: 800 });
  await page.screenshot({ path: path.join(evidence, "timeline-390.png") });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="studio-ai-home-composer"]').last().waitFor({ timeout: 30000 });
  report.homeComposer = true;
  await page.screenshot({ path: path.join(evidence, "home-1440.png") });
  for (const width of widths) {
    await page.setViewportSize({ width, height: width < 800 ? 800 : 900 });
    layout[`home-${width}`] = await overflow(page);
  }
  report.layout = layout;

  const userB = await browser.newContext();
  const bPage = await userB.newPage();
  await login(bPage, "v272-user-b@studio.local.test");
  const imageUrl = String(report.uploadUrl || "");
  const denied = await userB.request.post(`${base}/api/studio/projects/${projectId}/scenes/${scene2}/attach-media`, {
    data: { imageUrl },
  });
  report.userBAttachStatus = denied.status();

  const userC = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const cPage = await userC.newPage();
  await login(cPage, "v272-user-c@studio.local.test");
  await cPage.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  const composer = cPage.locator('[data-testid="studio-ai-home-composer"]').last();
  await composer.waitFor();
  const prompt = "V27.3 zero HC film. A free three scene project with no paid generation.";
  await composer.locator("textarea").first().fill(prompt);
  await composer.locator("textarea").first().evaluate((node) => node.dispatchEvent(new Event("input", { bubbles: true })));
  await cPage.waitForTimeout(800);
  const confirm = composer.locator('[data-testid="studio-ai-home-confirm-make"]');
  report.zeroConfirmVisible = await confirm.isVisible().catch(() => false);
  if (report.zeroConfirmVisible) {
    await confirm.evaluate((node) => (node as HTMLButtonElement).click());
    await cPage.waitForURL(/\/studio\/projects\//, { timeout: 25000, waitUntil: "commit" }).catch(() => undefined);
  }
  report.zeroUrl = cPage.url();
  report.zeroCreated = cPage.url().includes("/studio/projects/");

  await writeFile(path.join(evidence, "workflow-report.json"), JSON.stringify(report, null, 2));
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}

main().catch(async (error) => {
  report.fatal = error instanceof Error ? error.message : "failed";
  await mkdir(evidence, { recursive: true });
  await writeFile(path.join(evidence, "workflow-report.json"), JSON.stringify(report, null, 2));
  console.error(report.fatal);
  process.exit(1);
});
