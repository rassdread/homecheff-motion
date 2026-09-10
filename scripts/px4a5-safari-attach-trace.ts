#!/usr/bin/env npx tsx
/**
 * PX.4A.5 — Safari Production attach trace (encode → temp upload → HMAC → return).
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

const report: Record<string, unknown> = {
  at: new Date().toISOString(),
  browser: "Safari 26.3",
  boundary: "UNKNOWN",
};

async function js<T>(driver: WebDriver, script: string): Promise<T> {
  return driver.executeScript(script) as Promise<T>;
}

async function clickText(driver: WebDriver, css: string, re: RegExp): Promise<boolean> {
  for (const el of await driver.findElements(By.css(css))) {
    if (re.test((await el.getText()).trim())) {
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
  for (let i = 0; i < 20; i += 1) {
    if ((await driver.findElements(By.css('[data-testid="px4a-make-free-video"]'))).length) return true;
    const body = await js<string>(driver, "return document.body.innerText");
    if (/Klopt dit/i.test(body)) {
      await clickText(driver, "button", /^Verder$/i);
      await driver.sleep(900);
      continue;
    }
    await clickText(driver, "button", /Ik bied iets aan/i);
    await driver.sleep(300);
    await clickText(driver, "button", /Tuin & Natuur/i);
    await driver.sleep(300);
    for (const b of await driver.findElements(By.css("section button"))) {
      const t = (await b.getText()).trim();
      if (t && !/Terug|Wijzig|Annuleren|Verder/i.test(t) && t.length < 40) {
        await driver.executeScript("arguments[0].click()", b);
        break;
      }
    }
    await driver.sleep(250);
    const verder = await driver.findElements(By.xpath("//button[contains(., 'Verder')]"));
    if (verder.length) await driver.executeScript("arguments[0].click()", verder[verder.length - 1]);
    await driver.sleep(700);
  }
  return (await driver.findElements(By.css('[data-testid="px4a-make-free-video"]'))).length > 0;
}

const INSTALL_HOOKS = `
(function(){
  if (window.__px4aHooked) return true;
  window.__px4aHooked = true;
  window.__px4aLog = [];
  function push(e){ e.at = Date.now(); window.__px4aLog.push(e); }
  const ofetch = window.fetch.bind(window);
  window.fetch = async function(input, init){
    const url = typeof input === 'string' ? input : (input && input.url) || String(input);
    const method = (init && init.method) || 'GET';
    push({kind:'fetch-start', url: String(url).slice(0, 220), method});
    try {
      const res = await ofetch(input, init);
      let snippet = '';
      try {
        if (/export-handoff|export-upload|px4a-export-attach/.test(String(url))) {
          snippet = (await res.clone().text()).slice(0, 500);
        }
      } catch (e) {}
      push({kind:'fetch-end', url: String(url).slice(0, 220), method, status: res.status, snippet});
      return res;
    } catch (err) {
      push({kind:'fetch-err', url: String(url).slice(0, 220), method, error: String(err)});
      throw err;
    }
  };
  const OrigXHR = XMLHttpRequest;
  function WrappedXHR(){
    const xhr = new OrigXHR();
    const open = xhr.open;
    xhr.open = function(method, url){
      this.__px4a = {method: method, url: String(url)};
      return open.apply(this, arguments);
    };
    xhr.addEventListener('loadend', function(){
      const info = this.__px4a || {};
      push({kind:'xhr-end', url: String(info.url||'').slice(0, 220), method: info.method, status: this.status});
    });
    return xhr;
  }
  WrappedXHR.prototype = OrigXHR.prototype;
  window.XMLHttpRequest = WrappedXHR;
  const submit = HTMLFormElement.prototype.submit;
  HTMLFormElement.prototype.submit = function(){
    push({
      kind:'form-submit',
      action: this.action,
      method: this.method,
      userActivation: navigator.userActivation ? {isActive: navigator.userActivation.isActive, hasBeenActive: navigator.userActivation.hasBeenActive} : null
    });
    return submit.apply(this, arguments);
  };
  return true;
})();
`;

function inspectMp4(file: string) {
  const buf = readFileSync(file);
  const probe = JSON.parse(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration,size:stream=codec_name,codec_type,width,height,profile", "-of", "json", file],
      { encoding: "utf8" },
    ),
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

function classifyBoundary(polls: Array<Record<string, unknown>>, log: Array<Record<string, unknown>>, finalUrl: string): string {
  const kinds = log.map((e) => String(e.kind));
  const urls = log.map((e) => String(e.url ?? e.action ?? ""));
  const stages = polls.map((p) => String(p.stage ?? ""));
  if (/sell\/new/.test(finalUrl) && /px4aResult=ready/.test(finalUrl)) return "COMPLETE";
  if (urls.some((u) => /px4a-export-attach/.test(u)) || kinds.includes("form-submit")) {
    if (/sell\/new/.test(finalUrl)) return "RETURN";
    return "RECEIVER";
  }
  if (urls.some((u) => /export-handoff/.test(u))) return "HMAC";
  if (urls.some((u) => /export-upload|blob\.vercel-storage/.test(u))) return "TEMP UPLOAD";
  if (stages.includes("mux") || stages.includes("frames") || stages.includes("music")) return "ENCODE";
  if (stages.includes("prepare") || stages.includes("attach")) return "ENCODE";
  return "ENCODE";
}

async function main(): Promise<void> {
  mkdirSync(SHOT, { recursive: true });
  mkdirSync(MEDIA, { recursive: true });
  mkdirSync(join(MEDIA, "frames"), { recursive: true });
  const driver = await new Builder().forBrowser("safari").setSafariOptions(new safari.Options()).build();
  try {
    await driver.manage().window().setRect({ width: 1440, height: 900, x: 40, y: 40 });
    await inject(driver);

    const formReady = await openForm(driver);
    report.formReady = formReady;
    if (!formReady) {
      report.boundary = "RETURN";
      report.reason = "listing form not reached";
      await shot(driver, "safari-attach-trace-no-form");
      return;
    }

    const title = await driver.findElements(By.xpath("//input[@required]"));
    if (title[0]) {
      await title[0].clear();
      await title[0].sendKeys("PX.4A.5 Safari attach — niet publiceren");
    }
    const ta = await driver.findElements(By.css("textarea"));
    if (ta[0]) await ta[0].sendKeys("Safari attach trace. Do not publish.");
    const price = await driver.findElements(By.css('input[inputmode="decimal"]'));
    if (price[0]) await price[0].sendKeys("3.50");

    const img = await driver.findElements(By.css('input[type="file"][accept*="image/jpeg"]'));
    if (img[0]) {
      await driver.executeScript("arguments[0].style.display='block'", img[0]);
      await img[0].sendKeys(["a", "b", "c", "d"].map((id) => join(FIX, `photo-${id}.png`)).join("\n"));
    }

    const photoDeadline = Date.now() + 90_000;
    let photosReady = false;
    while (Date.now() < photoDeadline) {
      const state = await js<{ uploading: boolean; https: number; uiCount: boolean; thumbs: number; bodyHit: string }>(
        driver,
        `let raw=null; try{raw=JSON.parse(sessionStorage.getItem('hc-px4a-item-form:v1')||'null')}catch(e){}
         const imgs = raw?.images || [];
         const https = imgs.filter(i => String(i.url||'').startsWith('https://')).length;
         const body = document.body.innerText;
         const uiCount = /Geüploade foto's \\(4\\)|4\\/5 foto|4\\/\\d+ foto/.test(body);
         return { uploading: /Uploaden\\.\\.\\./.test(body), https, uiCount, thumbs: document.querySelectorAll('img[src^="blob:"], img[src^="https://"]').length, bodyHit: (body.match(/foto[^\\n]{0,40}/gi)||[]).slice(0,4).join(' | ') };`,
      );
      console.log("photos", state);
      if (!state.uploading && (state.https >= 4 || state.uiCount)) {
        photosReady = true;
        report.listingPhotos = state;
        break;
      }
      await driver.sleep(1500);
    }
    report.photosReady = photosReady;
    if (!photosReady) {
      report.boundary = "FORM STATE";
      report.reason = "listing photos did not finish uploading";
      await shot(driver, "safari-attach-trace-photos");
      return;
    }

    const replace = await driver.findElements(By.css('[data-testid="px4a-replace-video"]'));
    if (replace[0]) await driver.executeScript("arguments[0].click()", replace[0]);
    await driver.findElement(By.css('[data-testid="px4a-make-free-video"]')).then((el) => driver.executeScript("arguments[0].click()", el));
    const navDeadline = Date.now() + 60_000;
    while (Date.now() < navDeadline && !(await driver.getCurrentUrl()).includes("studio.homecheff")) {
      const err = await js<string>(driver, `return document.querySelector('[role="status"]')?.textContent || ''`);
      if (err && /fout|error|mislukt/i.test(err)) {
        report.ctaError = err;
        break;
      }
      await driver.sleep(500);
    }
    if (!(await driver.getCurrentUrl()).includes("studio.homecheff")) {
      report.boundary = "RETURN";
      report.reason = "Maak gratis video did not open Studio";
      report.ctaUrl = await driver.getCurrentUrl();
      await shot(driver, "safari-attach-trace-cta");
      return;
    }

    await driver.wait(until.elementLocated(By.css('[data-testid="px4a-composer"]')), 60_000);
    await dismiss(driver);
    await driver.wait(async () => (await driver.findElement(By.css('[data-testid="px4a-item-finish"]'))).isEnabled(), 60_000);
    const dur = await driver.findElements(By.css('[data-testid="px4a-video-duration"] button[aria-label="15 sec"]'));
    if (dur[0]) await driver.executeScript("arguments[0].click()", dur[0]);
    await clickText(driver, '[data-testid="px4a-movement"] button', /Automatisch|Auto/i);
    const p0 = await driver.findElements(By.css('[data-testid="px4a-photo-0"] button'));
    if (p0[0]) await driver.executeScript("arguments[0].click()", p0[0]);
    const addText = await driver.findElements(By.css('[data-testid="px4a-add-text"]'));
    if (addText[0]) {
      await driver.executeScript("arguments[0].click()", addText[0]);
      const ti = await driver.findElements(By.css('[data-testid="px4a-text-input"]'));
      if (ti[0]) {
        await ti[0].clear();
        await ti[0].sendKeys("SAFARI ATTACH");
      }
    }
    const own = await driver.findElements(By.css('[data-testid="px4a-audio-own"]'));
    if (own[0]) await driver.executeScript("arguments[0].click()", own[0]);
    const audioFile = await driver.findElements(By.css('[data-testid="px4a-audio-file"]'));
    if (audioFile[0]) {
      await driver.executeScript("arguments[0].style.display='block'", audioFile[0]);
      await audioFile[0].sendKeys(join(FIX, "music.wav"));
      await driver.sleep(800);
    }

    await js(driver, INSTALL_HOOKS);
    report.hooksInstalled = true;
    await shot(driver, "safari-attach-trace-before-finish");

    const started = Date.now();
    await driver.findElement(By.css('[data-testid="px4a-item-finish"]')).then((el) => driver.executeScript("arguments[0].click()", el));

    const polls: Record<string, unknown>[] = [];
    for (let i = 0; i < 48; i += 1) {
      await driver.sleep(2500);
      const snap = await js<Record<string, unknown>>(
        driver,
        `const stages=[...document.querySelectorAll('[data-testid^="px4a-export-stage-"]')];
         const current = stages.find(el => el.className.includes('font-semibold'))?.getAttribute('data-testid') || null;
         return {
           url: location.href,
           progress: Boolean(document.querySelector('[data-testid="px4a-export-progress"]')),
           stage: current,
           error: document.querySelector('[data-testid="px4a-export-error"]')?.textContent || null,
           log: window.__px4aLog || [],
           userActivation: navigator.userActivation ? {isActive: navigator.userActivation.isActive, hasBeenActive: navigator.userActivation.hasBeenActive} : null
         };`,
      );
      polls.push({ tMs: Date.now() - started, url: snap.url, progress: snap.progress, stage: snap.stage, error: snap.error, userActivation: snap.userActivation, logLen: Array.isArray(snap.log) ? snap.log.length : 0 });
      if (Array.isArray(snap.log) && (snap.log as unknown[]).length) report.networkLog = snap.log;
      console.log("poll", JSON.stringify({ t: Date.now() - started, url: snap.url, stage: snap.stage, error: snap.error, logLen: polls[polls.length - 1]?.logLen }));
      if (String(snap.url).includes("/sell/new") && i > 0) {
        if (Array.isArray(snap.log) && (snap.log as unknown[]).length) report.networkLog = snap.log;
        break;
      }
      if (snap.error) {
        report.networkLog = snap.log;
        await shot(driver, "safari-attach-trace-error");
        break;
      }
      if (i === 6 || i === 20) await shot(driver, `safari-attach-trace-${i}`);
      if (i === 47) report.networkLog = snap.log;
    }
    report.polls = polls;
    report.wallMs = Date.now() - started;
    const finalUrl = await driver.getCurrentUrl();
    report.finalUrl = finalUrl;
    const log = (report.networkLog as Array<Record<string, unknown>>) ?? [];
    report.boundary = classifyBoundary(polls, log, finalUrl);
    await shot(driver, "safari-attach-trace-landed");

    await driver.sleep(1500);
    const listingWait: Record<string, unknown>[] = [];
    let listing = await js<Record<string, unknown>>(
      driver,
      `const v=document.querySelector('video'); let raw=null; try{raw=JSON.parse(sessionStorage.getItem('hc-px4a-item-form:v1')||'null')}catch(e){}
       let pending=null; try{pending=sessionStorage.getItem('hc-px4a-export-video:v1')}catch(e){}
       return {
         unpublished: location.pathname.includes('/sell/new'),
         px4aResult: new URLSearchParams(location.search).get('px4aResult'),
         videoUrl: raw?.video?.url || v?.currentSrc || v?.src || null,
         videos: document.querySelectorAll('video').length,
         title: raw?.title || '',
         photos: raw?.images?.length || 0,
         pending,
         message: document.body.innerText.match(/video[\\s\\S]{0,80}/i)?.[0] || null,
         exportPending: Boolean(document.querySelector('[data-testid="px4a-export-pending"]')),
       };`,
    );
    listingWait.push({ t: 0, ...listing });
    if (String(listing.px4aResult) === "ready" && !listing.videoUrl) {
      for (let i = 0; i < 20; i += 1) {
        await driver.sleep(1500);
        listing = await js<Record<string, unknown>>(driver, `const v=document.querySelector('video'); let raw=null; try{raw=JSON.parse(sessionStorage.getItem('hc-px4a-item-form:v1')||'null')}catch(e){}
         let pending=null; try{pending=sessionStorage.getItem('hc-px4a-export-video:v1')}catch(e){}
         return {
           unpublished: location.pathname.includes('/sell/new'),
           px4aResult: new URLSearchParams(location.search).get('px4aResult'),
           videoUrl: raw?.video?.url || v?.currentSrc || v?.src || null,
           videos: document.querySelectorAll('video').length,
           title: raw?.title || '',
           photos: raw?.images?.length || 0,
           pending,
           exportPending: Boolean(document.querySelector('[data-testid="px4a-export-pending"]')),
           err: document.body.innerText.match(/kon de video|attach|mislukt|fout/i)?.[0] || null,
         };`);
        listingWait.push({ t: (i + 1) * 1.5, videoUrl: listing.videoUrl, videos: listing.videos, pending: Boolean(listing.pending), exportPending: listing.exportPending, err: listing.err });
        console.log("reingest", listingWait[listingWait.length - 1]);
        if (listing.videoUrl || listing.err) break;
      }
    }
    report.listingWait = listingWait;
    report.listing = listing;
    await shot(driver, "safari-attach-trace-final");

    if (typeof listing.videoUrl === "string" && listing.videoUrl.startsWith("https://")) {
      const dest = join(MEDIA, "safari-attach.mp4");
      execFileSync("curl", ["-fsSL", listing.videoUrl, "-o", dest]);
      report.inspect = inspectMp4(dest);
      execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-ss", "1.5", "-i", dest, "-frames:v", "1", join(MEDIA, "frames/safari-attach-early.jpg")]);
      execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-ss", "12", "-i", dest, "-frames:v", "1", join(MEDIA, "frames/safari-attach-late.jpg")]);
      report.attachStatus = report.inspect && (report.inspect as { ftyp?: boolean }).ftyp && listing.videos === 1 ? "PASS" : "FAIL";
    } else {
      report.attachStatus = String(report.boundary) === "COMPLETE" ? "PARTIAL" : "FAIL";
    }
    console.log("boundary", report.boundary, "attach", report.attachStatus);
  } finally {
    writeFileSync(join(OUT, "safari-attach-trace.json"), JSON.stringify(report, null, 2));
    console.log("Wrote", join(OUT, "safari-attach-trace.json"));
    await driver.quit().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error(err);
  report.error = String(err instanceof Error ? err.stack || err.message : err);
  writeFileSync(join(OUT, "safari-attach-trace.json"), JSON.stringify(report, null, 2));
  process.exit(1);
});
