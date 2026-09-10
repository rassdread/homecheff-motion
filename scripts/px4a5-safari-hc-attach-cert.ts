#!/usr/bin/env npx tsx
/**
 * PX.4A.5 — Safari HomeCheff attach + cancel on Production.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { Builder, By, until, type WebDriver } from "selenium-webdriver";
import safari from "selenium-webdriver/safari.js";

const HC = "https://homecheff.eu";
const STUDIO = "https://studio.homecheff.eu";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROFILE = join(ROOT, ".px4a4-chrome-profile");
const OUT = join(ROOT, "docs/audits/px4a5-human-cert");
const FIX = join(OUT, "fixtures");
const MEDIA = join(OUT, "media");
const SHOT = join(OUT, "shots");

const report: Record<string, unknown> = { at: new Date().toISOString(), browser: "Safari 26.3" };

async function js<T>(driver: WebDriver, script: string): Promise<T> {
  return driver.executeScript(script) as Promise<T>;
}

async function clickText(driver: WebDriver, css: string, re: RegExp): Promise<boolean> {
  const els = await driver.findElements(By.css(css));
  for (const el of els) {
    const t = (await el.getText()).trim();
    if (re.test(t)) {
      await driver.executeScript("arguments[0].click()", el);
      return true;
    }
  }
  return false;
}

async function shot(driver: WebDriver, name: string): Promise<void> {
  writeFileSync(join(SHOT, `${name}.png`), Buffer.from(await driver.takeScreenshot(), "base64"));
}

async function inject(driver: WebDriver): Promise<void> {
  const ctx = await chromium.launchPersistentContext(PROFILE, { headless: true });
  const cookies = await ctx.cookies();
  await ctx.close();
  await driver.get(HC);
  for (const c of cookies.filter((x) => x.domain === "homecheff.eu" || x.domain === ".homecheff.eu")) {
    await driver.manage().addCookie({
      name: c.name,
      value: c.value,
      domain: c.domain.replace(/^\./, ""),
      path: c.path || "/",
      secure: Boolean(c.secure),
      httpOnly: Boolean(c.httpOnly),
    });
  }
  await driver.get(STUDIO);
  for (const c of cookies.filter((x) => x.domain.includes("studio.homecheff.eu") && x.name !== "hc_px4a_item")) {
    await driver.manage().addCookie({
      name: c.name,
      value: c.value,
      domain: c.domain.replace(/^\./, ""),
      path: c.path || "/",
      secure: Boolean(c.secure),
      httpOnly: Boolean(c.httpOnly),
    });
  }
}

async function dismiss(driver: WebDriver): Promise<void> {
  await clickText(driver, "button", /Alleen noodzakelijk|Accepteer alle/i);
  await clickText(driver, "button", /Nu niet/i);
}

async function openForm(driver: WebDriver): Promise<boolean> {
  await driver.get(`${HC}/sell/new`);
  await driver.sleep(1200);
  await dismiss(driver);
  for (let i = 0; i < 18; i += 1) {
    if ((await driver.findElements(By.css('[data-testid="px4a-make-free-video"]'))).length) return true;
    const body = await js<string>(driver, "return document.body.innerText");
    if (/Klopt dit/i.test(body)) {
      await clickText(driver, "button", /^Verder$/i);
      await driver.sleep(900);
      continue;
    }
    await clickText(driver, "button", /Ik bied iets aan/i);
    await driver.sleep(350);
    await clickText(driver, "button", /Tuin & Natuur/i);
    await driver.sleep(350);
    const section = await driver.findElements(By.css("section button"));
    for (const b of section) {
      const t = (await b.getText()).trim();
      if (t && !/Terug|Wijzig|Annuleren|Verder/i.test(t) && t.length < 40) {
        await driver.executeScript("arguments[0].click()", b);
        break;
      }
    }
    await driver.sleep(300);
    const verder = await driver.findElements(By.xpath("//button[contains(., 'Verder')]"));
    if (verder.length) await driver.executeScript("arguments[0].click()", verder[verder.length - 1]);
    await driver.sleep(700);
  }
  return (await driver.findElements(By.css('[data-testid="px4a-make-free-video"]'))).length > 0;
}

function inspect(file: string) {
  const buf = readFileSync(file);
  const probe = JSON.parse(
    execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration,size:stream=codec_name,codec_type,width,height,profile", "-of", "json", file], { encoding: "utf8" }),
  ) as { format?: { duration?: string }; streams?: { codec_type?: string; codec_name?: string; width?: number; height?: number; profile?: string }[] };
  const video = probe.streams?.find((s) => s.codec_type === "video");
  const audio = probe.streams?.find((s) => s.codec_type === "audio");
  return {
    bytes: buf.byteLength,
    mb: Number((buf.byteLength / (1024 * 1024)).toFixed(2)),
    ftyp: buf.subarray(0, 32).toString("latin1").includes("ftyp"),
    duration: probe.format?.duration ? Number(probe.format.duration) : null,
    videoCodec: video?.codec_name ?? null,
    profile: video?.profile ?? null,
    width: video?.width ?? null,
    height: video?.height ?? null,
    audioCodec: audio?.codec_name ?? null,
  };
}

async function main(): Promise<void> {
  mkdirSync(SHOT, { recursive: true });
  mkdirSync(MEDIA, { recursive: true });
  const driver = await new Builder().forBrowser("safari").setSafariOptions(new safari.Options()).build();
  try {
    await driver.manage().window().setRect({ width: 1440, height: 900, x: 40, y: 40 });
    await inject(driver);
    const ready = await openForm(driver);
    await shot(driver, "safari-hc-attach-form");
    report.formReady = ready;
    if (!ready) {
      report.status = "PARTIAL";
      report.reason = "listing CTA not reached";
      return;
    }
    const title = await driver.findElements(By.xpath("//input[@required]"));
    if (title[0]) {
      await title[0].clear();
      await title[0].sendKeys("PX.4A.5 Safari attach — niet publiceren");
    }
    const ta = await driver.findElements(By.css("textarea"));
    if (ta[0]) await ta[0].sendKeys("Safari attach cert. Do not publish.");
    const price = await driver.findElements(By.css('input[inputmode="decimal"]'));
    if (price[0]) await price[0].sendKeys("3.50");
    const img = await driver.findElements(By.css('input[type="file"][accept*="image/jpeg"]'));
    if (img[0]) {
      await driver.executeScript("arguments[0].style.display='block'", img[0]);
      await img[0].sendKeys(["a", "b", "c", "d"].map((id) => join(FIX, `photo-${id}.png`)).join("\n"));
    }
    const photosDeadline = Date.now() + 60_000;
    while (Date.now() < photosDeadline) {
      const body = await js<string>(driver, "return document.body.innerText");
      if (/Geüploade foto|4\/5 foto|4\/\d+ foto/i.test(body)) break;
      await driver.sleep(1000);
    }
    const replace = await driver.findElements(By.css('[data-testid="px4a-replace-video"]'));
    if (replace[0]) await driver.executeScript("arguments[0].click()", replace[0]);
    await driver.findElement(By.css('[data-testid="px4a-make-free-video"]')).then((el) => driver.executeScript("arguments[0].click()", el));
    await driver.wait(until.urlContains("/studio/photo-video"), 90_000);
    await driver.wait(until.elementLocated(By.css('[data-testid="px4a-composer"]')), 60_000);
    await dismiss(driver);
    await driver.wait(async () => {
      const btn = await driver.findElement(By.css('[data-testid="px4a-item-finish"]'));
      return btn.isEnabled();
    }, 60_000);
    const chips45 = await driver.findElements(By.css('[data-testid="px4a-video-duration"] button[aria-label="45 sec"]'));
    const chips60 = await driver.findElements(By.css('[data-testid="px4a-video-duration"] button[aria-label="60 sec"]'));
    report.itemDurationCaps = { has45: chips45.length > 0, has60: chips60.length > 0 };
    const started = Date.now();
    await driver.findElement(By.css('[data-testid="px4a-item-finish"]')).then((el) => driver.executeScript("arguments[0].click()", el));
    const polls: unknown[] = [];
    let attached = false;
    for (let i = 0; i < 48; i += 1) {
      await driver.sleep(2500);
      const snap = await js<Record<string, unknown>>(driver, `return {
        url: location.href,
        progress: Boolean(document.querySelector('[data-testid="px4a-export-progress"]')),
        error: document.querySelector('[data-testid="px4a-export-error"]')?.textContent || null,
      }`);
      polls.push({ t: i * 2.5, ...snap });
      console.log("poll", snap);
      if (String(snap.url).includes("/sell/new") && i > 0) {
        attached = true;
        break;
      }
      if (snap.error) break;
    }
    report.polls = polls;
    await shot(driver, "safari-hc-attach-after");
    await driver.sleep(3000);
    const listing = await js<{ videoUrl: string | null; title: string; videos: number; unpublished: boolean }>(
      driver,
      `const v=document.querySelector('video'); let raw=null; try{raw=JSON.parse(sessionStorage.getItem('hc-px4a-item-form:v1')||'null')}catch(e){}
       return {videoUrl: raw?.video?.url || v?.currentSrc || v?.src || null, title: raw?.title||'', videos: document.querySelectorAll('video').length, unpublished: location.pathname.includes('/sell/new')};`,
    );
    let fileInspect = null;
    if (listing.videoUrl?.startsWith("https://")) {
      const dest = join(MEDIA, "safari-flow-a.mp4");
      execFileSync("curl", ["-fsSL", listing.videoUrl, "-o", dest]);
      fileInspect = inspect(dest);
      execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-ss", "1.5", "-i", dest, "-frames:v", "1", join(MEDIA, "frames/safari-hc-15-early.jpg")]);
      execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-ss", "7", "-i", dest, "-frames:v", "1", join(MEDIA, "frames/safari-hc-15-late.jpg")]);
    }
    report.attach = {
      status: fileInspect?.ftyp && listing.videos <= 1 && listing.unpublished ? "PASS" : attached ? "PARTIAL" : "FAIL",
      wallMs: Date.now() - started,
      listing,
      inspect: fileInspect,
    };
    console.log(JSON.stringify(report.attach, null, 2));
  } finally {
    writeFileSync(join(OUT, "safari-hc-attach.json"), JSON.stringify(report, null, 2));
    console.log("Wrote", join(OUT, "safari-hc-attach.json"));
    await driver.quit().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error(err);
  report.error = String(err instanceof Error ? err.stack || err.message : err);
  writeFileSync(join(OUT, "safari-hc-attach.json"), JSON.stringify(report, null, 2));
  process.exit(1);
});
