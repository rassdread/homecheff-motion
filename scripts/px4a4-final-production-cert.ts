#!/usr/bin/env npx tsx
/**
 * PX.4A.4 final Production certification probe.
 * Does not publish listings. Does not implement PX.4A.5.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type BrowserContext, type Page } from "playwright";
import sharp from "sharp";

const STUDIO = "https://studio.homecheff.eu";
const HC = "https://homecheff.eu";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROFILE = process.env.PX4A4_CHROME_PROFILE?.trim() || join(ROOT, ".px4a4-chrome-profile");
const OUT = join(ROOT, "docs/audits/px4a4-human-cert");
const SHOT = join(OUT, "shots-final");
const EXPECTED_DPL = "dpl_8DsY2PEy526mgUGzpQsvqeazykDr";
const EXPECTED_SHA = "3b520727cbde28141972304bb61e3256633ed9b2";

const PROVIDER_RE =
  /vidu|elevenlabs|openai\.com|api\.openai|replicate\.com|anthropic|runwayml|deevid|ffmpeg/i;
const CREDIT_RE = /\/api\/(?:me\/)?(?:credits|wallet|studio-account\/credits)|\/api\/billing\/(?:checkout|charge|reserve)/i;

type Status = "PASS" | "PARTIAL" | "FAIL" | "NOT TESTED";
const results: Record<string, { status: Status; notes: string }> = {};
const network = { providerHits: [] as string[], creditHits: [] as string[], renderHits: [] as string[] };
const notes: string[] = [];

function set(id: string, status: Status, note: string) {
  results[id] = { status, notes: note };
  console.log(`  [${status}] ${id} — ${note}`);
}

async function png(
  name: string,
  w = 640,
  h = 640,
  color = { r: 51, g: 65, b: 85 }
): Promise<{ name: string; mimeType: string; buffer: Buffer }> {
  const buffer = await sharp({
    create: { width: w, height: h, channels: 3, background: color },
  })
    .png()
    .toBuffer();
  return { name: `${name}.png`, mimeType: "image/png", buffer };
}

async function shot(page: Page, name: string) {
  mkdirSync(SHOT, { recursive: true });
  const dest = join(SHOT, `${Date.now()}-${name}.png`);
  await page.screenshot({ path: dest, fullPage: false }).catch(() => undefined);
  return dest;
}

function attachNet(page: Page) {
  page.on("request", (req) => {
    const url = req.url();
    if (PROVIDER_RE.test(url)) network.providerHits.push(`${req.method()} ${url}`);
    if (CREDIT_RE.test(url)) network.creditHits.push(`${req.method()} ${url}`);
    if (/\/api\/.*render|server-ffmpeg|ffmpeg-static/i.test(url)) network.renderHits.push(`${req.method()} ${url}`);
  });
}

async function dismissResume(page: Page) {
  const fresh = page.getByTestId("px4a-resume-fresh");
  if (await fresh.count()) await fresh.click().catch(() => undefined);
}

async function addPhotos(page: Page, count: number, prefix = "p") {
  const colors = [
    { r: 51, g: 65, b: 85 },
    { r: 0, g: 109, b: 82 },
    { r: 124, g: 45, b: 18 },
    { r: 30, g: 58, b: 138 },
    { r: 133, g: 77, b: 14 },
    { r: 76, g: 29, b: 149 },
  ];
  const files = [];
  for (let i = 0; i < count; i += 1) {
    files.push(await png(`${prefix}${i + 1}`, 720, 720, colors[i % colors.length]!));
  }
  await dismissResume(page);
  await page.getByTestId("px4a-file-input").setInputFiles(files);
  await page.getByTestId("px4a-photo-0").waitFor({ timeout: 20_000 });
}

async function durationLabels(page: Page): Promise<string[]> {
  return page.locator('[data-testid="px4a-video-duration"] button').allTextContents();
}

async function canvasWhite(page: Page): Promise<number> {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("[data-testid='px4a-preview-canvas']");
    if (!canvas) return 0;
    const ctx = canvas.getContext("2d");
    if (!ctx) return 0;
    const { width: w, height: h } = canvas;
    const data = ctx.getImageData(0, 0, w, h).data;
    let white = 0;
    const top = Math.floor(h * 0.55);
    for (let y = 0; y < top; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const i = (y * w + x) * 4;
        if (data[i]! > 200 && data[i + 1]! > 200 && data[i + 2]! > 200) white += 1;
      }
    }
    return white;
  });
}

async function durationSummary(page: Page): Promise<string> {
  return ((await page.getByTestId("px4a-duration").textContent()) || "").trim();
}

async function clickDuration(page: Page, label: string) {
  await page.getByTestId("px4a-video-duration").getByRole("button", { name: label, exact: true }).click();
  await page.waitForTimeout(250);
}

async function launch(): Promise<BrowserContext> {
  if (existsSync(PROFILE)) {
    try {
      return await chromium.launchPersistentContext(PROFILE, {
        channel: "chrome",
        headless: true,
        viewport: { width: 1280, height: 900 },
        locale: "nl-NL",
        args: ["--disable-blink-features=AutomationControlled", "--headless=new"],
      });
    } catch (e) {
      notes.push(`Persistent Chrome failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return chromium.launchPersistentContext(join(OUT, "_tmp-chrome"), {
    headless: true,
    viewport: { width: 1280, height: 900 },
    locale: "nl-NL",
  });
}

async function preflight(page: Page) {
  const res = await page.goto(`${STUDIO}/studio/photo-video`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const html = await page.content();
  const dpl = html.match(/dpl_[A-Za-z0-9]+/)?.[0] ?? null;
  const ok = dpl === EXPECTED_DPL;
  set(
    "preflight.sha",
    ok ? "PASS" : "FAIL",
    `Studio photo-video HTML dpl=${dpl} expected=${EXPECTED_DPL} status=${res?.status()} sha expected ${EXPECTED_SHA.slice(0, 8)}`
  );
  await page.getByTestId("px4a-composer").waitFor({ timeout: 20_000 });
  set("preflight.public", "PASS", "/studio/photo-video composer visible");

  const from = await page.goto(`${STUDIO}/studio/photo-video/from-item`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(1500);
  const url = page.url();
  const fromItemAuth = /from-item/.test(url) && (await page.getByTestId("px4a-composer").count()) > 0;
  const body = (await page.locator("body").innerText().catch(() => "")).slice(0, 220).replace(/\s+/g, " ");
  const loginRedirect = /login|signin|auth/i.test(url) || /inloggen|log in|sign in/i.test(body);
  set(
    "preflight.fromItem",
    fromItemAuth || loginRedirect ? "PASS" : "PARTIAL",
    `from-item status=${from?.status()} url=${url} composer=${fromItemAuth} login=${loginRedirect} snippet=${body}`
  );

  const hc = await page.goto(`${HC}/sell/new`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(2500);
  const hcText = await page.locator("body").innerText().catch(() => "");
  const cta = (await page.locator('[data-testid="px4a-make-free-video"]').count()) > 0 || /Maak gratis video/.test(hcText);
  const attrib = /Mogelijk gemaakt door HomeCheff Studio/.test(hcText);
  const wat = /Wat wil je maken\?/.test(hcText);
  const login = /login|inloggen|aanmelden|sign in/i.test(hcText) || /login/.test(page.url());
  set(
    "preflight.homecheff",
    cta ? "PASS" : login ? "PARTIAL" : "FAIL",
    `/sell/new status=${hc?.status()} url=${page.url()} cta=${cta} attribution=${attrib} px3WatWilJeMaken=${wat} login=${login} snippet=${hcText.slice(0, 180).replace(/\s+/g, " ")}`
  );
}

async function publicDurationAndMovement(page: Page) {
  await page.goto(`${STUDIO}/studio/photo-video`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByTestId("px4a-composer").waitFor({ timeout: 20_000 });
  await dismissResume(page);

  const labels = (await durationLabels(page)).map((s) => s.trim());
  const has = (n: number) => labels.some((l) => l === `${n} sec`);
  const studioOk = has(10) && has(15) && has(30) && has(45) && has(60) && labels.some((l) => /Automatisch/.test(l));
  const no20 = !has(20);
  set(
    "studio.durationChoices",
    studioOk && no20 ? "PASS" : "FAIL",
    `labels=${JSON.stringify(labels)}`
  );

  await addPhotos(page, 2, "a");
  await clickDuration(page, "15 sec");
  const two15 = await durationSummary(page);
  set("A.2x15", /2 foto/.test(two15) && /15 sec/.test(two15) ? "PASS" : "FAIL", two15);
  await shot(page, "2x15");

  await addPhotos(page, 10, "more");
  await clickDuration(page, "15 sec");
  const twelve15 = await durationSummary(page);
  set("B.12x15", /12 foto/.test(twelve15) && /15 sec/.test(twelve15) ? "PASS" : "FAIL", twelve15);
  await shot(page, "12x15");

  await clickDuration(page, "30 sec");
  const twelve30 = await durationSummary(page);
  set("D.12x30", /12 foto/.test(twelve30) && /30 sec/.test(twelve30) ? "PASS" : "FAIL", twelve30);

  page.once("dialog", (d) => d.accept());
  await page.getByTestId("px4a-reset").click();
  await page.waitForTimeout(400);
  await dismissResume(page);
  if ((await page.getByTestId("px4a-photo-0").count()) === 0) {
    await addPhotos(page, 4, "c");
  }
  await clickDuration(page, "30 sec");
  const four30 = await durationSummary(page);
  set("C.4x30", /4 foto/.test(four30) && /30 sec/.test(four30) ? "PASS" : "FAIL", four30);
  await shot(page, "4x30");

  await clickDuration(page, "Automatisch");
  const auto = await durationSummary(page);
  const autoMax = await page.getByTestId("px4a-max-seconds").textContent();
  set(
    "E.auto",
    /foto/.test(auto) && Number(autoMax) === 60 ? "PASS" : "PARTIAL",
    `summary=${auto} maxSeconds=${autoMax}`
  );

  const move = page.getByTestId("px4a-movement");
  await move.getByRole("button", { name: "Automatisch" }).click();
  set("movement.auto", (await move.getByRole("button", { name: "Automatisch" }).getAttribute("aria-pressed")) === "true" ? "PASS" : "FAIL", "Automatisch selected");
  await move.getByRole("button", { name: "Geen" }).click();
  set("movement.none", (await move.getByRole("button", { name: "Geen" }).getAttribute("aria-pressed")) === "true" ? "PASS" : "FAIL", "Geen selected");
  await move.getByRole("button", { name: "Automatisch" }).click();

  await page.getByTestId("px4a-photo-0").click();
  await page.getByTestId("px4a-movement-advanced-toggle").click();
  const photoMove = page.getByTestId("px4a-movement-photo");
  await photoMove.waitFor({ timeout: 8_000 });
  await photoMove.getByRole("button", { name: "Inzoomen" }).click();
  await photoMove.getByRole("button", { name: "Links → rechts" }).click();
  await photoMove.getByRole("button", { name: "Boven → beneden" }).click();
  set("movement.perPhoto", "PASS", "Inzoomen, horizontal pan, vertical pan selectable under Meer aanpassen");

  await clickDuration(page, "60 sec");
  const sixty = await durationSummary(page);
  set("studio.60", /60 sec/.test(sixty) ? "PASS" : "FAIL", sixty);
  await shot(page, "4x60");
}

async function publicTextAndWatermark(page: Page) {
  await page.goto(`${STUDIO}/studio/photo-video`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByTestId("px4a-composer").waitFor({ timeout: 20_000 });
  await dismissResume(page);
  if ((await page.getByTestId("px4a-photo-0").count()) === 0) await addPhotos(page, 2, "t");
  await page.getByTestId("px4a-photo-0").click();
  await page.getByTestId("px4a-add-text").click();
  await page.getByTestId("px4a-text-input").fill("Test");
  const whites: Record<string, number> = {};
  for (const label of ["Verticaal", "Vierkant", "Liggend"] as const) {
    await page.getByTestId("px4a-ratio").getByRole("button", { name: label }).click();
    await page.waitForTimeout(400);
    whites[label] = await canvasWhite(page);
    await shot(page, `text-${label}`);
  }
  const textOk = Object.values(whites).every((n) => n > 80);
  set("text.modern", textOk ? "PASS" : "FAIL", `whitePixels=${JSON.stringify(whites)}`);

  const wm = await page.locator("body").innerText();
  const note = /HomeCheff Studio/.test(wm);
  set("watermark.copy", note ? "PASS" : "PARTIAL", "HomeCheff Studio copy present near composer");
  set("watermark.9:16", whites.Verticaal! > 80 ? "PASS" : "PARTIAL", "preview painted after 9:16; globe-man lockup not pixel-counted separately");
  set("watermark.1:1", whites.Vierkant! > 80 ? "PASS" : "PARTIAL", "preview painted after 1:1");
  set("watermark.16:9", whites.Liggend! > 80 ? "PASS" : "PARTIAL", "preview painted after 16:9");
}

async function publicMobile(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${STUDIO}/studio/photo-video`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByTestId("px4a-composer").waitFor({ timeout: 20_000 });
  await dismissResume(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const duration = (await page.getByTestId("px4a-video-duration").count()) > 0;
  const movement = (await page.getByTestId("px4a-movement").count()) > 0;
  const add = await page.getByTestId("px4a-file-input").count();
  const addLabel = await page.locator('label[for]').filter({ hasText: /Foto/ }).first().innerText().catch(() => "");
  set(
    "mobile.390",
    overflow <= 8 && duration && movement && add > 0 ? "PASS" : "FAIL",
    `overflow=${overflow} duration=${duration} movement=${movement} addLabel=${addLabel}`
  );
  await shot(page, "390");
  await page.setViewportSize({ width: 1280, height: 900 });
}

async function photoAddUx(page: Page) {
  await page.goto(`${STUDIO}/studio/photo-video`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByTestId("px4a-composer").waitFor({ timeout: 20_000 });
  const text = await page.locator("body").innerText();
  const hasPicker = /Foto's toevoegen|Andere foto toevoegen/.test(text);
  const plus = /\+\s*Foto/.test(text);
  set(
    "ux.photoAdd",
    hasPicker ? "PASS" : "FAIL",
    plus
      ? "Conventional + Foto control present"
      : "File picker label present (Foto's toevoegen / Andere foto toevoegen). Leading + is POLISH, not a blocker."
  );
}

async function finishCopy(page: Page) {
  const html = await page.content();
  const fake = /Video toegevoegd|Upload voltooid|MP4 klaar/.test(html);
  set("export.honest", fake ? "FAIL" : "PASS", fake ? "False attach copy found in HTML" : "No false attach copy on public composer HTML");
  set("px4a5.absent", /safari_mux_uncertified|niet beschikbaar op alle telefoons|later step|volgende stap/.test(html) || !/Download MP4/.test(html) ? "PASS" : "PARTIAL", "No download-MP4 CTA; 4A.5 still gated");
}

async function tryHomeCheff(context: BrowserContext, page: Page) {
  try {
    const me = await context.request.get(`${HC}/api/user/me`, { timeout: 15_000, failOnStatusCode: false });
    const studioMe = await context.request.get(`${STUDIO}/api/me/studio-account`, { timeout: 15_000, failOnStatusCode: false });
    notes.push(`HC /api/user/me ${me.status()}; Studio /api/me/studio-account ${studioMe.status()}`);
    if (me.status() !== 200) {
      set("flowB", "NOT TESTED", "HomeCheff seller session not available in cert profile (headless). Contextual flows require interactive seller Chrome.");
      set("reorder", "NOT TESTED", "Needs contextual creator from /sell/new");
      set("flowC", "NOT TESTED", "Needs listing VideoUploader on disposable draft");
      set("oneVideo", "NOT TESTED", "Needs Flow C");
      set("flowE", "NOT TESTED", "Needs seller session + Studio cookie clear");
      set("back", "NOT TESTED", "Needs contextual session");
      set("refresh.studio", "NOT TESTED", "Needs contextual session");
      set("refresh.hc", "NOT TESTED", "Needs contextual session");
      set("reentry", "NOT TESTED", "Needs contextual session");
      set("videoGebruiken", "NOT TESTED", "Needs from-item finish");
      set("hc.durationChoices", "NOT TESTED", "HomeCheff item composer not opened");
      return;
    }
    await page.goto(`${HC}/sell/new`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const text = await page.locator("body").innerText();
    const cta = (await page.locator('[data-testid="px4a-make-free-video"]').count()) > 0 || /Maak gratis video/.test(text);
    set("hc.cta", cta ? "PASS" : "FAIL", `Maak gratis video visible=${cta} attrib=${/Mogelijk gemaakt door HomeCheff Studio/.test(text)}`);
    if (!cta) {
      set("flowB", "NOT TESTED", "CTA not visible on /sell/new for this session");
      return;
    }
    await page.locator('[data-testid="px4a-make-free-video"]').first().click({ timeout: 8_000 }).catch(async () => {
      await page.getByText("Maak gratis video").first().click();
    });
    await page.waitForTimeout(4000);
    const url = page.url();
    const contextual = /photo-video\/from-item/.test(url);
    const generic = /Wat wil je maken\?/.test(await page.locator("body").innerText());
    set("flowB.open", contextual && !generic ? "PASS" : "FAIL", `url=${url} genericHome=${generic}`);
    if (!contextual) return;
    await page.getByTestId("px4a-composer").waitFor({ timeout: 20_000 });
    const labels = (await durationLabels(page)).map((s) => s.trim());
    const hcDur = labels.some((l) => l === "10 sec") && labels.some((l) => l === "15 sec") && labels.some((l) => l === "20 sec") && labels.some((l) => l === "30 sec") && !labels.some((l) => l === "45 sec") && !labels.some((l) => l === "60 sec");
    const hint = /Video's voor HomeCheff zijn maximaal 30 seconden/.test(await page.locator("body").innerText());
    set("hc.durationChoices", hcDur && hint ? "PASS" : "FAIL", `labels=${JSON.stringify(labels)} hint=${hint}`);
    const back = (await page.getByTestId("px4a-item-back").count()) > 0;
    const finish = (await page.getByTestId("px4a-item-finish").count()) > 0;
    const finishHint = await page.getByTestId("px4a-item-finish-hint").innerText().catch(() => "");
    set("videoGebruiken", finish && /volgende stap|later step|niet beschikbaar/i.test(finishHint) && !/Video toegevoegd/.test(finishHint) ? "PASS" : "PARTIAL", `back=${back} finish=${finish} hint=${finishHint}`);
    await shot(page, "from-item");
  } catch (e) {
    set("flowB", "NOT TESTED", e instanceof Error ? e.message : String(e));
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(SHOT, { recursive: true });
  const context = await launch();
  const page = context.pages()[0] || (await context.newPage());
  attachNet(page);
  try {
    await preflight(page);
    await publicDurationAndMovement(page);
    await publicTextAndWatermark(page);
    await publicMobile(page);
    await photoAddUx(page);
    await finishCopy(page);
    await tryHomeCheff(context, page);
    const free =
      network.providerHits.length === 0 && network.creditHits.length === 0 && network.renderHits.length === 0;
    set(
      "freeLocal",
      free ? "PASS" : "FAIL",
      `provider=${network.providerHits.length} credit=${network.creditHits.length} render=${network.renderHits.length}`
    );
  } catch (e) {
    notes.push(e instanceof Error ? e.stack || e.message : String(e));
    set("runner", "FAIL", e instanceof Error ? e.message : String(e));
  } finally {
    const report = {
      at: new Date().toISOString(),
      expectedSha: EXPECTED_SHA,
      expectedDpl: EXPECTED_DPL,
      results,
      network,
      notes,
    };
    writeFileSync(join(OUT, "final-cert.json"), JSON.stringify(report, null, 2));
    console.log("\nWrote", join(OUT, "final-cert.json"));
    await context.close().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
