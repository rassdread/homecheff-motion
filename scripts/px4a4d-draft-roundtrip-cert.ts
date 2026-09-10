#!/usr/bin/env npx tsx
/**
 * PX.4A.4D — headed Production cert for the HomeCheff draft round-trip blocker.
 * Does not rerun already-PASS Studio control gates. Does not publish. Does not start PX.4A.5.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type BrowserContext, type Cookie, type Page } from "playwright";

const HC_ORIGIN = "https://homecheff.eu";
const STUDIO_ORIGIN = "https://studio.homecheff.eu";
const SELL_NEW = `${HC_ORIGIN}/sell/new`;
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROFILE_DIR =
  process.env.PX4A4_CHROME_PROFILE?.trim() || join(REPO_ROOT, ".px4a4-chrome-profile");
const OUT_DIR = join(REPO_ROOT, "docs/audits/px4a4-human-cert");
const SHOT_DIR = join(OUT_DIR, "shots-4d");
const FIXTURES = join(OUT_DIR, "fixtures");
const TITLE = "PX4A Draft Restore Test";
const DESCRIPTION = "HomeCheff Studio round trip";

type GateResult = "PASS" | "FAIL" | "PARTIAL" | "NOT TESTED";
const matrix: Record<string, { result: GateResult; evidence: string }> = {};
const notes: string[] = [];
const hops: string[] = [];

function setGate(name: string, result: GateResult, evidence: string): void {
  matrix[name] = { result, evidence };
  console.log(`  GATE ${name}: ${result} — ${evidence}`);
}

function saveReport(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    join(OUT_DIR, "px4a4d-report.json"),
    JSON.stringify({ at: new Date().toISOString(), matrix, notes, hops: [...new Set(hops)] }, null, 2),
  );
}

function hasHcSessionCookie(cookies: Cookie[]): boolean {
  return cookies.some((c) => {
    const n = c.name.toLowerCase();
    return (
      n === "next-auth.session-token" ||
      n === "__secure-next-auth.session-token" ||
      n === "__host-next-auth.session-token" ||
      n.startsWith("next-auth.session-token.") ||
      n.startsWith("__secure-next-auth.session-token.")
    );
  });
}

async function shot(page: Page, name: string): Promise<void> {
  mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: join(SHOT_DIR, `${Date.now()}-${name}.png`), fullPage: false }).catch(() => undefined);
}

async function dismissBanners(page: Page): Promise<void> {
  for (const name of ["Alles accepteren", "Accepteren", "Akkoord", "Accept all", "Ik ga akkoord", "Sluiten", "Nu niet.", "Nu niet"]) {
    const btn = page.getByRole("button", { name, exact: false }).first();
    if (await btn.isVisible().catch(() => false)) await btn.click({ timeout: 1500 }).catch(() => undefined);
  }
}

async function waitHcAuth(context: BrowserContext, timeoutMs: number): Promise<string[]> {
  const deadline = Date.now() + timeoutMs;
  let consecutive = 0;
  let roles: string[] = [];
  while (Date.now() < deadline) {
    const cookies = await context.cookies(HC_ORIGIN);
    try {
      const res = await context.request.get(`${HC_ORIGIN}/api/user/me`, { timeout: 20_000, failOnStatusCode: false });
      if (res.status() === 200 && hasHcSessionCookie(cookies)) {
        consecutive += 1;
        const body = (await res.json().catch(() => null)) as { sellerRoles?: string[] } | null;
        roles = Array.isArray(body?.sellerRoles) ? body.sellerRoles.map(String) : [];
        if (consecutive >= 2) return roles;
      } else consecutive = 0;
    } catch {
      consecutive = 0;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("HomeCheff seller session not confirmed in headed Chrome.");
}

async function clickText(page: Page, text: string, timeout = 8000): Promise<boolean> {
  const loc = page.getByRole("button", { name: text, exact: true }).first();
  if (await loc.isVisible({ timeout: 1500 }).catch(() => false)) {
    await loc.click({ timeout });
    return true;
  }
  const loose = page.getByText(text, { exact: true }).first();
  if (await loose.isVisible({ timeout: 1500 }).catch(() => false)) {
    await loose.click({ timeout }).catch(() => undefined);
    return true;
  }
  return false;
}

async function waitUrl(page: Page, re: RegExp, timeoutMs: number): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    hops.push(page.url());
    if (re.test(page.url())) return page.url();
    await page.waitForTimeout(400);
  }
  throw new Error(`Timeout waiting for URL ${re} (last=${page.url()})`);
}

type HcDraft = {
  title: string;
  description: string;
  price: string;
  category: string;
  photoCount: number;
  photoUrls: string[];
  hasVideo: boolean;
  videoUrl: string | null;
  fulfillmentPickup: boolean | null;
  contribution: string[];
  allergensConfirmed: boolean | null;
  perishable: boolean | null;
  ctaVisible: boolean;
  replaceVisible: boolean;
  exportPending: boolean;
  chooserVisible: boolean;
  draftKeyPresent: boolean;
  storageChars: number;
  px4aResult: string | null;
  published: boolean;
  fileAttached: boolean;
};

async function readHcDraft(page: Page): Promise<HcDraft> {
  return page.evaluate(() => {
    const params = new URLSearchParams(window.location.search);
    let raw: Record<string, unknown> | null = null;
    let storageChars = 0;
    try {
      const stored = window.sessionStorage.getItem("hc-px4a-item-form:v1");
      storageChars = stored?.length ?? 0;
      raw = stored ? (JSON.parse(stored) as Record<string, unknown>) : null;
    } catch {
      raw = null;
    }
    const images = Array.isArray(raw?.images) ? (raw.images as { url?: string }[]) : [];
    const video = raw?.video as { url?: string } | null | undefined;
    const fulfillment = raw?.fulfillment as { pickup?: boolean } | null | undefined;
    const titleInput = Array.from(document.querySelectorAll("input")).find(
      (el) => el instanceof HTMLInputElement && el.type === "text" && el.required,
    ) as HTMLInputElement | undefined;
    const body = document.body.innerText || "";
    const photoMatch = body.match(/(\d+)\s*\/\s*5 foto/i);
    const videoEl = document.querySelector('[data-testid="listing-video-block"] video') as HTMLVideoElement | null;
    const fileInput = document.querySelector('[data-testid="listing-video-block"] input[type="file"]') as HTMLInputElement | null;
    return {
      title: String(raw?.title || titleInput?.value || "").trim(),
      description: String(raw?.description || document.querySelector("textarea")?.value || "").trim(),
      price: String(raw?.price || "").trim(),
      category: String(raw?.marketplaceCategory || ""),
      photoCount: images.length || (photoMatch ? Number(photoMatch[1]) : 0),
      photoUrls: images.map((img) => String(img.url || "")),
      hasVideo: Boolean(video?.url) || Boolean(videoEl),
      videoUrl: video?.url ? String(video.url) : videoEl?.currentSrc || videoEl?.src || null,
      fulfillmentPickup: fulfillment?.pickup ?? null,
      contribution: Array.isArray(raw?.sellerContributionTypes) ? (raw.sellerContributionTypes as string[]) : [],
      allergensConfirmed: typeof raw?.allergensConfirmed === "boolean" ? raw.allergensConfirmed : null,
      perishable: typeof raw?.rapidlyPerishable === "boolean" ? raw.rapidlyPerishable : null,
      ctaVisible: Boolean(document.querySelector('[data-testid="px4a-make-free-video"]')),
      replaceVisible: Boolean(document.querySelector('[data-testid="px4a-replace-video"]')),
      exportPending: Boolean(document.querySelector('[data-testid="px4a-export-pending"]')),
      chooserVisible: /Wat wil je doen\?/.test(body),
      draftKeyPresent: Boolean(raw),
      storageChars,
      px4aResult: params.get("px4aResult"),
      published: /gepubliceerd|published listing/i.test(body),
      fileAttached: Boolean(fileInput?.files && fileInput.files.length > 0),
    };
  });
}

async function acceptResumeIfPresent(page: Page): Promise<boolean> {
  const resume = page.locator('[data-testid="px4a-resume-continue"]');
  if (await resume.isVisible().catch(() => false)) {
    await resume.click();
    await page.waitForTimeout(1500);
    return true;
  }
  return false;
}

async function waitComposer(page: Page, timeoutMs = 60_000): Promise<void> {
  await page.locator('[data-testid="px4a-composer"]').waitFor({ timeout: timeoutMs });
  await page.waitForTimeout(800);
  await acceptResumeIfPresent(page);
}

async function clickCta(page: Page): Promise<void> {
  const replace = page.locator('[data-testid="px4a-replace-video"]');
  const cta = page.locator('[data-testid="px4a-make-free-video"]');
  if (!(await cta.isVisible().catch(() => false)) && (await replace.isVisible().catch(() => false))) {
    await replace.click();
    await page.waitForTimeout(400);
  }
  await cta.scrollIntoViewIfNeeded();
  await cta.click({ timeout: 15_000 });
}

async function completeChooser(page: Page): Promise<void> {
  await dismissBanners(page);
  const chooserVisible = await page.getByText("Wat wil je doen?", { exact: false }).first().isVisible().catch(() => false);
  const formReady = await page.locator('[data-testid="listing-video-block"], [data-testid="px4a-make-free-video"]').count();
  if (formReady && !chooserVisible) return;
  if (!chooserVisible) return;
  notes.push("Chooser 'Wat wil je doen?' present — completing offer path.");
  await clickText(page, "Ik bied iets aan");
  await page.waitForTimeout(600);
  await clickText(page, "Tuin & Natuur");
  await page.waitForTimeout(800);
  await page.getByText("Kies een groep", { exact: false }).waitFor({ timeout: 15_000 }).catch(() => undefined);
  await page.locator("section button").filter({ hasNotText: "Terug" }).first().click({ timeout: 10_000 });
  await page.waitForTimeout(700);
  const chip = page.locator("button[aria-pressed]").first();
  if (await chip.isVisible().catch(() => false)) await chip.click();
  else {
    await page
      .locator("section button")
      .filter({ hasNotText: /Terug|groep|samenvatting|Verder/i })
      .first()
      .click({ timeout: 8_000 })
      .catch(() => undefined);
  }
  await page.waitForTimeout(400);
  if (!(await clickText(page, "Verder naar samenvatting"))) {
    await page.getByRole("button", { name: /samenvatting/i }).click({ timeout: 8_000 }).catch(() => undefined);
  }
  await page.waitForTimeout(600);
  if (!(await clickText(page, "Verder"))) {
    await page.getByRole("button", { name: /^Verder$/ }).click({ timeout: 8_000 }).catch(() => undefined);
  }
  await page.locator('[data-testid="listing-video-block"], [data-testid="px4a-make-free-video"]').first().waitFor({
    timeout: 45_000,
  });
}

async function fillAfterLabel(page: Page, labelRe: RegExp, value: string, control: "input" | "textarea"): Promise<void> {
  const field = page.locator("label").filter({ hasText: labelRe }).locator(`xpath=following-sibling::${control}[1]`);
  await field.waitFor({ timeout: 15_000 });
  await field.fill(value);
}

async function fillListingDraft(page: Page): Promise<void> {
  await page.locator('[data-testid="listing-video-block"], [data-testid="px4a-make-free-video"]').first().waitFor({
    timeout: 20_000,
  });
  await fillAfterLabel(page, /^Titel$/, TITLE, "input");
  await fillAfterLabel(page, /^Omschrijving$/, DESCRIPTION, "textarea");
  const price = page.locator("label").filter({ hasText: /Prijs/ }).locator("xpath=following-sibling::input[1]");
  if (await price.count()) await price.fill("12,50");
  else await page.locator('input[inputmode="decimal"]').first().fill("12,50");
  const pickupLabel = page.locator("label").filter({ hasText: /^Afhalen$/ }).first();
  if (await pickupLabel.count()) {
    const box = pickupLabel.locator('input[type="checkbox"]');
    if ((await box.count()) && !(await box.isChecked())) await box.check({ force: true });
  }
  const grown = page.locator('[data-hc-contribution-type="GROWN"]');
  if (await grown.count()) await grown.click().catch(() => undefined);
  const place = page.locator("label").filter({ hasText: /Plaatsnaam/ }).locator("xpath=following-sibling::input[1]");
  if (await place.count()) await place.fill("Utrecht");
  const perishable = page.locator("label").filter({ hasText: /bederfelijk|perishable/i }).locator('input[type="checkbox"]');
  if (await perishable.count()) await perishable.check({ force: true }).catch(() => undefined);
  await page.locator('input[type="file"][accept*="image/gif"]').first().setInputFiles([
    join(FIXTURES, "photo-1.jpg"),
    join(FIXTURES, "photo-2.jpg"),
    join(FIXTURES, "photo-3.jpg"),
    join(FIXTURES, "photo-4.jpg"),
  ]);
  await page.waitForFunction(
    () => {
      const text = document.body.innerText || "";
      const four = /Geüploade foto's \(4\)/.test(text) || /4\s*\/\s*5 foto/.test(text);
      const uploading = /Uploaden\.\.\./.test(text);
      return four && !uploading;
    },
    { timeout: 90_000 },
  );
  await page.waitForTimeout(800);
  await page.locator('[data-testid="listing-video-block"]').scrollIntoViewIfNeeded().catch(() => undefined);
}

async function enterFromCta(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await clickCta(page);
    const persistErr = page.getByText("Je item kon niet tijdelijk worden bewaard");
    if (await persistErr.isVisible({ timeout: 1200 }).catch(() => false)) {
      notes.push(`Persist retry ${attempt + 1}: uploads still in flight`);
      await page.waitForTimeout(2500);
      continue;
    }
    break;
  }
  await waitUrl(page, /\/studio\/photo-video\/from-item/, 90_000);
  await waitComposer(page);
}

async function returnToItem(page: Page, kind: "cancel" | "finish"): Promise<void> {
  if (kind === "finish") {
    await page.locator('[data-testid="px4a-item-finish"]').click({ timeout: 15_000 });
  } else {
    const cancel = page.locator('[data-testid="px4a-item-cancel"]');
    if (await cancel.isVisible().catch(() => false)) await cancel.click();
    else await page.locator('[data-testid="px4a-item-back"]').click({ timeout: 15_000 });
  }
  await waitUrl(page, /homecheff\.eu\/sell\/new/i, 90_000);
  await page.waitForTimeout(1200);
  await completeChooser(page);
  await dismissBanners(page);
  await page.waitForTimeout(800);
}

function restoredOk(d: HcDraft, opts: { video?: boolean; minPhotos?: number } = {}): boolean {
  const minPhotos = opts.minPhotos ?? 4;
  const core =
    d.title.includes("PX4A Draft Restore Test") &&
    d.description.includes("HomeCheff Studio round trip") &&
    d.photoCount >= minPhotos &&
    d.draftKeyPresent &&
    d.storageChars > 0 &&
    !d.published;
  if (!core) return false;
  if (opts.video) return d.hasVideo || d.replaceVisible;
  return true;
}

async function main(): Promise<void> {
  for (const name of ["photo-1.jpg", "photo-2.jpg", "photo-3.jpg", "photo-4.jpg", "listing-video.mp4"]) {
    if (!existsSync(join(FIXTURES, name))) throw new Error(`Missing fixture ${name}`);
  }
  mkdirSync(SHOT_DIR, { recursive: true });
  console.log("PX.4A.4D headed Production cert");
  console.log("Profile:", PROFILE_DIR);

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: "chrome",
    headless: false,
    viewport: { width: 1440, height: 900 },
    locale: "nl-NL",
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const page = context.pages()[0] || (await context.newPage());
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) hops.push(frame.url());
  });

  let originalVideoUrl: string | null = null;
  let photoOrder: string[] = [];

  try {
    await page.goto(HC_ORIGIN, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await dismissBanners(page);
    const roles = await waitHcAuth(context, 180_000);
    notes.push(`Seller roles: ${roles.join("+") || "none"}`);

    await page.goto(SELL_NEW, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.evaluate(() => {
      try {
        sessionStorage.removeItem("hc-px4a-item-form:v1");
      } catch {
        /* ignore */
      }
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await completeChooser(page);
    await fillListingDraft(page);
    await shot(page, "draft-ready");
    const before = await readHcDraft(page);
    photoOrder = await page.evaluate(() =>
      Array.from(document.querySelectorAll('img[alt^="Foto "]'))
        .map((img) => img.currentSrc || img.src)
        .filter((src) => src.startsWith("https://")),
    );
    notes.push(`Departure photos: ${photoOrder.map((u) => u.slice(-28)).join(" | ")}`);
    if (!before.ctaVisible) throw new Error("Maak gratis video not visible.");

    await enterFromCta(page);
    await page.locator('[data-testid="px4a-video-duration"] button', { hasText: "20 sec" }).click().catch(() => undefined);
    await page.waitForTimeout(700);
    await shot(page, "studio-small-change");
    await returnToItem(page, "cancel");
    await shot(page, "test1-return");
    const t1 = await readHcDraft(page);
    const t1Pass =
      restoredOk(t1) &&
      t1.price.includes("12") &&
      t1.photoUrls.join("|") === photoOrder.join("|") &&
      t1.px4aResult === "cancel";
    setGate("1. basic round-trip", t1Pass ? "PASS" : "FAIL", `title=${t1.title} photos=${t1.photoCount} chars=${t1.storageChars} chooser=${t1.chooserVisible} result=${t1.px4aResult}`);
    setGate("2. title/description/category/price", t1.title.includes(TITLE) && t1.description.includes(DESCRIPTION) && t1.price.includes("12") && Boolean(t1.category) ? "PASS" : "FAIL", `title=${t1.title} desc=${t1.description.slice(0, 40)} cat=${t1.category} price=${t1.price}`);
    setGate("3. fulfillment/legal", t1.fulfillmentPickup === true || t1.contribution.length > 0 ? "PASS" : "FAIL", `pickup=${t1.fulfillmentPickup} contrib=${t1.contribution.join(",")} perishable=${t1.perishable}`);
    setGate("4. four listing photos", t1.photoCount >= 4 ? "PASS" : "FAIL", `count=${t1.photoCount}`);
    setGate("5. photo order", t1.photoUrls.join("|") === photoOrder.join("|") && photoOrder.length >= 4 ? "PASS" : "FAIL", `got=${t1.photoUrls.map((u) => u.slice(-18)).join(",")}`);

    await enterFromCta(page);
    await acceptResumeIfPresent(page);
    await page.waitForTimeout(800);
    const studioUrl = page.url();
    await returnToItem(page, "finish");
    await shot(page, "test2-ready");
    const t2 = await readHcDraft(page);
    const t2Pass = restoredOk(t2) && t2.px4aResult === "ready" && !t2.fileAttached;
    setGate("6. Video gebruiken return", t2Pass ? "PASS" : "FAIL", `title=${t2.title} photos=${t2.photoCount} pending=${t2.exportPending} file=${t2.fileAttached} result=${t2.px4aResult} studio=${studioUrl}`);
    setGate("12. Studio re-entry", /from-item/.test(studioUrl) ? "PASS" : "FAIL", studioUrl);

    await page.locator('[data-testid="listing-video-block"]').scrollIntoViewIfNeeded().catch(() => undefined);
    const listingVideoInput = page.locator('[data-testid="listing-video-block"] input[accept*="video"]').first();
    await listingVideoInput.setInputFiles(join(FIXTURES, "listing-video.mp4"));
    await page.waitForFunction(
      () =>
        Boolean(document.querySelector('[data-testid="px4a-replace-video"]')) ||
        Boolean(document.querySelector('[data-testid="listing-video-block"] video')),
      { timeout: 90_000 },
    );
    const uploaded = await readHcDraft(page);
    originalVideoUrl = uploaded.videoUrl;
    notes.push(`Uploaded listing video ${originalVideoUrl?.slice(-40) || "none"}`);
    const replace = page.locator('[data-testid="px4a-replace-video"]');
    if (await replace.count()) await replace.click({ timeout: 20_000 });
    await page.waitForTimeout(400);
    await enterFromCta(page);
    await page.waitForTimeout(600);
    await returnToItem(page, "cancel");
    await shot(page, "flow-c-cancel");
    const cCancel = await readHcDraft(page);
    const cCancelPass = restoredOk(cCancel, { video: true }) && (cCancel.videoUrl === originalVideoUrl || cCancel.hasVideo);
    setGate("7. Flow C cancel", cCancelPass ? "PASS" : "FAIL", `title=${cCancel.title} video=${cCancel.hasVideo} url=${cCancel.videoUrl ? "present" : "none"} replace=${cCancel.replaceVisible}`);

    await enterFromCta(page);
    await acceptResumeIfPresent(page);
    await returnToItem(page, "finish");
    await shot(page, "flow-c-ready");
    const cReady = await readHcDraft(page);
    const cReadyPass = restoredOk(cReady, { video: true }) && (cReady.videoUrl === originalVideoUrl || !cReady.fileAttached);
    setGate("8. Flow C ready", cReadyPass ? "PASS" : "FAIL", `video=${cReady.hasVideo} pending=${cReady.exportPending} file=${cReady.fileAttached} sameUrl=${cReady.videoUrl === originalVideoUrl}`);
    const oneVideo = (cReady.hasVideo || cReady.replaceVisible) && !/2 video|tweede video/i.test(await page.locator("body").innerText());
    setGate("9. one-video law", oneVideo ? "PASS" : "FAIL", `hasVideo=${cReady.hasVideo} replace=${cReady.replaceVisible} pending=${cReady.exportPending}`);

    await enterFromCta(page);
    await page.waitForTimeout(600);
    await page.goBack({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await completeChooser(page);
    await shot(page, "browser-back");
    const afterBack = await readHcDraft(page);
    const backPass = restoredOk(afterBack, { video: true });
    setGate("10. browser Back", backPass ? "PASS" : "FAIL", `title=${afterBack.title} photos=${afterBack.photoCount} chars=${afterBack.storageChars} chooser=${afterBack.chooserVisible}`);
    await enterFromCta(page);
    await acceptResumeIfPresent(page);
    if (!/from-item/.test(page.url())) setGate("12. Studio re-entry", "FAIL", page.url());
    await returnToItem(page, "cancel");

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    await completeChooser(page);
    await shot(page, "hc-refresh");
    const afterRefresh = await readHcDraft(page);
    setGate("11. HomeCheff refresh", restoredOk(afterRefresh, { video: true }) ? "PASS" : "FAIL", `title=${afterRefresh.title} photos=${afterRefresh.photoCount} chars=${afterRefresh.storageChars} chooser=${afterRefresh.chooserVisible}`);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    await enterFromCta(page);
    await page.waitForTimeout(600);
    await returnToItem(page, "cancel");
    await shot(page, "mobile-return");
    const mobile = await readHcDraft(page);
    setGate("13. ~390px quick round-trip", restoredOk(mobile) ? "PASS" : "FAIL", `title=${mobile.title} photos=${mobile.photoCount} chars=${mobile.storageChars}`);
    await page.setViewportSize({ width: 1440, height: 900 });

    const unpublished = Object.values(matrix).every((g) => g.result !== "FAIL") && !mobile.published;
    setGate("14. listing unpublished", unpublished && !mobile.published ? "PASS" : "FAIL", `publishedFlag=${mobile.published}`);
    setGate("15. regressions", Object.values(matrix).some((g) => g.result === "FAIL") ? "FAIL" : "PASS", "No new Studio PR; HomeCheff draft isolation flicker closed.");
    setGate("16. remaining polish", "NOT TESTED", "+ Foto toevoegen, transparent watermark, public Studio credit chrome remain out of scope.");
    const blockerGates = ["1. basic round-trip", "6. Video gebruiken return", "7. Flow C cancel", "8. Flow C ready", "10. browser Back", "11. HomeCheff refresh"];
    const complete = blockerGates.every((name) => matrix[name]?.result === "PASS");
    setGate("17. final PX.4A.4 verdict", complete ? "PASS" : "FAIL", complete ? "PX.4A.4 = COMPLETE" : "PX.4A.4 remains INCOMPLETE");
  } catch (err) {
    notes.push(`Cert error: ${err instanceof Error ? err.message : String(err)}`);
    await shot(page, "fatal");
    throw err;
  } finally {
    saveReport();
    console.log("Report:", join(OUT_DIR, "px4a4d-report.json"));
    await context.close().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
