/**
 * Follow-up certification: audio timing, zero-HC navigation, historical open, layout.
 * Disposable local database only. No paid provider calls.
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
const scene2 = "cmvrdnblh000bdh92jjl4bhrb";
const storyboardId = "cmvrdlcet0007dh92f8qonc00";
const evidence = path.resolve("docs/studio-v27-3/evidence");
const report: Record<string, unknown> = {};

function assertLocal() {
  const url = new URL(process.env.DATABASE_URL || "");
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/homecheff_studio_v27_2_test") {
    throw new Error("Certification refused a non-disposable database.");
  }
}

async function wallets() {
  const { stdout } = await execFileAsync("/opt/homebrew/bin/psql", [
    "-h", "127.0.0.1", "-p", "5432", "-d", "homecheff_studio_v27_2_test", "-t", "-A", "-F", "|",
    "-c",
    `SELECT u.email, w.balance, w."promotionalBalance", w."lifetimeSpent"
     FROM "StudioWallet" w JOIN "User" u ON u.id = w."userId"
     WHERE u.email LIKE 'v272-user-%'
     ORDER BY u.email;`,
  ]);
  return stdout.trim();
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

async function overflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

async function loadedText(page: Page) {
  const text = await page.locator("body").innerText();
  return {
    loading: text.includes("Loading workspace"),
    sample: text.replace(/\s+/g, " ").slice(0, 240),
  };
}

async function main() {
  assertLocal();
  await mkdir(evidence, { recursive: true });
  report.walletsBefore = await wallets();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  await login(page, "v272-user-a@studio.local.test");

  await page.goto(`${base}/studio/projects/${projectId}?section=timeline&workflow=film`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="film-timeline-play"]').waitFor();
  await page.locator('[data-testid="film-timeline-seek"]').fill("5600");
  await page.locator('[data-testid="film-timeline-seek"]').evaluate((node) => {
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.locator('[data-testid="film-timeline-play"]').evaluate((node) => (node as HTMLButtonElement).click());
  await page.waitForTimeout(1200);
  report.mixAtScene2 = await page.locator('[data-testid="film-timeline-audio"]').evaluate((node) => ({
    markers: (node as HTMLElement).dataset.markers ?? "",
    mixMuted: (node as HTMLElement).dataset.mixMuted ?? "",
    mixPaused: (node as HTMLElement).dataset.mixPaused ?? "",
    mixTime: (node as HTMLElement).dataset.mixTime ?? "",
    mixSrc: (node as HTMLElement).dataset.mixSrc ?? "",
    clock: document.querySelector('[data-testid="film-timeline-clock"]')?.textContent ?? "",
    clockMs: document.querySelector('[data-testid="film-timeline-clock"]')?.getAttribute("data-ms") ?? "",
  }));
  const mixSrc = String((report.mixAtScene2 as { mixSrc?: string }).mixSrc ?? "");
  if (mixSrc) {
    report.mixRms = await page.evaluate(async (src) => {
      const response = await fetch(src);
      const bytes = await response.arrayBuffer();
      const context = new AudioContext();
      const decoded = await context.decodeAudioData(bytes.slice(0));
      const channel = decoded.getChannelData(0);
      let sum = 0;
      let count = 0;
      for (let index = 0; index < channel.length; index += 40) {
        sum += channel[index] * channel[index];
        count += 1;
      }
      await context.close();
      return { rms: Math.sqrt(sum / Math.max(1, count)), seconds: decoded.duration, status: response.status };
    }, mixSrc);
  }

  const widths = [1440, 1280, 1080, 1024, 768, 390, 360];
  const pages: Array<{ name: string; url: string }> = [
    { name: "scenes", url: `${base}/studio/projects/${projectId}?section=scenes&workflow=film&scene=${scene2}` },
    { name: "characters", url: `${base}/studio/projects/${projectId}?section=characters&workflow=film` },
    { name: "media", url: `${base}/studio/projects/${projectId}?section=media&workflow=film` },
    { name: "wizard", url: `${base}/studio/photo-video?projectId=${projectId}&scene=${scene2}&storyboardId=${storyboardId}&idea=The+guide+prepares+the+product&returnTo=${encodeURIComponent(`/studio/projects/${projectId}?section=scenes&workflow=film&scene=${scene2}`)}` },
    { name: "voice", url: `${base}/studio/audio/create?mode=voice&projectId=${projectId}&scene=${scene2}&storyboardId=${storyboardId}&returnTo=${encodeURIComponent(`/studio/projects/${projectId}?section=scenes&workflow=film&scene=${scene2}`)}` },
    { name: "music", url: `${base}/studio/audio/create?mode=music&projectId=${projectId}&scene=${scene2}&storyboardId=${storyboardId}&returnTo=${encodeURIComponent(`/studio/projects/${projectId}?section=scenes&workflow=film&scene=${scene2}`)}` },
    { name: "sfx", url: `${base}/studio/audio/create?mode=sfx&projectId=${projectId}&scene=${scene2}&storyboardId=${storyboardId}&returnTo=${encodeURIComponent(`/studio/projects/${projectId}?section=scenes&workflow=film&scene=${scene2}`)}` },
    { name: "timeline", url: `${base}/studio/projects/${projectId}?section=timeline&workflow=film` },
    { name: "export", url: `${base}/studio/projects/${projectId}?section=export&workflow=film` },
  ];
  const layout: Record<string, { overflow: number; loading: boolean; sample: string }> = {};
  for (const item of pages) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(item.url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    const state = await loadedText(page);
    await page.screenshot({ path: path.join(evidence, `layout-${item.name}-1440.png`) });
    for (const width of widths) {
      await page.setViewportSize({ width, height: width < 800 ? 800 : 900 });
      const extra = await overflow(page);
      layout[`${item.name}-${width}`] = { overflow: extra, loading: state.loading, sample: width === 1440 ? state.sample : "" };
    }
  }
  report.layout = layout;

  for (const kind of ["image", "animation"] as const) {
    const id = kind === "image" ? "v273-hist-image-0001" : "cmv273histanim0001";
    await page.goto(`${base}/studio/open/${kind}/${id}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    report[`history_${kind}`] = {
      url: page.url(),
      ...(await loadedText(page)),
    };
    await page.screenshot({ path: path.join(evidence, `history-${kind}-1440.png`) });
  }
  await page.goto(`${base}/studio/projects/${projectId}?section=scenes&workflow=film`, { waitUntil: "domcontentloaded" });
  report.historyFilm = { url: page.url(), ...(await loadedText(page)) };
  await page.goto(`${base}/studio/open/storyboard/${storyboardId}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  report.historyStoryboard = { url: page.url(), ...(await loadedText(page)) };

  const userC = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const cPage = await userC.newPage();
  await login(cPage, "v272-user-c@studio.local.test");
  await cPage.goto(`${base}/studio`, { waitUntil: "domcontentloaded" });
  const box = cPage.locator('[data-testid="studio-ai-home-composer"]').last();
  const prompt = "V273 Zero HC film. A short free editing check.";
  await cPage.evaluate(() => sessionStorage.clear());
  const field = box.getByTestId("studio-ai-home-prompt");
  await field.waitFor();
  await field.fill(prompt);
  await box.getByTestId("studio-ai-home-submit").evaluate((node) => (node as HTMLButtonElement).click());
  const confirm = box.getByTestId("studio-ai-home-confirm");
  report.zeroConfirmVisible = await confirm.waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
  if (report.zeroConfirmVisible) {
    report.zeroSummary = await box.getByTestId("studio-ai-home-confirm-summary").innerText();
    await box.getByTestId("studio-ai-home-confirm-make").evaluate((node) => (node as HTMLButtonElement).click());
    await cPage.waitForURL(/\/studio\/projects\//, { timeout: 25000, waitUntil: "commit" }).catch(() => undefined);
  } else {
    report.zeroPageSample = (await cPage.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 400);
  }
  report.zeroUrl = cPage.url();
  report.zeroCreated = cPage.url().includes("/studio/projects/");
  await cPage.screenshot({ path: path.join(evidence, "zero-hc-1440.png") });
  if (report.zeroCreated) {
    const zeroProject = cPage.url().split("/studio/projects/")[1]?.split("?")[0] ?? "";
    report.zeroProject = zeroProject;
    if (/^[A-Za-z0-9]+$/.test(zeroProject)) {
      const { stdout } = await execFileAsync("/opt/homebrew/bin/psql", [
        "-h", "127.0.0.1", "-p", "5432", "-d", "homecheff_studio_v27_2_test", "-t", "-A",
        "-c",
        `SELECT s.id FROM "StudioScene" s JOIN "StudioCreativeProject" p ON p."storyboardId" = s."storyboardId" WHERE p.id = '${zeroProject}' ORDER BY s."order" LIMIT 1;`,
      ]);
      const sceneId = stdout.trim();
      report.zeroSceneId = sceneId;
      if (sceneId) {
        const quote = await userC.request.post(`${base}/api/studio/projects/${zeroProject}/scenes/${sceneId}/dialogue`, {
          data: { action: "quote" },
        });
        report.zeroQuoteStatus = quote.status();
        report.zeroQuote = await quote.json();
      }
    }
  }

  report.walletsAfter = await wallets();
  await writeFile(path.join(evidence, "followup-report.json"), JSON.stringify(report, null, 2));
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}

main().catch(async (error) => {
  report.fatal = error instanceof Error ? error.message : "failed";
  await mkdir(evidence, { recursive: true });
  await writeFile(path.join(evidence, "followup-report.json"), JSON.stringify(report, null, 2));
  console.error(report.fatal);
  process.exit(1);
});
