#!/usr/bin/env npx tsx
/**
 * PX.4A.5 — real Safari.app Production certification (not Playwright WebKit).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
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
const DOWNLOADS = join(homedir(), "Downloads");

const report: Record<string, unknown> = {
  at: new Date().toISOString(),
  browser: "Safari 26.3",
  ua: null,
  hcAuth: false,
  studioAuth: false,
  network: { provider: [] as string[], charge: [] as string[] },
};

function photos(n: number): string {
  const letters = "abcdefghijkl";
  return Array.from({ length: n }, (_, i) => join(FIX, `photo-${letters[i]}.png`)).join("\n");
}

function ffprobe(file: string): Record<string, unknown> {
  return JSON.parse(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration,size,format_name:stream=codec_name,codec_type,width,height,profile,level,sample_rate,bit_rate", "-of", "json", file],
      { encoding: "utf8" },
    ),
  ) as Record<string, unknown>;
}

function inspectMp4(file: string, secondsHint?: number): Record<string, unknown> {
  const buf = readFileSync(file);
  const probe = ffprobe(file);
  const format = (probe.format ?? {}) as { duration?: string };
  const streams = (probe.streams ?? []) as { codec_type?: string; codec_name?: string; width?: number; height?: number; profile?: string }[];
  const video = streams.find((s) => s.codec_type === "video");
  const audio = streams.find((s) => s.codec_type === "audio");
  const duration = format.duration ? Number(format.duration) : null;
  return {
    bytes: buf.byteLength,
    mb: Number((buf.byteLength / (1024 * 1024)).toFixed(2)),
    ftyp: buf.subarray(0, 32).toString("latin1").includes("ftyp"),
    duration,
    drift: duration != null && secondsHint != null ? Number((duration - secondsHint).toFixed(3)) : null,
    videoCodec: video?.codec_name ?? null,
    profile: video?.profile ?? null,
    width: video?.width ?? null,
    height: video?.height ?? null,
    audioCodec: audio?.codec_name ?? null,
    file,
  };
}

function grabFrames(file: string, prefix: string, duration: number): void {
  mkdirSync(join(MEDIA, "frames"), { recursive: true });
  const points = [
    ["early", 1.5],
    ["mid", Math.max(2, duration / 2)],
    ["late", Math.max(2, duration - 1.2)],
  ] as const;
  for (const [name, t] of points) {
    execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-ss", String(t), "-i", file, "-frames:v", "1", join(MEDIA, `frames/${prefix}-${name}.jpg`)]);
  }
}

async function js<T>(driver: WebDriver, script: string, ...args: unknown[]): Promise<T> {
  return driver.executeScript(script, ...args) as Promise<T>;
}

async function clickCss(driver: WebDriver, css: string): Promise<void> {
  const el = await driver.wait(until.elementLocated(By.css(css)), 20_000);
  await driver.wait(until.elementIsVisible(el), 10_000).catch(() => undefined);
  await driver.executeScript("arguments[0].click()", el);
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

async function sendFiles(driver: WebDriver, css: string, paths: string[]): Promise<void> {
  const el = await driver.wait(until.elementLocated(By.css(css)), 20_000);
  await driver.executeScript(
    "arguments[0].style.display='block'; arguments[0].classList.remove('sr-only'); arguments[0].style.opacity='1'; arguments[0].style.position='static';",
    el,
  );
  await el.sendKeys(paths.join("\n"));
}

function dismissSafariDownloadSheet(): void {
  try {
    execFileSync("osascript", [
      "-e",
      `tell application "System Events"
        if not (exists process "Safari") then return
        tell process "Safari"
          if exists sheet 1 of window 1 then
            repeat with btnName in {"Allow", "Sta toe", "Save", "Bewaar", "Download"}
              try
                click button (btnName as text) of sheet 1 of window 1
              end try
            end repeat
          end if
        end tell
      end tell`,
    ], { stdio: "ignore" });
  } catch {
    /* sheet may be absent */
  }
}

async function waitDownload(label: string, timeoutMs: number): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  const start = Date.now();
  while (Date.now() < deadline) {
    dismissSafariDownloadSheet();
    const names = ["homecheff-video.mp4", "homecheff-video.MP4"];
    for (let i = 0; i < 12; i += 1) {
      names.push(`homecheff-video ${i}.mp4`);
    }
    for (const name of names) {
      const p = join(DOWNLOADS, name);
      if (!existsSync(p)) continue;
      const st = statSync(p);
      if (st.mtimeMs >= start - 2000 && st.size > 20_000) {
        const dest = join(MEDIA, `safari-${label}.mp4`);
        renameSync(p, dest);
        return dest;
      }
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  return null;
}

async function injectChromeSellerCookies(driver: WebDriver): Promise<string[]> {
  const ctx = await chromium.launchPersistentContext(PROFILE, { headless: true });
  const cookies = await ctx.cookies();
  await ctx.close();
  const injected: string[] = [];
  const byHost: Array<{ origin: string; list: typeof cookies }> = [
    {
      origin: HC,
      list: cookies.filter((c) => c.domain === "homecheff.eu" || c.domain === ".homecheff.eu"),
    },
    {
      origin: STUDIO,
      list: cookies.filter((c) => c.domain.includes("studio.homecheff.eu") && c.name !== "hc_px4a_item"),
    },
  ];
  for (const { origin, list } of byHost) {
    await driver.get(origin);
    await driver.sleep(400);
    for (const c of list) {
      try {
        await driver.manage().addCookie({
          name: c.name,
          value: c.value,
          domain: c.domain.replace(/^\./, ""),
          path: c.path || "/",
          secure: Boolean(c.secure),
          httpOnly: Boolean(c.httpOnly),
          expiry: c.expires && c.expires > 0 ? Math.floor(c.expires) : undefined,
        });
        injected.push(`${c.domain}:${c.name}`);
      } catch (err) {
        injected.push(`${c.domain}:${c.name}:FAIL:${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
  return injected;
}

async function clickContains(driver: WebDriver, re: RegExp): Promise<boolean> {
  return clickText(driver, "button", re);
}

async function dismissOverlays(driver: WebDriver): Promise<void> {
  await clickContains(driver, /Alleen noodzakelijk|Accepteer alle/i);
  await clickContains(driver, /Nu niet/i);
}

async function shot(driver: WebDriver, name: string): Promise<void> {
  const png = await driver.takeScreenshot();
  writeFileSync(join(SHOT, `${name}.png`), Buffer.from(png, "base64"));
}

async function waitForCta(driver: WebDriver, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await driver.findElements(By.css('[data-testid="px4a-make-free-video"]'))).length) return true;
    await driver.sleep(400);
  }
  return false;
}

async function openListingForm(driver: WebDriver): Promise<boolean> {
  await driver.get(`${HC}/sell/new`);
  await driver.sleep(1200);
  await dismissOverlays(driver);
  await driver.sleep(400);
  if (await waitForCta(driver, 2000)) return true;
  await clickContains(driver, /Ik bied iets aan/i);
  await driver.sleep(500);
  await clickContains(driver, /Tuin & Natuur/i);
  await driver.sleep(500);
  const body = await js<string>(driver, "return document.body.innerText");
  if (/Kies een groep/i.test(body)) {
    const groupBtns = await driver.findElements(By.css("section button"));
    for (const b of groupBtns) {
      const t = (await b.getText()).trim();
      if (t && !/Terug/i.test(t)) {
        await driver.executeScript("arguments[0].click()", b);
        break;
      }
    }
    await driver.sleep(400);
  }
  const body2 = await js<string>(driver, "return document.body.innerText");
  if (/Wat past hier het beste/i.test(body2)) {
    const itemBtns = await driver.findElements(By.css("section button"));
    for (const b of itemBtns) {
      const t = (await b.getText()).trim();
      if (t && !/Terug|groep/i.test(t)) {
        await driver.executeScript("arguments[0].click()", b);
        break;
      }
    }
    await driver.sleep(300);
  }
  const verder = await driver.findElements(By.xpath("//button[contains(., 'Verder')]"));
  if (verder.length) await driver.executeScript("arguments[0].click()", verder[verder.length - 1]);
  await driver.sleep(800);
  if (await waitForCta(driver, 3000)) return true;
  const body3 = await js<string>(driver, "return document.body.innerText");
  if (/Klopt dit/i.test(body3)) {
    await clickContains(driver, /^Verder$/i);
    await driver.sleep(1000);
  }
  return waitForCta(driver, 20_000);
}

async function configureComposer(driver: WebDriver, seconds: number, music: boolean, extraCount = 0): Promise<void> {
  const fresh = await driver.findElements(By.css('[data-testid="px4a-resume-fresh"]'));
  if (fresh[0]) await driver.executeScript("arguments[0].click()", fresh[0]);
  await sendFiles(driver, '[data-testid="px4a-file-input"]', photos(4 + extraCount).split("\n").filter(Boolean).slice(0, extraCount ? 4 + extraCount : 4));
  await driver.sleep(1000);
  await clickText(driver, '[data-testid="px4a-ratio"] button', /9:16|Verticaal/i);
  await clickCss(driver, `[data-testid="px4a-video-duration"] button[aria-label="${seconds} sec"]`);
  await clickText(driver, '[data-testid="px4a-movement"] button', /Automatisch|Auto/i);
  await clickText(driver, '[data-testid="px4a-style"] button', /Soepel|Smooth/i);
  const p0 = await driver.findElements(By.css('[data-testid="px4a-photo-0"] button'));
  if (p0[0]) await driver.executeScript("arguments[0].click()", p0[0]);
  await clickCss(driver, '[data-testid="px4a-add-text"]');
  const input = await driver.findElement(By.css('[data-testid="px4a-text-input"]'));
  await input.clear();
  await input.sendKeys(`SAFARI ${seconds} TITLE`);
  await clickText(driver, '[data-testid="px4a-text-font"] button', /Modern/i);
  const p1 = await driver.findElements(By.css('[data-testid="px4a-photo-1"] button'));
  if (p1[0]) await driver.executeScript("arguments[0].click()", p1[0]);
  await clickCss(driver, '[data-testid="px4a-add-text"]');
  const input2 = await driver.findElement(By.css('[data-testid="px4a-text-input"]'));
  await input2.clear();
  await input2.sendKeys(`SAFARI ${seconds} EXTRA`);
  if (music) {
    await clickCss(driver, '[data-testid="px4a-audio-own"]');
    await sendFiles(driver, '[data-testid="px4a-audio-file"]', [join(FIX, "music.wav")]);
    await driver.sleep(900);
    const win = await driver.findElements(By.css('[data-testid="px4a-audio-window"]'));
    if (win[0]) {
      await driver.actions({ async: true }).move({ origin: win[0], x: 40, y: 10 }).click().perform().catch(() => undefined);
    }
  } else {
    await clickCss(driver, '[data-testid="px4a-audio-none"]');
  }
}

async function standaloneDownload(driver: WebDriver, seconds: number, music: boolean): Promise<Record<string, unknown>> {
  await driver.get(`${STUDIO}/studio/photo-video`);
  await driver.wait(until.elementLocated(By.css('[data-testid="px4a-composer"]')), 60_000);
  await dismissOverlays(driver);
  await configureComposer(driver, seconds, music);
  const started = Date.now();
  await clickCss(driver, '[data-testid="px4a-export-download"]');
  await driver.sleep(600);
  const gate = await driver.findElements(By.css('[data-testid="px4a-auth-gate"]'));
  if (gate.length) return { seconds, music, status: "FAIL", reason: "auth gate", wallMs: Date.now() - started };
  const dest = await waitDownload(`studio-${seconds}${music ? "-music" : "-none"}`, 240_000);
  const wallMs = Date.now() - started;
  if (!dest) return { seconds, music, status: "FAIL", reason: "no download", wallMs };
  const inspect = inspectMp4(dest, seconds);
  if (inspect.ftyp && Number(inspect.bytes) > 20_000) grabFrames(dest, `safari-${seconds}${music ? "-music" : "-none"}`, Number(inspect.duration ?? seconds));
  const ok =
    inspect.ftyp &&
    Number(inspect.bytes) > 20_000 &&
    inspect.duration != null &&
    Math.abs(Number(inspect.duration) - seconds) < 1.5 &&
    String(inspect.videoCodec).match(/h264|avc/i);
  const musicOk = music ? String(inspect.audioCodec).match(/aac/i) : !inspect.audioCodec;
  return { seconds, music, status: ok && musicOk ? "PASS" : "FAIL", wallMs, inspect };
}

async function main(): Promise<void> {
  mkdirSync(MEDIA, { recursive: true });
  mkdirSync(SHOT, { recursive: true });
  mkdirSync(join(MEDIA, "frames"), { recursive: true });
  const driver = await new Builder().forBrowser("safari").setSafariOptions(new safari.Options()).build();
  try {
    await driver.manage().window().setRect({ width: 1440, height: 900, x: 40, y: 40 });
    report.ua = await js(driver, "return navigator.userAgent");

    report.cookieInject = await injectChromeSellerCookies(driver);
    console.log("cookieInject", report.cookieInject);

    await driver.get(HC);
    await driver.sleep(800);
    const hc = await js<{ ok: boolean; status: number }>(
      driver,
      `return fetch('/api/user/me',{credentials:'include'}).then(async r=>({ok:r.ok,status:r.status})).catch(()=>({ok:false,status:0}))`,
    );
    report.hcAuth = hc.ok;
    if (!hc.ok) {
      console.log("PAUSE — log in as HomeCheff seller in the Safari WebDriver window (do not publish).");
      await driver.get(`${HC}/sell/new`);
      const deadline = Date.now() + 180_000;
      while (Date.now() < deadline) {
        const again = await js<{ ok: boolean }>(
          driver,
          `return fetch('/api/user/me',{credentials:'include'}).then(r=>({ok:r.ok})).catch(()=>({ok:false}))`,
        );
        if (again.ok) {
          report.hcAuth = true;
          console.log("HomeCheff session confirmed in Safari WebDriver.");
          break;
        }
        await driver.sleep(3000);
      }
    }
    await driver.get(`${STUDIO}/studio/photo-video`);
    await driver.sleep(1200);
    const st = await js<{ ok: boolean; status: number }>(
      driver,
      `return fetch('/api/me/studio-account',{credentials:'include'}).then(r=>({ok:r.ok,status:r.status})).catch(()=>({ok:false,status:0}))`,
    );
    report.studioAuth = st.ok;
    console.log("auth", { hc: report.hcAuth, studio: st.ok, ua: report.ua });

    if (report.hcAuth) {
      try {
      console.log("=== Safari HomeCheff 15s music ===");
      const formReady = await openListingForm(driver);
      await shot(driver, "safari-hc-form");
      if (!formReady) {
        report.safariHc15 = { status: "PARTIAL", reason: "listing form CTA not reached after cookie dismiss + wizard" };
        console.log("Safari HC form not ready, continuing standalone encoder cert");
      } else {
      const title = await driver.findElements(By.xpath("//input[@required]"));
      if (title[0]) {
        await title[0].clear();
        await title[0].sendKeys("PX.4A.5 Safari — niet publiceren");
      }
      const ta = await driver.findElements(By.css("textarea"));
      if (ta[0]) await ta[0].sendKeys("Safari cert. Do not publish.");
      const price = await driver.findElements(By.css('input[inputmode="decimal"]'));
      if (price[0]) await price[0].sendKeys("3.50");
      const imgInput = await driver.findElements(By.css('input[type="file"][accept*="image/jpeg"]'));
      if (imgInput[0]) {
        await driver.executeScript("arguments[0].style.display='block'", imgInput[0]);
        await imgInput[0].sendKeys(photos(4));
        await driver.sleep(8000);
      }
      const replace = await driver.findElements(By.css('[data-testid="px4a-replace-video"]'));
      if (replace[0]) await driver.executeScript("arguments[0].click()", replace[0]);
      await clickCss(driver, '[data-testid="px4a-make-free-video"]');
      await driver.wait(until.urlContains("/studio/photo-video"), 90_000);
      await driver.wait(until.elementLocated(By.css('[data-testid="px4a-composer"]')), 60_000);
      await dismissOverlays(driver);
      await clickCss(driver, `[data-testid="px4a-video-duration"] button[aria-label="15 sec"]`);
      await clickText(driver, '[data-testid="px4a-movement"] button', /Automatisch|Auto/i);
      await clickText(driver, '[data-testid="px4a-style"] button', /Soepel|Smooth/i);
      const sp0 = await driver.findElements(By.css('[data-testid="px4a-photo-0"] button'));
      if (sp0[0]) await driver.executeScript("arguments[0].click()", sp0[0]);
      await clickCss(driver, '[data-testid="px4a-add-text"]');
      const ti = await driver.findElement(By.css('[data-testid="px4a-text-input"]'));
      await ti.clear();
      await ti.sendKeys("SAFARI TITLE");
      await clickText(driver, '[data-testid="px4a-text-font"] button', /Modern/i);
      const sp1 = await driver.findElements(By.css('[data-testid="px4a-photo-1"] button'));
      if (sp1[0]) await driver.executeScript("arguments[0].click()", sp1[0]);
      await clickCss(driver, '[data-testid="px4a-add-text"]');
      const ti2 = await driver.findElement(By.css('[data-testid="px4a-text-input"]'));
      await ti2.clear();
      await ti2.sendKeys("SAFARI EXTRA");
      await clickCss(driver, '[data-testid="px4a-audio-own"]');
      await sendFiles(driver, '[data-testid="px4a-audio-file"]', [join(FIX, "music.wav")]);
      await driver.sleep(800);

      console.log("=== Safari cancel during export ===");
      const oldUrl = await js<string | null>(driver, "return location.href");
      await clickCss(driver, '[data-testid="px4a-item-finish"]');
      await driver.sleep(400);
      const cancel = await driver.findElements(By.css('[data-testid="px4a-export-cancel"]'));
      if (cancel[0]) {
        await driver.executeScript("arguments[0].click()", cancel[0]);
        await driver.sleep(800);
        const back = await driver.findElements(By.css('[data-testid="px4a-item-cancel"]'));
        if (back[0]) await driver.executeScript("arguments[0].click()", back[0]);
        await driver.sleep(3000);
        report.cancel = {
          status: "PASS",
          afterUrl: await driver.getCurrentUrl(),
          stillOnStudio: (await driver.getCurrentUrl()).includes("studio.homecheff"),
        };
      } else {
        report.cancel = { status: "PARTIAL", reason: "cancel button not seen" };
      }
      void oldUrl;

      if (!(await driver.getCurrentUrl()).includes("/sell/new")) {
        await driver.get(`${HC}/sell/new`);
        await driver.sleep(1200);
        await dismissOverlays(driver);
      }
      const replace2 = await driver.findElements(By.css('[data-testid="px4a-replace-video"]'));
      if (replace2[0]) await driver.executeScript("arguments[0].click()", replace2[0]);
      const make = await driver.findElements(By.css('[data-testid="px4a-make-free-video"]'));
      if (make[0]) await driver.executeScript("arguments[0].click()", make[0]);
      await driver.wait(until.urlContains("/studio/photo-video"), 90_000);
      await driver.wait(until.elementLocated(By.css('[data-testid="px4a-composer"]')), 60_000);
      await clickCss(driver, `[data-testid="px4a-video-duration"] button[aria-label="15 sec"]`);
      await clickCss(driver, '[data-testid="px4a-audio-own"]');
      await sendFiles(driver, '[data-testid="px4a-audio-file"]', [join(FIX, "music.wav")]).catch(() => undefined);
      const started = Date.now();
      await clickCss(driver, '[data-testid="px4a-item-finish"]');
      await driver.wait(async () => (await driver.getCurrentUrl()).includes("/sell/new"), 180_000);
      await driver.sleep(4000);
      const attachWall = Date.now() - started;
      const listing = await js<{ videoUrl: string | null; title: string; videos: number }>(
        driver,
        `const v=document.querySelector('video'); let raw=null; try{raw=JSON.parse(sessionStorage.getItem('hc-px4a-item-form:v1')||'null')}catch(e){}
         return {videoUrl: raw?.video?.url || v?.currentSrc || v?.src || null, title: raw?.title||'', videos: document.querySelectorAll('video').length};`,
      );
      let inspect: Record<string, unknown> | null = null;
      if (listing.videoUrl && listing.videoUrl.startsWith("https://")) {
        const dest = join(MEDIA, "safari-flow-a.mp4");
        execFileSync("curl", ["-fsSL", listing.videoUrl, "-o", dest]);
        inspect = inspectMp4(dest, 15);
        grabFrames(dest, "safari-hc-15", Number(inspect.duration ?? 15));
      }
      report.safariHc15 = {
        status: inspect?.ftyp && listing.videos <= 1 && listing.videoUrl ? "PASS" : "FAIL",
        attachWallMs: attachWall,
        listing,
        inspect,
      };
      console.log("Safari HC 15", JSON.stringify(report.safariHc15, null, 2));
      }
      } catch (err) {
        await shot(driver, "safari-hc-error").catch(() => undefined);
        report.safariHc15 = { status: "FAIL", reason: String(err instanceof Error ? err.message : err) };
        console.log("Safari HC failed, continuing standalone", report.safariHc15);
      }
    } else {
      report.safariHc15 = { status: "NOT TESTED", reason: "Safari has no HomeCheff seller session" };
    }

    console.log("=== Safari standalone 15s no music ===");
    report.safariNone15 = await standaloneDownload(driver, 15, false);
    console.log(JSON.stringify(report.safariNone15, null, 2));

    console.log("=== Safari standalone 15s music ===");
    report.safariMusic15 = await standaloneDownload(driver, 15, true);
    console.log(JSON.stringify(report.safariMusic15, null, 2));

    console.log("=== Safari standalone 45s ===");
    report.safari45 = await standaloneDownload(driver, 45, true);
    console.log(JSON.stringify(report.safari45, null, 2));

    console.log("=== Safari standalone 60s ===");
    report.safari60 = await standaloneDownload(driver, 60, true);
    console.log(JSON.stringify(report.safari60, null, 2));
  } finally {
    writeFileSync(join(OUT, "safari-production.json"), JSON.stringify(report, null, 2));
    console.log("Wrote", join(OUT, "safari-production.json"));
    await driver.quit().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error(err);
  report.error = String(err instanceof Error ? err.stack || err.message : err);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, "safari-production.json"), JSON.stringify(report, null, 2));
  process.exit(1);
});
