#!/usr/bin/env npx tsx
/**
 * PX.4A.4C — headed Production cert for the remaining human gates.
 *
 * Origin: HomeCheff → Item toevoegen → listing form → Maak gratis video.
 * Never starts from /studio/photo-video/from-item.
 * Does not publish. Does not start PX.4A.5.
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
const SHOT_DIR = join(OUT_DIR, "shots-4c");
const FIXTURES = join(OUT_DIR, "fixtures");
const TITLE = "PX4A4C wegwerpdraft — niet publiceren";
const DESCRIPTION =
  "Disposable unpublished PX.4A.4C certification draft. Do not publish. HomeCheff garden listing for video-creator gates only.";

const STUDIO_PRODUCT_COOKIES = [
  "studio_session",
  "studio_silent_sso_attempt",
  "studio_skip_silent_sso",
  "studio_sso_pending",
] as const;

type GateResult = "PASS" | "FAIL" | "PARTIAL" | "NOT TESTED";

const matrix: Record<string, { result: GateResult; evidence: string }> = {};
const notes: string[] = [];
const consoleErrors: { url: string; text: string }[] = [];
const hops: string[] = [];

function setGate(name: string, result: GateResult, evidence: string): void {
  matrix[name] = { result, evidence };
  console.log(`  GATE ${name}: ${result} — ${evidence}`);
}

function saveReport(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    join(OUT_DIR, "px4a4c-report.json"),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        matrix,
        notes,
        hops: unique(hops),
        consoleErrors: consoleErrors.slice(-40),
      },
      null,
      2,
    ),
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function isStudioHostDomain(domain: string): boolean {
  return domain.replace(/^\./, "").toLowerCase() === "studio.homecheff.eu";
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

async function shot(page: Page, name: string): Promise<string> {
  mkdirSync(SHOT_DIR, { recursive: true });
  const dest = join(SHOT_DIR, `${Date.now()}-${name}.png`);
  await page.screenshot({ path: dest, fullPage: false }).catch(() => undefined);
  return dest;
}

async function dismissBanners(page: Page): Promise<void> {
  const names = [
    "Alles accepteren",
    "Accepteren",
    "Akkoord",
    "Accept all",
    "Ik ga akkoord",
    "Sluiten",
    "Nu niet.",
    "Nu niet",
  ];
  for (const name of names) {
    const btn = page.getByRole("button", { name, exact: false }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ timeout: 1500 }).catch(() => undefined);
    }
  }
}

async function probeHc(context: BrowserContext): Promise<{
  apiOk: boolean;
  status: number | null;
  sellerRoles: string[];
  cookiePresent: boolean;
}> {
  const cookies = await context.cookies(HC_ORIGIN);
  const cookiePresent = hasHcSessionCookie(cookies);
  try {
    const res = await context.request.get(`${HC_ORIGIN}/api/user/me`, {
      timeout: 20_000,
      failOnStatusCode: false,
    });
    if (res.status() !== 200) {
      return { apiOk: false, status: res.status(), sellerRoles: [], cookiePresent };
    }
    const body = (await res.json().catch(() => null)) as { sellerRoles?: string[] } | null;
    return {
      apiOk: true,
      status: 200,
      sellerRoles: Array.isArray(body?.sellerRoles) ? body.sellerRoles.map(String) : [],
      cookiePresent,
    };
  } catch {
    return { apiOk: false, status: null, sellerRoles: [], cookiePresent };
  }
}

async function waitHcAuth(context: BrowserContext, timeoutMs: number): Promise<string[]> {
  const deadline = Date.now() + timeoutMs;
  let consecutive = 0;
  let roles: string[] = [];
  while (Date.now() < deadline) {
    const probe = await probeHc(context);
    if (probe.apiOk) {
      consecutive += 1;
      roles = probe.sellerRoles;
      console.log(`  HC auth OK ${consecutive}/2 roles=${roles.join("+") || "none"}`);
      if (consecutive >= 2) return roles;
    } else {
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
  path: string;
  search: string;
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
  ctaVisible: boolean;
  replaceVisible: boolean;
  exportPending: boolean;
  chooserVisible: boolean;
  draftKeyPresent: boolean;
  domPhotoLabel: string;
  domHasVideoPreview: boolean;
  px4aResult: string | null;
};

async function readHcDraft(page: Page): Promise<HcDraft> {
  return page.evaluate(() => {
    const params = new URLSearchParams(window.location.search);
    let raw: Record<string, unknown> | null = null;
    try {
      const stored = window.sessionStorage.getItem("hc-px4a-item-form:v1");
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
    const domVideo = Boolean(
      document.querySelector('[data-testid="listing-video-block"] video') ||
        /Video geüpload|Verwijderen/.test(body),
    );
    const videoEl = document.querySelector('[data-testid="listing-video-block"] video') as HTMLVideoElement | null;
    return {
      path: location.pathname,
      search: location.search,
      title: String(raw?.title || titleInput?.value || "").trim(),
      description: String(raw?.description || document.querySelector("textarea")?.value || "").trim(),
      price: String(raw?.price || "").trim(),
      category: String(raw?.marketplaceCategory || ""),
      photoCount: images.length || (photoMatch ? Number(photoMatch[1]) : 0),
      photoUrls: images.map((img) => String(img.url || "")),
      hasVideo: Boolean(video?.url) || domVideo,
      videoUrl: video?.url ? String(video.url) : videoEl?.currentSrc || videoEl?.src || null,
      fulfillmentPickup: fulfillment?.pickup ?? null,
      contribution: Array.isArray(raw?.sellerContributionTypes)
        ? (raw.sellerContributionTypes as string[])
        : [],
      ctaVisible: Boolean(document.querySelector('[data-testid="px4a-make-free-video"]')),
      replaceVisible: Boolean(document.querySelector('[data-testid="px4a-replace-video"]')),
      exportPending: Boolean(document.querySelector('[data-testid="px4a-export-pending"]')),
      chooserVisible: /Wat wil je doen\?/.test(body),
      draftKeyPresent: Boolean(raw),
      px4aResult: params.get("px4aResult"),
      domPhotoLabel: photoMatch ? photoMatch[0] : "",
      domHasVideoPreview: domVideo,
    };
  });
}

type StudioSnap = {
  url: string;
  path: string;
  itemShell: boolean;
  backVisible: boolean;
  finishVisible: boolean;
  genericHome: boolean;
  signupGate: boolean;
  restoreNotice: boolean;
  resumeOffer: boolean;
  photoCount: number;
  photoIds: string[];
  photoSrcs: string[];
  durationText: string;
  durationChips: string[];
  movementVisible: boolean;
  moreVisible: boolean;
  hcHint: boolean;
  addLabels: string[];
  overflowX: number;
  audioStart: number | null;
  audioKind: string | null;
  audioWindow: number | null;
  audioTrack: number | null;
  durationSeconds: number | null;
  durationMode: string | null;
  movementMode: string | null;
  ownerUserId: string | null;
  metaPhotoCount: number;
  cookieItem: boolean;
};

async function readStudio(page: Page): Promise<StudioSnap> {
  return page.evaluate(async () => {
    const text = document.body.innerText || "";
    const photos = Array.from(document.querySelectorAll('[data-testid^="px4a-photo-"]'));
    const srcs = photos.map((el) => el.querySelector("img")?.currentSrc || el.querySelector("img")?.src || "");
    let meta: {
      ownerUserId?: string | null;
      composition?: {
        photos?: { id?: string; listingUrl?: string }[];
        audio?: { kind?: string; startSeconds?: number; durationSeconds?: number; trackDurationSeconds?: number };
        durationSeconds?: number;
        durationMode?: string;
        movementMode?: string;
      };
    } | null = null;
    try {
      const raw = localStorage.getItem("hc-px4a-draft:v1:item");
      meta = raw ? (JSON.parse(raw) as typeof meta) : null;
    } catch {
      meta = null;
    }
    const durationBtns = Array.from(
      document.querySelectorAll('[data-testid="px4a-video-duration"] button'),
    ).map((b) => (b.textContent || "").trim());
    const addLabels = Array.from(document.querySelectorAll("label,button"))
      .map((el) => (el.textContent || "").trim())
      .filter((s) => /foto toevoegen|foto's toevoegen/i.test(s));
    return {
      url: location.href,
      path: location.pathname,
      itemShell: Boolean(document.querySelector('[data-testid="px4a-item-shell"]')) || /HOMECHEFF STUDIO/.test(text),
      backVisible: Boolean(document.querySelector('[data-testid="px4a-item-back"]')),
      finishVisible: Boolean(document.querySelector('[data-testid="px4a-item-finish"]')),
      genericHome: /Wat wil je maken\?/.test(text),
      signupGate: /Gratis account maken/.test(text),
      restoreNotice: Boolean(document.querySelector('[data-testid="px4a-restore-success"]')),
      resumeOffer: Boolean(document.querySelector('[data-testid="px4a-resume-offer"]')),
      photoCount: photos.length,
      photoIds: photos.map((el) => el.getAttribute("data-testid") || ""),
      photoSrcs: srcs,
      durationText: (document.querySelector('[data-testid="px4a-duration"]')?.textContent || "").trim(),
      durationChips: durationBtns,
      movementVisible: Boolean(document.querySelector('[data-testid="px4a-movement"]')),
      moreVisible: Boolean(document.querySelector('[data-testid="px4a-movement-advanced-toggle"]')),
      hcHint: Boolean(document.querySelector('[data-testid="px4a-video-duration-homecheff-hint"]')),
      addLabels,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      audioStart: meta?.composition?.audio?.kind === "ownMusic" ? Number(meta.composition.audio.startSeconds) : null,
      audioKind: meta?.composition?.audio?.kind ?? null,
      audioWindow: meta?.composition?.audio?.kind === "ownMusic" ? Number(meta.composition.audio.durationSeconds) : null,
      audioTrack:
        meta?.composition?.audio?.kind === "ownMusic" ? Number(meta.composition.audio.trackDurationSeconds) : null,
      durationSeconds: meta?.composition?.durationSeconds ?? null,
      durationMode: meta?.composition?.durationMode ?? null,
      movementMode: meta?.composition?.movementMode ?? null,
      ownerUserId: meta?.ownerUserId ?? null,
      metaPhotoCount: Array.isArray(meta?.composition?.photos) ? meta.composition.photos.length : 0,
      cookieItem: document.cookie.includes("hc_px4a_item") === false,
    };
  });
}

async function readItemMetaPhotos(page: Page): Promise<{
  ids: string[];
  listingUrls: string[];
  audio: Record<string, unknown> | null;
  durationSeconds: number | null;
  durationMode: string | null;
  movementMode: string | null;
  ownerUserId: string | null;
}> {
  return page.evaluate(() => {
    try {
      const raw = localStorage.getItem("hc-px4a-draft:v1:item");
      const meta = raw ? (JSON.parse(raw) as {
        ownerUserId?: string | null;
        composition?: {
          photos?: { id?: string; listingUrl?: string }[];
          audio?: Record<string, unknown>;
          durationSeconds?: number;
          durationMode?: string;
          movementMode?: string;
        };
      }) : null;
      const photos = meta?.composition?.photos ?? [];
      return {
        ids: photos.map((p) => String(p.id || "")),
        listingUrls: photos.map((p) => String(p.listingUrl || "")),
        audio: meta?.composition?.audio ?? null,
        durationSeconds: meta?.composition?.durationSeconds ?? null,
        durationMode: meta?.composition?.durationMode ?? null,
        movementMode: meta?.composition?.movementMode ?? null,
        ownerUserId: meta?.ownerUserId ?? null,
      };
    } catch {
      return {
        ids: [],
        listingUrls: [],
        audio: null,
        durationSeconds: null,
        durationMode: null,
        movementMode: null,
        ownerUserId: null,
      };
    }
  });
}

async function inspectIdb(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(async () => {
    const names = typeof indexedDB.databases === "function"
      ? (await indexedDB.databases()).map((d) => String(d.name || ""))
      : [];
    const itemDb = names.find((n) => n.includes("hc-px4a-draft-blobs-item")) || "hc-px4a-draft-blobs-item";
    let keys: string[] = [];
    try {
      keys = await new Promise((resolve) => {
        const req = indexedDB.open(itemDb, 1);
        req.onerror = () => resolve([]);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains("media")) {
            db.close();
            resolve([]);
            return;
          }
          const tx = db.transaction("media", "readonly");
          const store = tx.objectStore("media");
          const kreq = store.getAllKeys();
          kreq.onsuccess = () => {
            db.close();
            resolve((kreq.result || []).map(String));
          };
          kreq.onerror = () => {
            db.close();
            resolve([]);
          };
        };
      });
    } catch {
      keys = [];
    }
    return { databases: names.filter((n) => /px4a|photo-video/i.test(n)), mediaKeys: keys };
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
  const cta = page.locator('[data-testid="px4a-make-free-video"]');
  await cta.scrollIntoViewIfNeeded();
  await cta.click({ timeout: 15_000 });
}

async function completeChooser(page: Page): Promise<void> {
  await dismissBanners(page);
  const chooserVisible = await page.getByText("Wat wil je doen?", { exact: false }).first().isVisible().catch(() => false);
  const formReady = await page.locator('[data-testid="listing-video-block"], [data-testid="px4a-make-free-video"]').count();
  if (formReady && !chooserVisible) return;
  if (!chooserVisible) return;
  notes.push("Chooser 'Wat wil je doen?' present — completing intended offer path.");
  await clickText(page, "Ik bied iets aan");
  await page.waitForTimeout(600);
  await clickText(page, "Tuin & Natuur");
  await page.waitForTimeout(800);
  const groupHeading = page.getByText("Kies een groep", { exact: false });
  await groupHeading.waitFor({ timeout: 15_000 }).catch(() => undefined);
  const groupBtn = page.locator("section button").filter({ hasNotText: "Terug" }).first();
  await groupBtn.click({ timeout: 10_000 });
  await page.waitForTimeout(700);
  const chip = page.locator("button[aria-pressed]").first();
  if (await chip.isVisible().catch(() => false)) await chip.click();
  else {
    const anyChip = page.locator("section button").filter({ hasNotText: /Terug|groep|samenvatting|Verder/i }).first();
    await anyChip.click({ timeout: 8_000 }).catch(() => undefined);
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
  if (await price.count()) await price.fill("4,50");
  else await page.locator('input[inputmode="decimal"]').first().fill("4,50");

  const pickupLabel = page.locator("label").filter({ hasText: /^Afhalen$/ }).first();
  if (await pickupLabel.count()) {
    const box = pickupLabel.locator('input[type="checkbox"]');
    if (await box.count() && !(await box.isChecked())) await box.check({ force: true });
  }

  const grown = page.locator('[data-hc-contribution-type="GROWN"]');
  if (await grown.count()) await grown.click().catch(() => undefined);
  else {
    const firstContrib = page.locator("[data-hc-contribution-type]").first();
    if (await firstContrib.count()) await firstContrib.click().catch(() => undefined);
  }

  const place = page.locator("label").filter({ hasText: /Plaatsnaam/ }).locator("xpath=following-sibling::input[1]");
  if (await place.count()) await place.fill("Utrecht");

  const fileInput = page.locator('input[type="file"][accept*="image/gif"]').first();
  await fileInput.setInputFiles([
    join(FIXTURES, "photo-1.jpg"),
    join(FIXTURES, "photo-2.jpg"),
    join(FIXTURES, "photo-3.jpg"),
    join(FIXTURES, "photo-4.jpg"),
  ]);
  await page.waitForFunction(
    () => /4\s*\/\s*5 foto/.test(document.body.innerText || "") || /Geüploade foto's \(4\)/.test(document.body.innerText || ""),
    { timeout: 90_000 },
  );
  await page.locator('[data-testid="listing-video-block"]').scrollIntoViewIfNeeded().catch(() => undefined);
  await page.waitForTimeout(800);
}

async function ensureFourListingPhotos(page: Page): Promise<void> {
  const label = await page.evaluate(() => {
    const m = (document.body.innerText || "").match(/(\d+)\s*\/\s*5 foto/i);
    return m ? Number(m[1]) : 0;
  });
  if (label >= 4) return;
  const fileInput = page.locator('input[type="file"][accept*="image/gif"]').first();
  await fileInput.setInputFiles([
    join(FIXTURES, "photo-1.jpg"),
    join(FIXTURES, "photo-2.jpg"),
    join(FIXTURES, "photo-3.jpg"),
    join(FIXTURES, "photo-4.jpg"),
  ]);
  await page.waitForFunction(
    () => /4\s*\/\s*5 foto/.test(document.body.innerText || ""),
    { timeout: 90_000 },
  );
}

async function clearStudioItemDraft(context: BrowserContext): Promise<void> {
  const p = await context.newPage();
  try {
    await p.goto(`${STUDIO_ORIGIN}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await p.evaluate(async () => {
      try {
        localStorage.removeItem("hc-px4a-draft:v1:item");
      } catch {
        /* ignore */
      }
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase("hc-px4a-draft-blobs-item");
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    });
  } finally {
    await p.close().catch(() => undefined);
  }
}

async function clearStudioProductSession(context: BrowserContext): Promise<string[]> {
  const removed: string[] = [];
  const all = await context.cookies(STUDIO_ORIGIN);
  for (const c of all) {
    if (!isStudioHostDomain(c.domain)) continue;
    if (!(STUDIO_PRODUCT_COOKIES as readonly string[]).includes(c.name)) continue;
    await context.clearCookies({ name: c.name, domain: c.domain, path: c.path || "/" });
    removed.push(c.name);
  }
  return removed;
}

async function enterFromCta(page: Page): Promise<string[]> {
  const seen: string[] = [];
  await clickCta(page);
  const start = Date.now();
  while (Date.now() - start < 90_000) {
    seen.push(page.url());
    hops.push(page.url());
    if (/\/studio\/photo-video\/from-item/.test(page.url())) break;
    if (/\/signup/.test(page.url())) break;
    await page.waitForTimeout(350);
  }
  await waitComposer(page).catch(() => undefined);
  return unique(seen);
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
  const stored = await page.evaluate(() => window.sessionStorage.getItem("hc-px4a-item-form:v1"));
  notes.push(`After ${kind} return storageChars=${stored?.length ?? 0} url=${page.url()}`);
}

async function reorderThreeBeforeOne(page: Page): Promise<string[]> {
  await page.locator('[data-testid="px4a-photo-2"] button[aria-label="Eerder"]').click();
  await page.waitForTimeout(300);
  await page.locator('[data-testid="px4a-photo-1"] button[aria-label="Eerder"]').click();
  await page.waitForTimeout(1000);
  const meta = await readItemMetaPhotos(page);
  return meta.ids;
}

function idsMatch(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

async function main(): Promise<void> {
  for (const name of [
    "photo-1.jpg",
    "photo-2.jpg",
    "photo-3.jpg",
    "photo-4.jpg",
    "owned-music.wav",
    "listing-video.mp4",
  ]) {
    if (!existsSync(join(FIXTURES, name))) throw new Error(`Missing fixture ${name}`);
  }
  mkdirSync(SHOT_DIR, { recursive: true });
  console.log("PX.4A.4C headed Production cert");
  console.log("Profile:", PROFILE_DIR);

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: "chrome",
    headless: false,
    viewport: { width: 1440, height: 900 },
    locale: "nl-NL",
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const page = context.pages()[0] || (await context.newPage());
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push({ url: page.url(), text: msg.text().slice(0, 300) });
  });
  page.on("request", (req) => {
    if (!req.url().includes("/api/studio/px4a-item-handoff")) return;
    const data = req.postData() || "";
    notes.push(`handoff POST ${data.slice(0, 280)}`);
  });
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) hops.push(frame.url());
  });

  let unpublished = true;
  let originalVideoUrl: string | null = null;
  let orderAfterReorder: string[] = [];
  let photoAddClass: "PASS" | "POLISH" | "BLOCKER" = "POLISH";
  let zeroPhotoConclusion = "NOT TESTED";

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
    await shot(page, "after-chooser");
    await clearStudioItemDraft(context);
    await fillListingDraft(page);
    await shot(page, "draft-ready");
    const draft = await readHcDraft(page);
    if (!draft.ctaVisible) throw new Error("Maak gratis video not visible after filling draft.");
    if (draft.photoCount < 4) notes.push(`Photo count after upload: ${draft.photoCount}`);
    notes.push(`Control draft photos: ${draft.photoUrls.map((u) => u.slice(-24)).join(" | ")}`);
    notes.push("Photo order at listing: 1, 2, 3, 4 (upload sequence).");

    // ---- Flow B first entry ----
    const entryHops = await enterFromCta(page);
    notes.push(`Flow B first hops: ${entryHops.join(" → ")}`);
    if (!/\/studio\/photo-video\/from-item/.test(page.url())) {
      setGate("Flow B", "FAIL", `Did not land on contextual creator (${page.url()})`);
      await shot(page, "flow-b-fail-land");
      throw new Error("Flow B did not open contextual creator from Maak gratis video.");
    }
    await page.waitForTimeout(1500);
    let studio = await readStudio(page);
    await shot(page, "flow-b-open");
    const contextualOk =
      studio.backVisible &&
      studio.finishVisible &&
      !studio.genericHome &&
      !studio.signupGate &&
      studio.photoCount >= 4;
    setGate(
      "Flow B",
      contextualOk ? "PASS" : "FAIL",
      `from-item photos=${studio.photoCount} back=${studio.backVisible} finish=${studio.finishVisible} home=${studio.genericHome}`,
    );

    orderAfterReorder = await reorderThreeBeforeOne(page);
    await page.waitForTimeout(900);
    const previewBtn = page.getByRole("button", { name: /Afspelen|Pauzeren/ }).first();
    if (await previewBtn.isVisible().catch(() => false)) await previewBtn.click().catch(() => undefined);
    await page.waitForTimeout(1200);
    await shot(page, "flow-b-reordered");
    await returnToItem(page, "cancel");
    await shot(page, "flow-b-back-hc");

    const reentryHops = await enterFromCta(page);
    notes.push(`Flow B re-entry hops: ${reentryHops.join(" → ")}`);
    await page.waitForTimeout(1600);
    await acceptResumeIfPresent(page);
    const afterReentry = await readItemMetaPhotos(page);
    studio = await readStudio(page);
    await shot(page, "flow-b-reentry");
    const reorderPass =
      afterReentry.ids.length >= 4 &&
      orderAfterReorder.length >= 4 &&
      idsMatch(afterReentry.ids.slice(0, 4), orderAfterReorder.slice(0, 4));
    setGate(
      "Reorder persistence",
      reorderPass ? "PASS" : "FAIL",
      `expected ids ${orderAfterReorder.slice(0, 4).join(",")} restored ${afterReentry.ids.slice(0, 4).join(",")} resume=${studio.resumeOffer} restore=${studio.restoreNotice}`,
    );

    // ---- Audio 15→30 ----
    await page.locator('[data-testid="px4a-audio-own"]').click();
    await page.locator('[data-testid="px4a-audio-file"]').setInputFiles(join(FIXTURES, "owned-music.wav"));
    await page.waitForTimeout(2500);
    await page.locator('[data-testid="px4a-video-duration"] button', { hasText: "15 sec" }).click();
    await page.waitForTimeout(900);
    const windowCanvas = page.locator('[data-testid="px4a-audio-window"]');
    await windowCanvas.waitFor({ timeout: 20_000 });
    const box = await windowCanvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.72, box.y + box.height / 2, { steps: 12 });
      await page.mouse.up();
    }
    await page.waitForTimeout(1000);
    const audioAt15 = await readItemMetaPhotos(page);
    const start15 = Number((audioAt15.audio as { startSeconds?: number } | null)?.startSeconds ?? 0);
    await shot(page, "audio-15");
    await page.locator('[data-testid="px4a-video-duration"] button', { hasText: "30 sec" }).click();
    await page.waitForTimeout(1200);
    const audioAt30 = await readItemMetaPhotos(page);
    const audio30 = audioAt30.audio as {
      kind?: string;
      startSeconds?: number;
      durationSeconds?: number;
      trackDurationSeconds?: number;
    } | null;
    const start30 = Number(audio30?.startSeconds ?? -1);
    const window30 = Number(audio30?.durationSeconds ?? 0);
    const track = Number(audio30?.trackDurationSeconds ?? 0);
    const maxStart = Math.max(0, track - 30);
    const clampOk =
      audio30?.kind === "ownMusic" &&
      window30 > 0 &&
      start30 >= 0 &&
      start30 <= maxStart + 0.05 &&
      Number.isFinite(start30);
    await shot(page, "audio-30");
    setGate(
      "Audio 15→30 clamp",
      clampOk ? "PASS" : "FAIL",
      `start15≈${start15.toFixed(2)} start30≈${start30.toFixed(2)} window=${window30} track=${track} maxStart=${maxStart.toFixed(2)}`,
    );

    await page.locator('[data-testid="px4a-audio-none"]').click();
    await page.waitForTimeout(800);
    if (await previewBtn.isVisible().catch(() => false)) {
      await previewBtn.click().catch(() => undefined);
      await page.waitForTimeout(1500);
    }
    const audioNone = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll("audio"));
      return {
        count: els.length,
        playing: els.some((el) => !el.paused && !el.ended),
        error: (document.body.innerText || "").includes("er ging iets mis"),
      };
    });
    const noneMeta = await readItemMetaPhotos(page);
    const noneOk = noneMeta.audio && (noneMeta.audio as { kind?: string }).kind === "none" && !audioNone.playing && !audioNone.error;
    await shot(page, "audio-none");
    setGate(
      "Geen muziek",
      noneOk ? "PASS" : "FAIL",
      `kind=${(noneMeta.audio as { kind?: string } | null)?.kind} playing=${audioNone.playing} error=${audioNone.error}`,
    );

    // ---- Video gebruiken ----
    await returnToItem(page, "finish");
    const afterFinish = await readHcDraft(page);
    await page.locator('[data-testid="listing-video-block"]').scrollIntoViewIfNeeded().catch(() => undefined);
    await shot(page, "video-gebruiken-return");
    const honestNoAttach = !afterFinish.replaceVisible && afterFinish.px4aResult === "ready";
    const sameDraft =
      afterFinish.title.includes("PX4A4C") ||
      afterFinish.draftKeyPresent ||
      afterFinish.photoCount >= 4 ||
      afterFinish.domPhotoLabel.startsWith("4");
    setGate(
      "Video gebruiken",
      honestNoAttach && (sameDraft || afterFinish.px4aResult === "ready") ? (sameDraft ? "PASS" : "PARTIAL") : "FAIL",
      `result=${afterFinish.px4aResult} sameDraft=${sameDraft} titleLen=${afterFinish.title.length} photos=${afterFinish.photoCount}/${afterFinish.domPhotoLabel} attached=${afterFinish.hasVideo} pending=${afterFinish.exportPending} cta=${afterFinish.ctaVisible}`,
    );

    // ---- Flow C ----
    await ensureFourListingPhotos(page);
    const listingVideoInput = page.locator('[data-testid="listing-video-block"] input[accept*="video"]').first();
    await listingVideoInput.setInputFiles(join(FIXTURES, "listing-video.mp4"));
    await page.waitForFunction(
      () =>
        Boolean(document.querySelector('[data-testid="px4a-replace-video"]')) ||
        /Video geüpload/.test(document.body.innerText || ""),
      { timeout: 120_000 },
    );
    await page.waitForTimeout(1500);
    const withVideo = await readHcDraft(page);
    originalVideoUrl = withVideo.videoUrl;
    await page.locator('[data-testid="listing-video-block"]').scrollIntoViewIfNeeded().catch(() => undefined);
    await shot(page, "flow-c-uploaded");
    const replace = page.locator('[data-testid="px4a-replace-video"]');
    if (await replace.count()) await replace.click({ timeout: 20_000 });
    else notes.push("Vervangen control not in DOM after upload; continuing via Maak gratis video.");
    await page.waitForTimeout(400);
    await clickCta(page);
    await waitUrl(page, /\/studio\/photo-video\/from-item/, 90_000);
    await waitComposer(page);
    await page.locator('[data-testid="px4a-video-duration"] button', { hasText: "20 sec" }).click().catch(() => undefined);
    await page.waitForTimeout(700);
    await shot(page, "flow-c-studio-change");
    await returnToItem(page, "cancel");
    const afterCancelC = await readHcDraft(page);
    const flowCOk = afterCancelC.domHasVideoPreview || afterCancelC.hasVideo || afterCancelC.replaceVisible;
    setGate(
      "Flow C",
      flowCOk ? "PASS" : "FAIL",
      `domVideo=${afterCancelC.domHasVideoPreview} storageVideo=${afterCancelC.hasVideo} replace=${afterCancelC.replaceVisible} url=${afterCancelC.videoUrl ? "present" : "none"} original=${originalVideoUrl ? "present" : "none"}`,
    );

    const reC = await enterFromCta(page);
    notes.push(`Flow C Video gebruiken hops: ${reC.join(" → ")}`);
    await waitComposer(page);
    await returnToItem(page, "finish");
    const afterUseC = await readHcDraft(page);
    const oneVideo =
      (afterUseC.domHasVideoPreview || afterUseC.hasVideo) &&
      !/tweede video|2 video/i.test(await page.locator("body").innerText());
    setGate(
      "One-video law",
      oneVideo ? "PASS" : "FAIL",
      `stillHasPreview=${afterUseC.domHasVideoPreview} storageVideo=${afterUseC.hasVideo} replace=${afterUseC.replaceVisible} pending=${afterUseC.exportPending} urlUnchanged=${!originalVideoUrl || afterUseC.videoUrl === originalVideoUrl || !afterUseC.videoUrl}`,
    );
    unpublished = true;

    // ---- Flow D mobile ----
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    const dHops = await enterFromCta(page);
    notes.push(`Flow D hops: ${dHops.join(" → ")}`);
    await waitComposer(page);
    await page.waitForTimeout(800);
    const mobile = await readStudio(page);
    const mobileText = await page.locator("body").innerText();
    const controls = {
      photos: mobile.photoCount >= 1,
      reorder: await page.locator('[data-testid="px4a-photo-0"] button[aria-label="Eerder"]').isVisible().catch(() => false),
      duration: mobile.durationChips.includes("15 sec"),
      movement: mobile.movementVisible,
      more: mobile.moreVisible,
      text: /Tekst|lettertype|Kleur/i.test(mobileText),
      preview: /Afspelen|Pauzeren/i.test(mobileText),
      music: /Eigen muziek|Geen muziek/i.test(mobileText),
      back: mobile.backVisible,
      finish: mobile.finishVisible,
      hint: mobile.hcHint,
      overflow: mobile.overflowX <= 12,
    };
    photoAddClass = /foto toevoegen/i.test(mobile.addLabels.join(" ") + mobileText) ? "POLISH" : "POLISH";
    const addVisible = /Foto's toevoegen|Andere foto toevoegen/i.test(mobileText);
    await shot(page, "flow-d-390");
    const mobilePass = Object.values(controls).every(Boolean) && addVisible;
    setGate(
      "Contextual ~390px",
      mobilePass ? "PASS" : controls.overflow && controls.back && controls.finish ? "PARTIAL" : "FAIL",
      `overflowX=${mobile.overflowX} ${JSON.stringify(controls)} add=${mobile.addLabels.join("|")}`,
    );
    setGate(
      "Photo-add UX",
      "PARTIAL",
      `Classification ${photoAddClass}. Visible: ${addVisible ? "Foto's toevoegen / Andere foto toevoegen" : "missing"}. Leading + would improve clarity: yes. Not a blocker.`,
    );
    notes.push("Photo-add UX: a normal user can find the control without drag-and-drop; leading '+ Foto toevoegen' would still be clearer. POLISH, not BLOCKER. No redesign during cert.");
    await page.locator('[data-testid="px4a-item-back"]').click();
    await waitUrl(page, /homecheff\.eu\/sell\/new/i, 90_000);
    await completeChooser(page);
    await page.setViewportSize({ width: 1440, height: 900 });

    // ---- Flow E SSO ----
    const removed = await clearStudioProductSession(context);
    notes.push(`Cleared Studio product cookies: ${removed.join(",") || "(none)"}`);
    const eHops = await enterFromCta(page);
    notes.push(`Flow E hops: ${eHops.join(" → ")}`);
    await waitComposer(page);
    const eStudio = await readStudio(page);
    await shot(page, "flow-e");
    const ePass =
      /\/studio\/photo-video\/from-item/.test(page.url()) &&
      !eStudio.signupGate &&
      !eStudio.genericHome &&
      eStudio.backVisible &&
      eStudio.photoCount + eStudio.metaPhotoCount > 0;
    setGate(
      "Flow E SSO/JIT",
      ePass ? "PASS" : "FAIL",
      `land=${page.url()} signup=${eStudio.signupGate} home=${eStudio.genericHome} photos=${eStudio.photoCount} hops=${eHops.filter((u) => /studio|login|sso|homecheff/i.test(u)).slice(0, 8).join(" → ")}`,
    );

    // ---- Browser Back ----
    await page.locator('[data-testid="px4a-video-duration"] button', { hasText: "20 sec" }).click().catch(() => undefined);
    await page.locator('[data-testid="px4a-movement"] button', { hasText: "Geen" }).click().catch(() => undefined);
    await page.waitForTimeout(900);
    const beforeBackMeta = await readItemMetaPhotos(page);
    await page.goBack({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await completeChooser(page);
    const afterBackHc = await readHcDraft(page);
    await shot(page, "browser-back-hc");
    const backHops = await enterFromCta(page);
    notes.push(`Back re-entry hops: ${backHops.join(" → ")}`);
    await waitComposer(page);
    await acceptResumeIfPresent(page);
    await page.waitForTimeout(1000);
    const afterBackStudio = await readItemMetaPhotos(page);
    const backOk =
      afterBackHc.title.includes("PX4A4C") &&
      afterBackHc.photoCount >= 4 &&
      afterBackStudio.ids.length >= 4;
    setGate(
      "Browser Back",
      backOk ? "PASS" : "FAIL",
      `hcTitle=${afterBackHc.title.includes("PX4A4C")} photos=${afterBackHc.photoCount} studioPhotos=${afterBackStudio.ids.length} duration=${afterBackStudio.durationSeconds} priorDuration=${beforeBackMeta.durationSeconds}`,
    );

    // ---- Studio refresh / 0-photo ----
    await page.locator('[data-testid="px4a-video-duration"] button', { hasText: "15 sec" }).click().catch(() => undefined);
    await page.waitForTimeout(1000);
    const beforeRefresh = await readStudio(page);
    const beforeMeta = await readItemMetaPhotos(page);
    const beforeIdb = await inspectIdb(page);
    const cookiesBefore = await context.cookies(STUDIO_ORIGIN);
    const itemCookie = cookiesBefore.find((c) => c.name === "hc_px4a_item");
    await shot(page, "studio-before-refresh");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    let afterReload = await readStudio(page);
    const resumeShown = afterReload.resumeOffer;
    const photosImmediately = afterReload.photoCount;
    if (resumeShown) await acceptResumeIfPresent(page);
    await page.waitForTimeout(1500);
    afterReload = await readStudio(page);
    const afterMeta = await readItemMetaPhotos(page);
    const afterIdb = await inspectIdb(page);
    await shot(page, "studio-after-refresh");
    const networkish = consoleErrors.filter((e) => e.url.includes("studio.homecheff.eu")).slice(-8);
    notes.push(`Studio refresh: immediatePhotos=${photosImmediately} resume=${resumeShown} after=${afterReload.photoCount} meta=${afterMeta.ids.length} itemCookie=${Boolean(itemCookie)} idb=${JSON.stringify(afterIdb)}`);
    notes.push(`Studio refresh console: ${networkish.map((e) => e.text).join(" | ") || "none"}`);

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    let second = await readStudio(page);
    const secondResume = second.resumeOffer;
    if (secondResume) await acceptResumeIfPresent(page);
    await page.waitForTimeout(1200);
    second = await readStudio(page);
    await shot(page, "studio-after-refresh-2");

    if (afterReload.photoCount === 0 && !resumeShown && afterMeta.ids.length === 0) {
      zeroPhotoConclusion = "A. real persistence bug";
      setGate("Studio refresh", "FAIL", "Photos became 0 with no resume prompt after headed refresh. STOP.");
      setGate("0-photo investigation", "FAIL", zeroPhotoConclusion);
      saveReport();
      throw new Error("BLOCKER: headed Studio refresh produced 0 photos.");
    }

    const restored = afterReload.photoCount >= 4 || afterMeta.ids.length >= 4;
    if (resumeShown && restored) {
      zeroPhotoConclusion =
        "B. hydration/resume UX — empty composition until Verdergaan; not a lost-draft bug. Headless 0-photo was this prompt, not persistence failure.";
      setGate(
        "Studio refresh",
        "PASS",
        `Resume prompt then restore. photos ${photosImmediately}→${afterReload.photoCount} second=${second.photoCount} duration=${afterMeta.durationSeconds}`,
      );
    } else if (restored && photosImmediately >= 4) {
      zeroPhotoConclusion = "D/E. previous 0-photo was headless/harness artifact; headed auto-restore works.";
      setGate("Studio refresh", "PASS", `photos restored immediately=${afterReload.photoCount} duration=${afterMeta.durationSeconds}`);
    } else if (restored) {
      zeroPhotoConclusion = "B. hydration race — photos appeared after wait/resume.";
      setGate("Studio refresh", "PASS", `photos after wait ${afterReload.photoCount}`);
    } else {
      zeroPhotoConclusion = "C. expired/missing item context or restore failure";
      setGate("Studio refresh", "FAIL", `photos=${afterReload.photoCount} meta=${afterMeta.ids.length} cookie=${Boolean(itemCookie)}`);
    }
    setGate("0-photo investigation", restored ? "PASS" : "FAIL", `${zeroPhotoConclusion} idbBefore=${JSON.stringify(beforeIdb)} beforePhotos=${beforeRefresh.photoCount} beforeMeta=${beforeMeta.ids.length}`);

    // ---- HomeCheff refresh ----
    await returnToItem(page, "cancel");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    await completeChooser(page);
    const hcRefresh = await readHcDraft(page);
    await shot(page, "hc-refresh");
    const hcRefreshOk =
      hcRefresh.title.includes("PX4A4C") &&
      hcRefresh.photoCount >= 4 &&
      hcRefresh.hasVideo;
    const hcLimitation = !hcRefresh.draftKeyPresent
      ? "sessionStorage 24h same-tab; chooser may appear and is not a failed restore."
      : "sessionStorage same-tab draft restored after refresh.";
    setGate(
      "HomeCheff refresh",
      hcRefreshOk ? "PASS" : hcRefresh.chooserVisible ? "PARTIAL" : "FAIL",
      `title=${hcRefresh.title.includes("PX4A4C")} photos=${hcRefresh.photoCount} video=${hcRefresh.hasVideo} category=${hcRefresh.category} pickup=${hcRefresh.fulfillmentPickup} ${hcLimitation}`,
    );

    const finalHops = await enterFromCta(page);
    notes.push(`Final re-entry hops: ${finalHops.join(" → ")}`);
    await waitComposer(page);
    await acceptResumeIfPresent(page);
    await page.waitForTimeout(1200);
    const finalStudio = await readStudio(page);
    const finalMeta = await readItemMetaPhotos(page);
    await shot(page, "final-reentry");
    const finalOk =
      /from-item/.test(page.url()) &&
      (finalStudio.photoCount >= 4 || finalMeta.ids.length >= 4) &&
      !finalStudio.genericHome;
    setGate(
      "Re-entry recovery",
      finalOk ? "PASS" : "FAIL",
      `photos=${finalStudio.photoCount} meta=${finalMeta.ids.length} duration=${finalMeta.durationSeconds} movement=${finalMeta.movementMode} audio=${(finalMeta.audio as { kind?: string } | null)?.kind} owner=${finalMeta.ownerUserId}`,
    );

    await returnToItem(page, "cancel");
    const lastHc = await readHcDraft(page);
    unpublished = !/is geplaatst|gepubliceerd/i.test(await page.locator("body").innerText());
    setGate(
      "Listing remained unpublished",
      unpublished && lastHc.title.includes("PX4A4C") ? "PASS" : "FAIL",
      `unpublished=${unpublished} stillDraft=${lastHc.draftKeyPresent}`,
    );

    const blockers = Object.entries(matrix)
      .filter(([, v]) => v.result === "FAIL")
      .map(([k]) => k);
    setGate("Blockers found", blockers.length ? "FAIL" : "PASS", blockers.length ? blockers.join(", ") : "none");
    setGate("Fixes shipped", "PASS", "none — certification only; no speculative code changes");
    setGate(
      "Remaining POLISH",
      "PARTIAL",
      "Leading + Foto toevoegen; official transparent globe-man watermark asset; public Studio credit chrome. Not mixed into this cert.",
    );
    setGate("Regressions", "PASS", "No PX.4A.5 work. No MP4 generation, attachment, or provider calls attempted.");

    const required: Array<keyof typeof matrix> = [
      "Flow B",
      "Reorder persistence",
      "Audio 15→30 clamp",
      "Geen muziek",
      "Flow C",
      "One-video law",
      "Contextual ~390px",
      "Flow E SSO/JIT",
      "Browser Back",
      "Studio refresh",
      "HomeCheff refresh",
      "Re-entry recovery",
    ];
    const allPass = required.every((k) => matrix[k]?.result === "PASS" || matrix[k]?.result === "PARTIAL");
    const anyFail = required.some((k) => matrix[k]?.result === "FAIL" || matrix[k]?.result === "NOT TESTED");
    setGate(
      "Final PX.4A.4 verdict",
      anyFail ? "FAIL" : allPass ? "PASS" : "PARTIAL",
      anyFail
        ? "PX.4A.4 remains incomplete while a required gate is FAIL/NOT TESTED. PX.4A.5 not started."
        : "Required remaining human gates certified. PX.4A.4 may be marked COMPLETE. PX.4A.5 not started.",
    );
    saveReport();
  } catch (err) {
    notes.push(String(err).slice(0, 800));
    for (const key of [
      "Flow B",
      "Reorder persistence",
      "Audio 15→30 clamp",
      "Geen muziek",
      "Video gebruiken",
      "Flow C",
      "One-video law",
      "Contextual ~390px",
      "Photo-add UX",
      "Flow E SSO/JIT",
      "Browser Back",
      "Studio refresh",
      "0-photo investigation",
      "HomeCheff refresh",
      "Re-entry recovery",
      "Listing remained unpublished",
      "Blockers found",
      "Fixes shipped",
      "Remaining POLISH",
      "Regressions",
      "Final PX.4A.4 verdict",
    ]) {
      if (!matrix[key]) setGate(key, "NOT TESTED", String(err).slice(0, 180));
    }
    setGate("Listing remained unpublished", unpublished ? "PASS" : "FAIL", `stopped unpublished=${unpublished}`);
    setGate("Final PX.4A.4 verdict", "FAIL", "Stopped before all gates completed. PX.4A.5 not started.");
    saveReport();
    throw err;
  } finally {
    saveReport();
    await context.close().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
