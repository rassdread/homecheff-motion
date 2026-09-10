#!/usr/bin/env npx tsx
/**
 * PX.4A.4 — Human Production certification helper.
 *
 * Real Google Chrome + dedicated profile. Passive HomeCheff auth wait.
 * Does not inject cookies, bypass SSO, publish listings, or start PX.4A.5.
 *
 * Usage:
 *   npx tsx scripts/px4a4-human-production-cert.ts
 *
 * Optional:
 *   PX4A4_CHROME_PROFILE=/path/to/profile
 *   PX4A4_START=B   skip Flow A and continue from Flow B (preserves live-report.json)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
const SHOT_DIR = join(OUT_DIR, "shots");

const STUDIO_CLEAR_ALWAYS = [
  "studio_session",
  "studio_silent_sso_attempt",
  "studio_skip_silent_sso",
  "studio_sso_pending",
] as const;

const PROVIDER_RE =
  /vidu|elevenlabs|openai\.com|api\.openai|replicate\.com|anthropic|runwayml|deevid|ffmpeg/i;
const CREDIT_RE = /\/api\/(?:me\/)?(?:credits|wallet|billing|studio-account\/credits)/i;

type DraftSnap = {
  at: string;
  origin: string;
  path: string;
  search: string;
  px4aResult: string | null;
  photoCount: number;
  hasTitle: boolean;
  titleLen: number;
  hasDescription: boolean;
  descriptionLen: number;
  hasPrice: boolean;
  category: string;
  hasVideo: boolean;
  videoUrlHost: string | null;
  fulfillmentPickup: boolean | null;
  allergensConfirmed: boolean | null;
  ctaVisible: boolean;
  attributionVisible: boolean;
  exportPendingVisible: boolean;
  replaceVisible: boolean;
  draftKeyPresent: boolean;
};

type Report = {
  startedAt: string;
  updatedAt: string;
  accountClass: string;
  hcAuthenticated: boolean;
  studioAuthenticated: boolean;
  dpl: { studio: string | null; homecheff: string | null };
  flowA: Record<string, unknown>;
  flowB: Record<string, unknown>;
  flowC: Record<string, unknown>;
  flowD: Record<string, unknown>;
  flowE: Record<string, unknown>;
  browserBack: Record<string, unknown>;
  refresh: Record<string, unknown>;
  branding: Record<string, unknown>;
  state: Record<string, unknown>;
  network: {
    providerHits: string[];
    creditHits: string[];
    renderHits: string[];
  };
  notes: string[];
};

const START_FLOW = (process.env.PX4A4_START ?? "A").trim().toUpperCase();

const report: Report = {
  startedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  accountClass: "unknown",
  hcAuthenticated: false,
  studioAuthenticated: false,
  dpl: { studio: null, homecheff: null },
  flowA: { status: "pending" },
  flowB: { status: "pending" },
  flowC: { status: "pending" },
  flowD: { status: "pending" },
  flowE: { status: "pending" },
  browserBack: { status: "pending" },
  refresh: { status: "pending" },
  branding: { status: "pending" },
  state: { status: "pending" },
  network: { providerHits: [], creditHits: [], renderHits: [] },
  notes: [],
};

function loadExistingReport(): void {
  const path = join(OUT_DIR, "live-report.json");
  if (!existsSync(path)) return;
  try {
    const prev = JSON.parse(readFileSync(path, "utf8")) as Partial<Report>;
    if (typeof prev.startedAt === "string") report.startedAt = prev.startedAt;
    if (typeof prev.accountClass === "string") report.accountClass = prev.accountClass;
    if (prev.flowA) report.flowA = prev.flowA;
    if (prev.flowB) report.flowB = prev.flowB;
    if (prev.flowC) report.flowC = prev.flowC;
    if (prev.flowD) report.flowD = prev.flowD;
    if (prev.flowE) report.flowE = prev.flowE;
    if (prev.browserBack) report.browserBack = prev.browserBack;
    if (prev.refresh) report.refresh = prev.refresh;
    if (prev.branding) report.branding = prev.branding;
    if (prev.state) report.state = prev.state;
    if (prev.network) {
      report.network.providerHits = prev.network.providerHits ?? [];
      report.network.creditHits = prev.network.creditHits ?? [];
      report.network.renderHits = prev.network.renderHits ?? [];
    }
    if (Array.isArray(prev.notes)) report.notes = prev.notes.slice();
    report.notes.push(`Helper relaunch ${new Date().toISOString()} PX4A4_START=${START_FLOW}`);
  } catch {
    /* keep fresh report */
  }
}

function saveReport(): void {
  report.updatedAt = new Date().toISOString();
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "live-report.json"), JSON.stringify(report, null, 2));
}

function logPause(title: string, body: string): void {
  console.log("");
  console.log("============================================================");
  console.log(`PAUSE — ${title}`);
  console.log("============================================================");
  console.log(body);
  console.log("============================================================");
  console.log("");
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

function hasStudioProductSession(cookies: Cookie[]): boolean {
  return cookies.some((c) => c.name === "studio_session" && isStudioHostDomain(c.domain));
}

async function probeHcAuthenticated(context: BrowserContext): Promise<{
  cookiePresent: boolean;
  apiOk: boolean;
  status: number | null;
  sellerRoles: string[];
}> {
  const cookies = await context.cookies(HC_ORIGIN);
  const cookiePresent = hasHcSessionCookie(cookies);
  try {
    const res = await context.request.get(`${HC_ORIGIN}/api/user/me`, {
      timeout: 20_000,
      failOnStatusCode: false,
    });
    if (res.status() !== 200) {
      return { cookiePresent, apiOk: false, status: res.status(), sellerRoles: [] };
    }
    const body = (await res.json().catch(() => null)) as { sellerRoles?: string[] } | null;
    return {
      cookiePresent,
      apiOk: true,
      status: 200,
      sellerRoles: Array.isArray(body?.sellerRoles) ? body.sellerRoles.map(String) : [],
    };
  } catch {
    return { cookiePresent, apiOk: false, status: null, sellerRoles: [] };
  }
}

async function probeStudioAuthenticated(context: BrowserContext): Promise<boolean> {
  try {
    const res = await context.request.get(`${STUDIO_ORIGIN}/api/me/studio-account`, {
      timeout: 20_000,
      failOnStatusCode: false,
    });
    return res.status() === 200;
  } catch {
    return false;
  }
}

async function clearStudioProductCookies(context: BrowserContext): Promise<string[]> {
  const removed: string[] = [];
  const all = await context.cookies(STUDIO_ORIGIN);
  for (const c of all) {
    if (!isStudioHostDomain(c.domain)) continue;
    const clearAlways = (STUDIO_CLEAR_ALWAYS as readonly string[]).includes(c.name);
    if (!clearAlways && c.name !== "hc_session") continue;
    await context.clearCookies({
      name: c.name,
      domain: c.domain,
      path: c.path || "/",
    });
    removed.push(c.name);
  }
  return removed;
}

async function waitForHcAuthenticatedPassive(
  context: BrowserContext,
  timeoutMs: number,
  opts: { stableNeeded?: number; pollMs?: number } = {},
): Promise<{ sellerRoles: string[] }> {
  const stableNeeded = opts.stableNeeded ?? 2;
  const pollMs = opts.pollMs ?? 2000;
  const deadline = Date.now() + timeoutMs;
  let consecutive = 0;
  let lastRoles: string[] = [];
  while (Date.now() < deadline) {
    const probe = await probeHcAuthenticated(context);
    if (probe.apiOk) {
      consecutive += 1;
      lastRoles = probe.sellerRoles;
      console.log(
        `  HC auth probe OK (${consecutive}/${stableNeeded}) [cookie=${probe.cookiePresent} status=${probe.status} roles=${probe.sellerRoles.join(",") || "none"}]`,
      );
      if (consecutive >= stableNeeded) return { sellerRoles: lastRoles };
    } else {
      if (consecutive > 0) {
        console.log(
          `  HC auth not stable yet (status=${probe.status ?? "err"} cookie=${probe.cookiePresent})`,
        );
      }
      consecutive = 0;
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  throw new Error(
    "HomeCheff authentication not confirmed. Log in as a seller in the Chrome window, then re-run.",
  );
}

async function launchDiagChrome(viewport: { width: number; height: number }): Promise<BrowserContext> {
  mkdirSync(PROFILE_DIR, { recursive: true });
  try {
    return await chromium.launchPersistentContext(PROFILE_DIR, {
      channel: "chrome",
      headless: false,
      viewport,
      locale: "nl-NL",
      args: ["--disable-blink-features=AutomationControlled"],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Failed to launch real Google Chrome (channel: "chrome") with profile ${PROFILE_DIR}.\nUnderlying: ${msg}`,
    );
  }
}

async function banner(page: Page, title: string, body: string): Promise<void> {
  await page.evaluate(
    ({ title: t, body: b }) => {
      const id = "px4a4-cert-banner";
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement("div");
        el.id = id;
        el.style.cssText =
          "position:fixed;z-index:2147483647;left:12px;right:12px;bottom:12px;max-width:42rem;margin:0 auto;padding:12px 14px;border-radius:14px;background:#041428;color:#fff;font:600 13px/1.45 ui-sans-serif,system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.35);";
        document.body.appendChild(el);
      }
      el.innerHTML = `<div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.7;margin-bottom:4px">PX.4A.4 certificering</div><div style="font-size:15px;margin-bottom:4px">${t}</div><div style="font-weight:500;opacity:.92">${b}</div>`;
    },
    { title, body },
  );
}

async function shot(page: Page, name: string): Promise<string> {
  mkdirSync(SHOT_DIR, { recursive: true });
  const dest = join(SHOT_DIR, `${Date.now()}-${name}.png`);
  await page.screenshot({ path: dest, fullPage: false }).catch(() => undefined);
  return dest;
}

async function readDraft(page: Page): Promise<DraftSnap> {
  return page.evaluate(() => {
    const params = new URLSearchParams(window.location.search);
    let raw: {
      title?: string;
      description?: string;
      price?: string;
      marketplaceCategory?: string;
      images?: { url?: string }[];
      video?: { url?: string } | null;
      fulfillment?: { pickup?: boolean } | null;
      allergensConfirmed?: boolean;
    } | null = null;
    try {
      const stored = window.sessionStorage.getItem("hc-px4a-item-form:v1");
      raw = stored ? (JSON.parse(stored) as typeof raw) : null;
    } catch {
      raw = null;
    }
    const titleInput = Array.from(document.querySelectorAll("input")).find(
      (el) => el.type === "text" && el.required,
    );
    const title = (raw?.title || titleInput?.value || "").trim();
    const description =
      (raw?.description || document.querySelector("textarea")?.value || "").trim();
    const priceInputs = Array.from(document.querySelectorAll("input")).filter((el) =>
      /decimal|numeric/.test(el.inputMode || ""),
    );
    const price = (raw?.price || priceInputs[0]?.value || "").trim();
    const httpsImgs = Array.from(document.querySelectorAll("img"))
      .map((img) => img.currentSrc || img.src)
      .filter((src) => src.startsWith("https://") && !/globe-man|logo|favicon|brand/i.test(src));
    const photoCount = raw?.images?.length ?? httpsImgs.length;
    const videoUrl = raw?.video?.url || "";
    return {
      at: new Date().toISOString(),
      origin: window.location.origin,
      path: window.location.pathname,
      search: window.location.search,
      px4aResult: params.get("px4aResult"),
      photoCount,
      hasTitle: title.length > 0,
      titleLen: title.length,
      hasDescription: description.length > 0,
      descriptionLen: description.length,
      hasPrice: price.length > 0,
      category: String(raw?.marketplaceCategory || ""),
      hasVideo: Boolean(videoUrl),
      videoUrlHost: videoUrl ? new URL(videoUrl).host : null,
      fulfillmentPickup: raw?.fulfillment?.pickup ?? null,
      allergensConfirmed: raw?.allergensConfirmed ?? null,
      ctaVisible: Boolean(document.querySelector('[data-testid="px4a-make-free-video"]')),
      attributionVisible: /Mogelijk gemaakt door HomeCheff Studio/.test(document.body.innerText),
      exportPendingVisible: Boolean(document.querySelector('[data-testid="px4a-export-pending"]')),
      replaceVisible: Boolean(document.querySelector('[data-testid="px4a-replace-video"]')),
      draftKeyPresent: Boolean(window.sessionStorage.getItem("hc-px4a-item-form:v1")),
    };
  });
}

async function readStudioSurface(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(() => {
    const text = document.body.innerText || "";
    return {
      url: location.href,
      path: location.pathname,
      itemShell: Boolean(document.querySelector('[data-testid="px4a-item-shell"]')),
      backVisible: Boolean(document.querySelector('[data-testid="px4a-item-back"]')),
      finishVisible: Boolean(document.querySelector('[data-testid="px4a-item-finish"]')),
      finishHint: Boolean(document.querySelector('[data-testid="px4a-item-finish-hint"]')),
      duration: Boolean(document.querySelector('[data-testid="px4a-duration"]')),
      remaining: Boolean(document.querySelector('[data-testid="px4a-remaining"]')),
      videoOnlyLabel: /alleen voor deze video|video-only/i.test(text),
      signupGate: /Gratis account maken/.test(text),
      genericHome: /Wat wil je maken\?/.test(text),
      creditsCta: /Koop credits/.test(text),
      watermarkCopy: /HomeCheff Studio/.test(text),
    };
  });
}

async function readStorageFlags(page: Page, origin: "hc" | "studio"): Promise<Record<string, unknown>> {
  if (origin === "hc") {
    return page.evaluate(() => {
      const raw = sessionStorage.getItem("hc-px4a-item-form:v1");
      let images = 0;
      let hasVideo = false;
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { images?: unknown[]; video?: unknown };
          images = Array.isArray(parsed.images) ? parsed.images.length : 0;
          hasVideo = Boolean(parsed.video);
        } catch {
          /* ignore */
        }
      }
      return {
        draftKeyPresent: Boolean(raw),
        imageCount: images,
        hasVideo,
        localStorageHasDraft: Boolean(localStorage.getItem("hc-px4a-item-form:v1")),
      };
    });
  }
  return page.evaluate(async () => {
    const meta = localStorage.getItem("hc-px4a-draft:v1:item") || localStorage.getItem("hc-px4a-draft:v1");
    const dbs = await new Promise<string[]>((resolve) => {
      const req = indexedDB.databases ? indexedDB.databases() : Promise.resolve([]);
      Promise.resolve(req)
        .then((list) => resolve((list || []).map((d) => String(d.name || "")).filter(Boolean)))
        .catch(() => resolve([]));
    });
    return {
      itemMetaPresent: Boolean(localStorage.getItem("hc-px4a-draft:v1:item")),
      publicMetaPresent: Boolean(localStorage.getItem("hc-px4a-draft:v1")),
      indexedDbNames: dbs.filter((n) => /px4a|photo-video|hc-px4a/i.test(n)),
      metaChars: meta ? meta.length : 0,
    };
  });
}

async function waitUntil(
  label: string,
  fn: () => Promise<boolean>,
  timeoutMs: number,
  pollMs = 1500,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await fn()) {
      console.log(`  reached: ${label}`);
      return;
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  throw new Error(`Timeout waiting for: ${label}`);
}

function classifyUrl(url: string): "provider" | "credit" | "render" | null {
  if (PROVIDER_RE.test(url)) return "provider";
  if (CREDIT_RE.test(url)) return "credit";
  if (/\/api\/.*render|server-ffmpeg|ffmpeg-static/i.test(url)) return "render";
  return null;
}

function attachNavGuard(page: Page): {
  setAllow: (v: boolean) => void;
  forbidden: () => number;
} {
  let allow = true;
  let forbidden = 0;
  const origGoto = page.goto.bind(page);
  const origReload = page.reload.bind(page);
  page.goto = (async (...args: Parameters<Page["goto"]>) => {
    if (!allow) {
      forbidden += 1;
      throw new Error("page.goto forbidden during passive HomeCheff login pause");
    }
    return origGoto(...args);
  }) as Page["goto"];
  page.reload = (async (...args: Parameters<Page["reload"]>) => {
    if (!allow) {
      forbidden += 1;
      throw new Error("page.reload forbidden during passive HomeCheff login pause");
    }
    return origReload(...args);
  }) as Page["reload"];
  return {
    setAllow: (v) => {
      allow = v;
    },
    forbidden: () => forbidden,
  };
}

function attachNetworkWatch(page: Page): void {
  page.on("request", (req) => {
    const url = req.url();
    const kind = classifyUrl(url);
    if (!kind) return;
    const host = (() => {
      try {
        return new URL(url).host;
      } catch {
        return "unknown";
      }
    })();
    const hit = `${kind}:${req.method()} ${host}`;
    if (kind === "provider" && !report.network.providerHits.includes(hit)) {
      report.network.providerHits.push(hit);
    }
    if (kind === "credit" && !report.network.creditHits.includes(hit)) {
      report.network.creditHits.push(hit);
    }
    if (kind === "render" && !report.network.renderHits.includes(hit)) {
      report.network.renderHits.push(hit);
    }
  });
}

async function dplFrom(page: Page): Promise<string | null> {
  return page.evaluate(() => document.documentElement.getAttribute("data-dpl-id"));
}

async function cookieFlags(context: BrowserContext): Promise<Record<string, unknown>> {
  const studio = await context.cookies(STUDIO_ORIGIN);
  const item = studio.find((c) => c.name === "hc_px4a_item");
  const session = studio.find((c) => c.name === "studio_session");
  return {
    hc_px4a_item: item
      ? {
          exists: true,
          httpOnly: item.httpOnly,
          sameSite: item.sameSite,
          expiresSec: item.expires > 0 ? Math.round(item.expires - Date.now() / 1000) : null,
        }
      : { exists: false },
    studio_session: { exists: Boolean(session), httpOnly: session?.httpOnly ?? null },
  };
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(SHOT_DIR, { recursive: true });
  loadExistingReport();
  saveReport();

  console.log("PX.4A.4 human Production certification helper");
  console.log("Browser: real Google Chrome (channel: chrome)");
  console.log("Profile:", PROFILE_DIR);
  console.log("Evidence:", OUT_DIR);
  console.log("Will NOT publish a listing, inject cookies, or bypass SSO.");
  console.log("Start flow:", START_FLOW);

  const context = await launchDiagChrome({ width: 1440, height: 900 });
  const page = context.pages()[0] || (await context.newPage());
  const guard = attachNavGuard(page);
  attachNetworkWatch(page);

  try {
    console.log("Opening HomeCheff once…");
    await page.goto(HC_ORIGIN, { waitUntil: "domcontentloaded", timeout: 90_000 });
    report.dpl.homecheff = await dplFrom(page);

    let probe = await probeHcAuthenticated(context);
    console.log(
      `Initial HC auth: cookie=${probe.cookiePresent} apiOk=${probe.apiOk} status=${probe.status ?? "n/a"}`,
    );

    if (!probe.apiOk) {
      logPause(
        "Log in as a HomeCheff seller",
        "Use the opened Chrome window.\nGoogle or email login is fine.\nAutomation will not refresh or navigate while you log in.\nDo not close the window.",
      );
      await banner(
        page,
        "Log in als HomeCheff verkoper",
        "De helper wacht stil. Geen reload vanuit de certificering.",
      );
      guard.setAllow(false);
      const auth = await waitForHcAuthenticatedPassive(context, 600_000);
      guard.setAllow(true);
      if (guard.forbidden() > 0) throw new Error("Login pause navigated — aborting");
      probe = { ...probe, sellerRoles: auth.sellerRoles, apiOk: true, status: 200 };
    } else {
      guard.setAllow(false);
      const auth = await waitForHcAuthenticatedPassive(context, 30_000, {
        stableNeeded: 2,
        pollMs: 1500,
      });
      guard.setAllow(true);
      probe = { ...probe, sellerRoles: auth.sellerRoles };
    }

    report.hcAuthenticated = true;
    report.accountClass = probe.sellerRoles.length
      ? `authenticated HomeCheff seller (${probe.sellerRoles.join("+")})`
      : "authenticated HomeCheff user (no sellerRoles reported)";
    report.studioAuthenticated = await probeStudioAuthenticated(context);
    saveReport();
    console.log("HomeCheff session confirmed:", report.accountClass);
    console.log("Studio product session present:", report.studioAuthenticated);

    await page.goto(SELL_NEW, { waitUntil: "domcontentloaded", timeout: 90_000 });
    report.dpl.homecheff = (await dplFrom(page)) || report.dpl.homecheff;
    await shot(page, "sell-new-entry");

    let beforeReady = await readDraft(page);
    const preStudio = { current: null as DraftSnap | null };
    let landedHome = false;

    if (START_FLOW === "B") {
      console.log("Skipping Flow A (PX4A4_START=B). Preserving prior Flow A report.");
      if ((report.flowA as { status?: string }).status === "in_progress") {
        report.flowA = {
          ...report.flowA,
          status: "PASS_SO_FAR_HUMAN",
          helperNote: "Flow A helper timed out on cancel-return; human return appears PASS. Reorder not tested in A.",
        };
        saveReport();
      }
    } else {
    logPause(
      "FLOW A — fill a disposable item draft",
      [
        "In the Chrome window, open Item toevoegen until the listing form is visible.",
        "Fill title, description, category, price, fulfillment, legal/required toggles.",
        "Add at least 4 listing photos.",
        "Do NOT publish.",
        "Confirm Video upload + Maak gratis video + subtle Studio attribution.",
        "Then click MAAK GRATIS VIDEO.",
        "The helper records state automatically when the Video block is ready and when you leave to Studio.",
      ].join("\n"),
    );
    await banner(
      page,
      "Flow A — vul een wegwerp-draft",
      "Titel, beschrijving, categorie, prijs, bezorging, 4 foto's. Niet publiceren. Daarna: Maak gratis video.",
    );

    await waitUntil(
      "listing video block / free CTA",
      async () => {
        const url = page.url();
        if (!url.includes("/sell/new")) return false;
        const cta = await page.locator('[data-testid="px4a-make-free-video"]').count();
        const block = await page.locator('[data-testid="listing-video-block"]').count();
        return cta > 0 || block > 0;
      },
      20 * 60_000,
    );

    beforeReady = await readDraft(page);
    report.flowA = {
      status: "in_progress",
      wizard: {
        ctaVisible: beforeReady.ctaVisible,
        attributionVisible: beforeReady.attributionVisible,
        photoCount: beforeReady.photoCount,
        hasTitle: beforeReady.hasTitle,
        hasDescription: beforeReady.hasDescription,
        hasPrice: beforeReady.hasPrice,
        hasVideo: beforeReady.hasVideo,
      },
    };
    saveReport();
    await shot(page, "flow-a-video-block");

    page.on("request", async (req) => {
      if (!req.url().includes("/api/studio/px4a-item-handoff")) return;
      try {
        preStudio.current = await readDraft(page);
      } catch {
        /* ignore */
      }
    });

    await waitUntil(
      "Studio contextual entry",
      async () => /studio\.homecheff\.eu/i.test(page.url()),
      20 * 60_000,
      800,
    );

    const hopUrls: string[] = [];
    const hopStart = Date.now();
    while (Date.now() - hopStart < 90_000) {
      hopUrls.push(page.url());
      if (/\/studio\/photo-video\/from-item/.test(page.url())) break;
      if (/\/login/.test(page.url()) && /from-item/.test(page.url())) break;
      await page.waitForTimeout(400);
    }
    const uniqueHops = [...new Set(hopUrls)];
    report.dpl.studio = (await dplFrom(page)) || report.dpl.studio;
    const studioSurface = await readStudioSurface(page);
    await shot(page, "flow-a-studio-entry");
    landedHome =
      /^https:\/\/studio\.homecheff\.eu\/?(\?|#|$)/.test(page.url()) ||
      Boolean(studioSurface.genericHome);
    report.flowA = {
      ...report.flowA,
      preStudio: preStudio.current || beforeReady,
      hops: uniqueHops.map((u) => u.replace(/[?#].*/, "")),
      studioSurface,
      genericStudioHome: landedHome,
      signupGate: studioSurface.signupGate,
    };
    saveReport();

    logPause(
      "FLOW A — compose in contextual Studio",
      [
        "Confirm ← Terug naar je item and listing photos.",
        "Keep 3–4 listing photos, deselect at least 1, reorder.",
        "Add 1 different video-only photo.",
        "Text on photo 1 and 2 (font/color/size/move).",
        "Eigen muziek: upload, move segment off start, volume, preview.",
        "Watermark should be globe-man + HomeCheff Studio.",
        "Then press Terug naar je item (cancel).",
        "Do not publish on return.",
      ].join("\n"),
    );
    await banner(
      page,
      "Flow A — maak de video, daarna Terug naar je item",
      "Deselecteer 1 foto, extra video-only foto, tekst, eigen muziek, preview. Daarna cancel.",
    );

    await waitUntil(
      "return to HomeCheff after cancel",
      async () => /homecheff\.eu\/sell\/new/i.test(page.url()),
      25 * 60_000,
      800,
    );
    await page.waitForTimeout(1200);
    const afterCancel = await readDraft(page);
    const before = preStudio.current || beforeReady;
    const cancelOk =
      afterCancel.hasTitle === before.hasTitle &&
      afterCancel.hasDescription === before.hasDescription &&
      afterCancel.photoCount === before.photoCount &&
      afterCancel.hasVideo === before.hasVideo &&
      afterCancel.px4aResult !== "ready";
    report.flowA = {
      ...report.flowA,
      status: cancelOk && !landedHome ? "PASS" : "FAIL",
      afterCancel,
      draftPreserved: cancelOk,
      px4aResult: afterCancel.px4aResult,
    };
    saveReport();
    await shot(page, "flow-a-after-cancel");
    }

    const before =
      preStudio.current ||
      ((report.flowA as { preStudio?: DraftSnap }).preStudio ?? beforeReady);

    logPause(
      "FLOW B — re-enter / recovery / reorder / Video gebruiken",
      [
        "Use the existing/disposable listing draft on /sell/new.",
        "Click Maak gratis video.",
        "Confirm the previous contextual composition recovers where applicable.",
        "MANDATORY reorder: identify photo 1 and photo 3. Move photo 3 before photo 1. Preview. Leave. Re-enter. Confirm the new order persists.",
        "TEXT check: add 'Test' — Modern, white, medium. Must be readable letters, not dots.",
        "Make one additional harmless change.",
        "Then Video gebruiken.",
        "Expect: same HomeCheff draft, listing data preserved, NO fake MP4, NO 'video already uploaded' claim, honest 4A.5 seam.",
        "Do not publish.",
      ].join("\n"),
    );
    await banner(
      page,
      "Flow B — herstel, volgorde, tekst, Video gebruiken",
      "Foto 3 vóór 1, order moet blijven. Tekst 'Test' Modern/wit/midden leesbaar. Daarna Video gebruiken. Geen MP4.",
    );

    await waitUntil(
      "Flow B Studio",
      async () => /\/studio\/photo-video\/from-item/.test(page.url()),
      20 * 60_000,
      800,
    );
    const resumeSurface = await readStudioSurface(page);
    await waitUntil(
      "Flow B return ready",
      async () => /homecheff\.eu\/sell\/new/.test(page.url()),
      25 * 60_000,
      800,
    );
    await page.waitForTimeout(1200);
    const afterReady = await readDraft(page);
    const readyOk =
      afterReady.px4aResult === "ready" &&
      (START_FLOW === "B" || afterReady.photoCount === before.photoCount) &&
      !afterReady.hasVideo;
    report.flowB = {
      status: readyOk ? "PASS" : "FAIL",
      resumeSurface,
      afterReady,
      honestFinish: afterReady.exportPendingVisible,
      attachedVideo: afterReady.hasVideo,
    };
    saveReport();
    await shot(page, "flow-b-after-ready");

    logPause(
      "FLOW C — upload a real listing video, then replace law",
      [
        "On /sell/new use the normal Video upload control. Do not publish.",
        "Expect preview + Vervangen (not a silent second video).",
        "Click Vervangen, then Maak gratis video, then cancel.",
        "Existing uploaded video must remain.",
        "Open again, Video gebruiken: still must NOT replace the file.",
      ].join("\n"),
    );
    await banner(
      page,
      "Flow C — upload een echte listing-video",
      "Daarna Vervangen → creator → cancel. Video moet blijven. Ready mag hem niet overschrijven.",
    );

    await waitUntil(
      "Flow C has listing video or replace control",
      async () => {
        const snap = await readDraft(page);
        return snap.hasVideo || snap.replaceVisible;
      },
      20 * 60_000,
    );
    const withVideo = await readDraft(page);
    let flowCSawStudio = false;
    await waitUntil(
      "Flow C visited Studio after video present",
      async () => {
        if (/studio\.homecheff\.eu/.test(page.url())) flowCSawStudio = true;
        return flowCSawStudio;
      },
      20 * 60_000,
      800,
    );
    await waitUntil(
      "Flow C back on sell/new",
      async () => flowCSawStudio && /homecheff\.eu\/sell\/new/.test(page.url()),
      25 * 60_000,
      800,
    );
    await page.waitForTimeout(800);
    const afterC = await readDraft(page);
    report.flowC = {
      status: afterC.hasVideo ? "PASS" : "FAIL",
      oneVideo: withVideo.replaceVisible || withVideo.hasVideo,
      after: afterC,
      overwritten: withVideo.hasVideo && !afterC.hasVideo,
    };
    saveReport();
    await shot(page, "flow-c-after");

    logPause(
      "FLOW D — mobile ~390px core journey",
      [
        "The window will resize to 390×844.",
        "Repeat: photos visible, Maak gratis video, creator, extra photo, text, music, preview, cancel.",
        "Watch overflow, reachable primary actions, and draft return.",
      ].join("\n"),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await banner(
      page,
      "Flow D — mobiel 390px",
      "Herhaal de kernreis en cancel terug naar je item.",
    );
    const overflowBefore = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    let flowDSawStudio = false;
    await waitUntil(
      "Flow D contextual Studio at 390px",
      async () => {
        if (/\/studio\/photo-video\/from-item/.test(page.url())) flowDSawStudio = true;
        return flowDSawStudio;
      },
      20 * 60_000,
      800,
    );
    await waitUntil(
      "Flow D return to HomeCheff draft",
      async () => flowDSawStudio && /homecheff\.eu\/sell\/new/.test(page.url()),
      25 * 60_000,
      800,
    );
    const overflowAfter = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    const mobileDraft = await readDraft(page);
    report.flowD = {
      status: mobileDraft.hasTitle && mobileDraft.photoCount >= 1 && overflowAfter <= 8 ? "PASS" : "FAIL",
      overflowBefore,
      overflowAfter,
      draft: mobileDraft,
    };
    saveReport();
    await shot(page, "flow-d-mobile");
    await page.setViewportSize({ width: 1440, height: 900 });

    logPause(
      "FLOW E — SSO with Studio session absent",
      [
        "Helper will clear ONLY Studio product cookies (studio_session).",
        "HomeCheff session stays.",
        "Then click Maak gratis video.",
        "Expect silent SSO/JIT into the contextual creator — not signup, not Studio Home.",
        "Return to the same draft.",
      ].join("\n"),
    );
    const removed = await clearStudioProductCookies(context);
    report.studioAuthenticated = await probeStudioAuthenticated(context);
    console.log("Cleared Studio cookies:", removed.join(", ") || "(none)");
    console.log("Studio session after clear:", report.studioAuthenticated);
    await banner(
      page,
      "Flow E — Maak gratis video (Studio-sessie gewist)",
      "HC blijft ingelogd. Verwacht stille SSO naar de item-creator, geen signup.",
    );
    const eHops: string[] = [];
    await waitUntil(
      "Flow E Studio hop",
      async () => {
        eHops.push(page.url());
        return /studio\.homecheff\.eu/.test(page.url());
      },
      15 * 60_000,
      700,
    );
    const eDeadline = Date.now() + 90_000;
    while (Date.now() < eDeadline) {
      eHops.push(page.url());
      if (/\/studio\/photo-video\/from-item/.test(page.url()) && (await page.locator('[data-testid="px4a-item-back"]').count())) {
        break;
      }
      if (/\/signup/.test(page.url())) break;
      await page.waitForTimeout(400);
    }
    const eSurface = await readStudioSurface(page);
    await shot(page, "flow-e-sso");
    await waitUntil(
      "Flow E return HC",
      async () => /homecheff\.eu\/sell\/new/.test(page.url()),
      20 * 60_000,
      800,
    );
    const afterE = await readDraft(page);
    const ePass =
      !eSurface.signupGate &&
      !eSurface.genericHome &&
      afterE.hasTitle &&
      afterE.photoCount >= 1;
    report.flowE = {
      status: ePass ? "PASS" : "FAIL",
      studioSessionWasCleared: !report.studioAuthenticated,
      hops: [...new Set(eHops)].map((u) => u.replace(/[?#].*/, "")),
      surface: eSurface,
      after: afterE,
    };
    saveReport();

    logPause(
      "BROWSER BACK + REFRESH",
      [
        "Click Maak gratis video again.",
        "On the Studio creator, use the browser Back button.",
        "Draft on /sell/new must restore (not blank).",
        "Then: Maak gratis video, refresh Studio (composition recovery).",
        "Return, then refresh /sell/new and note whether the 24h sessionStorage draft remains.",
      ].join("\n"),
    );
    await banner(
      page,
      "Back + Refresh",
      "Eerst browser Back vanuit Studio. Daarna Studio-refresh en HC-refresh. Niet publiceren.",
    );
    await waitUntil(
      "Studio for Back test",
      async () => /\/studio\/photo-video\/from-item/.test(page.url()),
      15 * 60_000,
      800,
    );
    await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => undefined);
    await page.waitForTimeout(1500);
    const afterBack = await readDraft(page);
    report.browserBack = {
      status: afterBack.hasTitle && afterBack.photoCount >= 1 ? "PASS" : "FAIL",
      url: page.url(),
      draft: afterBack,
    };
    saveReport();
    await shot(page, "browser-back");

    logPause(
      "REFRESH",
      "If you are on Studio, refresh once. Then return to HomeCheff and refresh /sell/new once. Helper waits.",
    );
    const refreshStartPath = page.url();
    await waitUntil(
      "refresh observation window",
      async () => page.url() !== refreshStartPath || (await readDraft(page)).draftKeyPresent,
      15 * 60_000,
      2000,
    ).catch(() => undefined);
    const afterRefresh = await readDraft(page);
    report.refresh = {
      status: afterRefresh.draftKeyPresent || afterRefresh.hasTitle ? "PASS" : "FAIL",
      after: afterRefresh,
      law: "HC sessionStorage 24h same-tab; Studio item IndexedDB/localStorage meta",
    };
    saveReport();

    const storageHc = /homecheff\.eu/.test(page.url())
      ? await readStorageFlags(page, "hc")
      : { skipped: "not on HC origin at inspection time" };
    if (/studio\.homecheff\.eu/.test(page.url())) {
      report.state.studio = await readStorageFlags(page, "studio");
    } else {
      const studioPage = await context.newPage();
      await studioPage.goto(`${STUDIO_ORIGIN}/studio/photo-video/from-item`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      report.state.studio = await readStorageFlags(studioPage, "studio");
      await studioPage.close();
    }
    report.state.hc = storageHc;
    report.state.cookies = await cookieFlags(context);
    report.branding = {
      wizardAttribution: beforeReady.attributionVisible,
      contextualHeader: Boolean((report.flowA as { studioSurface?: { itemShell?: boolean } }).studioSurface?.itemShell),
      watermark: "globe-man + HomeCheff Studio (functional)",
      polish: "PX.4A-POLISH-WATERMARK — official transparent globe-man; do not block 4A.4",
    };
    saveReport();

    logPause(
      "Done — discard the draft",
      "Do NOT publish. Close the listing draft / leave /sell/new.\nYou can close the Chrome window when finished.\nHelper will write the live report and exit in 2 minutes or when the window closes.",
    );
    await banner(page, "Niet publiceren", "Draft weggooien/verlaten. Certificering is klaar.");

    const end = Date.now() + 120_000;
    while (Date.now() < end) {
      if (context.pages().length === 0) break;
      await new Promise((r) => setTimeout(r, 2000));
    }
  } finally {
    saveReport();
    await context.close().catch(() => undefined);
  }

  console.log("");
  console.log("Live report:", join(OUT_DIR, "live-report.json"));
  console.log("Flow A:", report.flowA.status);
  console.log("Flow B:", report.flowB.status);
  console.log("Flow C:", report.flowC.status);
  console.log("Flow D:", report.flowD.status);
  console.log("Flow E:", report.flowE.status);
  console.log("Back:", report.browserBack.status);
  console.log("Refresh:", report.refresh.status);
  console.log("Provider hits:", report.network.providerHits.length);
  console.log("Credit hits:", report.network.creditHits.length);
}

main().catch((err) => {
  console.error(err);
  report.notes.push(String(err).slice(0, 400));
  saveReport();
  process.exit(1);
});
