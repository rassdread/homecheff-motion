/**
 * Browser audio-element certification for the saved V27.3 film.
 * Measures HTMLAudioElement currentTime. Does not call a provider.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "playwright";

const base = "http://127.0.0.1:3462";
const password = "v272-local-only-password";
const projectId = "cmvrdlbwg0005dh92s468jz8g";
const evidence = path.resolve("docs/studio-v27-3-1/evidence");
const report: Record<string, unknown> = { mechanism: "HTMLAudioElement" };

function assertLocal() {
  const url = new URL(process.env.DATABASE_URL || "");
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/homecheff_studio_v27_2_test") {
    throw new Error("Certification refused a non-disposable database.");
  }
}

async function login(page: Page) {
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
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

async function readProbe(page: Page) {
  return page.locator('[data-testid="film-timeline-audio"]').evaluate((node) => {
    const clock = document.querySelector('[data-testid="film-timeline-clock"]');
    return {
      clockMs: Number(clock?.getAttribute("data-ms") ?? "0"),
      clock: clock?.textContent ?? "",
      markers: (node as HTMLElement).dataset.markers ?? "",
      mixPaused: (node as HTMLElement).dataset.mixPaused ?? "",
    };
  });
}

function parse(markers: string) {
  return markers.split("|").filter(Boolean).map((part) => {
    const [type, state, position, gate, volume, ready, seeking, paused] = part.split(":");
    return {
      type,
      on: state === "on",
      positionMs: Number(position),
      gate,
      volume: Number(volume),
      ready: Number(ready),
      seeking: seeking === "1",
      paused: paused === "1",
    };
  });
}

async function waitClock(page: Page, min: number, max: number) {
  await page.waitForFunction((bounds) => {
    const ms = Number(document.querySelector('[data-testid="film-timeline-clock"]')?.getAttribute("data-ms") ?? "0");
    return ms >= bounds.min && ms <= bounds.max;
  }, { min, max }, { timeout: 30000 });
}

async function main() {
  assertLocal();
  await mkdir(evidence, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  page.setDefaultTimeout(120000);
  page.setDefaultNavigationTimeout(120000);
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await login(page);
  await page.goto(`${base}/studio/projects/${projectId}?section=timeline&workflow=film`, { waitUntil: "commit", timeout: 120000 });
  try {
    await page.locator('[data-testid="film-timeline-play"]').waitFor({ timeout: 120000 });
  } catch (error) {
    report.pageErrors = pageErrors.slice(0, 6);
    report.pageText = (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 600);
    await page.screenshot({ path: path.join(evidence, "audio-timeline-load-fail.png") }).catch(() => undefined);
    throw error;
  }
  await page.locator('[data-testid="film-timeline-play"]').evaluate((node) => (node as HTMLButtonElement).click());

  await waitClock(page, 1500, 4200);
  const before = await readProbe(page);
  report.beforeScene2 = { ...before, stems: parse(String(before.markers)) };

  await waitClock(page, 5600, 7200);
  const during = await readProbe(page);
  await page.waitForTimeout(700);
  const duringLater = await readProbe(page);
  report.duringScene2 = { first: { ...during, stems: parse(String(during.markers)) }, later: { ...duringLater, stems: parse(String(duringLater.markers)) } };

  await waitClock(page, 8400, 9800);
  const afterSfx = await readProbe(page);
  report.afterSfx = { ...afterSfx, stems: parse(String(afterSfx.markers)) };

  await page.locator('[data-testid="film-timeline-play"]').evaluate((node) => (node as HTMLButtonElement).click());
  await page.waitForTimeout(500);
  const pausedA = await readProbe(page);
  await page.waitForTimeout(600);
  const pausedB = await readProbe(page);
  report.pause = { first: pausedA, second: pausedB, clockHeld: Math.abs(Number(pausedB.clockMs) - Number(pausedA.clockMs)) < 80 };

  await page.locator('[data-testid="film-timeline-play"]').evaluate((node) => (node as HTMLButtonElement).click());
  await page.waitForTimeout(800);
  const resumed = await readProbe(page);
  report.resume = { ...resumed, stems: parse(String(resumed.markers)), clockAdvanced: Number(resumed.clockMs) > Number(pausedB.clockMs) + 200 };

  await page.locator('[data-testid="film-timeline-seek"]').fill("1600");
  await page.locator('[data-testid="film-timeline-seek"]').evaluate((node) => {
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.locator('[data-testid="film-timeline-play"]').evaluate((node) => (node as HTMLButtonElement).click());
  await waitClock(page, 1800, 3600);
  const seekBack = await readProbe(page);
  report.seekBackward = { ...seekBack, stems: parse(String(seekBack.markers)) };

  await page.locator('[data-testid="film-timeline-seek"]').fill("6100");
  await page.locator('[data-testid="film-timeline-seek"]').evaluate((node) => {
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.locator('[data-testid="film-timeline-play"]').evaluate((node) => (node as HTMLButtonElement).click());
  await page.waitForTimeout(900);
  const seekForward = await readProbe(page);
  report.seekForward = { ...seekForward, stems: parse(String(seekForward.markers)) };

  const end = Number(await page.locator('[data-testid="film-timeline-seek"]').getAttribute("max"));
  await page.locator('[data-testid="film-timeline-seek"]').fill(String(Math.max(0, end - 800)));
  await page.locator('[data-testid="film-timeline-seek"]').evaluate((node) => {
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.locator('[data-testid="film-timeline-play"]').evaluate((node) => (node as HTMLButtonElement).click());
  await page.waitForFunction((max) => {
    const ms = Number(document.querySelector('[data-testid="film-timeline-clock"]')?.getAttribute("data-ms") ?? "0");
    return ms >= max - 200;
  }, end, { timeout: 15000 }).catch(() => undefined);
  report.completion = await readProbe(page);
  report.filmEndMs = end;
  await page.screenshot({ path: path.join(evidence, "audio-timeline-1440.png") });
  await page.setViewportSize({ width: 390, height: 800 });
  const overflow390 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await page.screenshot({ path: path.join(evidence, "audio-timeline-390.png") });
  report.overflow390 = overflow390;

  await writeFile(path.join(evidence, "audio-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch(async (error) => {
  report.fatal = error instanceof Error ? error.message : "failed";
  await mkdir(evidence, { recursive: true });
  await writeFile(path.join(evidence, "audio-report.json"), JSON.stringify(report, null, 2));
  console.error(report.fatal);
  process.exit(1);
});
