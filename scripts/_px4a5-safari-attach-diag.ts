#!/usr/bin/env npx tsx
/**
 * Characterize Safari Video gebruiken attach (no cancel). Poll URL/error/progress.
 */
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { Builder, By, until, type WebDriver } from "selenium-webdriver";
import safari from "selenium-webdriver/safari.js";

const HC = "https://homecheff.eu";
const STUDIO = "https://studio.homecheff.eu";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROFILE = join(ROOT, ".px4a4-chrome-profile");
const FIX = join(ROOT, "docs/audits/px4a5-human-cert/fixtures");
const SHOT = join(ROOT, "docs/audits/px4a5-human-cert/shots");
const OUT = join(ROOT, "docs/audits/px4a5-human-cert/safari-attach-diag.json");

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

async function main(): Promise<void> {
  const driver = await new Builder().forBrowser("safari").setSafariOptions(new safari.Options()).build();
  const log: unknown[] = [];
  try {
    await driver.manage().window().setRect({ width: 1440, height: 900, x: 40, y: 40 });
    const ctx = await chromium.launchPersistentContext(PROFILE, { headless: true });
    const cookies = await ctx.cookies();
    await ctx.close();
    await driver.get(HC);
    for (const c of cookies.filter((x) => x.domain === "homecheff.eu" || x.domain === ".homecheff.eu")) {
      await driver.manage().addCookie({ name: c.name, value: c.value, domain: c.domain.replace(/^\./, ""), path: "/", secure: Boolean(c.secure), httpOnly: Boolean(c.httpOnly) });
    }
    await driver.get(STUDIO);
    for (const c of cookies.filter((x) => x.domain.includes("studio.homecheff.eu") && x.name !== "hc_px4a_item")) {
      await driver.manage().addCookie({ name: c.name, value: c.value, domain: c.domain.replace(/^\./, ""), path: "/", secure: Boolean(c.secure), httpOnly: Boolean(c.httpOnly) });
    }
    await driver.get(`${HC}/sell/new`);
    await driver.sleep(1000);
    await clickText(driver, "button", /Alleen noodzakelijk/i);
    for (let i = 0; i < 16; i += 1) {
      if ((await driver.findElements(By.css('[data-testid="px4a-make-free-video"]'))).length) break;
      const body = await js<string>(driver, "return document.body.innerText");
      if (/Klopt dit/i.test(body)) await clickText(driver, "button", /^Verder$/i);
      else {
        await clickText(driver, "button", /Ik bied iets aan/i);
        await clickText(driver, "button", /Tuin & Natuur/i);
        const verder = await driver.findElements(By.xpath("//button[contains(., 'Verder')]"));
        if (verder.length) await driver.executeScript("arguments[0].click()", verder[verder.length - 1]);
      }
      await driver.sleep(700);
    }
    const title = await driver.findElements(By.xpath("//input[@required]"));
    if (title[0]) {
      await title[0].clear();
      await title[0].sendKeys("PX.4A.5 Safari diag — niet publiceren");
    }
    const img = await driver.findElements(By.css('input[type="file"][accept*="image/jpeg"]'));
    if (img[0]) {
      await driver.executeScript("arguments[0].style.display='block'", img[0]);
      await img[0].sendKeys(["a", "b", "c", "d"].map((id) => join(FIX, `photo-${id}.png`)).join("\n"));
    }
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      const body = await js<string>(driver, "return document.body.innerText");
      if (/Geüploade foto|4\/5 foto|4\/\d+ foto/i.test(body)) break;
      await driver.sleep(1000);
    }
    await driver.findElement(By.css('[data-testid="px4a-make-free-video"]')).then((el) => driver.executeScript("arguments[0].click()", el));
    await driver.wait(until.elementLocated(By.css('[data-testid="px4a-composer"]')), 90_000);
    await driver.wait(async () => {
      const btn = await driver.findElement(By.css('[data-testid="px4a-item-finish"]'));
      return btn.isEnabled();
    }, 60_000);
    const before = await js<Record<string, unknown>>(driver, `return {
      url: location.href,
      readyHint: document.body.innerText.includes('foto'),
      finishDisabled: document.querySelector('[data-testid="px4a-item-finish"]')?.disabled ?? null,
      photos: document.querySelectorAll('[data-testid^="px4a-photo-"]').length,
    }`);
    log.push({ t: 0, before });
    await driver.findElement(By.css('[data-testid="px4a-item-finish"]')).then((el) => driver.executeScript("arguments[0].click()", el));
    for (let i = 1; i <= 24; i += 1) {
      await driver.sleep(2500);
      const snap = await js<Record<string, unknown>>(driver, `return {
        url: location.href,
        progress: Boolean(document.querySelector('[data-testid="px4a-export-progress"]')),
        error: document.querySelector('[data-testid="px4a-export-error"]')?.textContent || null,
        cancel: Boolean(document.querySelector('[data-testid="px4a-export-cancel"]')),
        bodySlice: document.body.innerText.slice(0, 500),
      }`);
      log.push({ t: i * 2.5, ...snap });
      console.log(JSON.stringify({ t: i * 2.5, url: snap.url, progress: snap.progress, error: snap.error }));
      if (String(snap.url).includes("/sell/new") && i > 1) break;
      if (i === 4 || i === 12) {
        writeFileSync(join(SHOT, `safari-attach-diag-${i}.png`), Buffer.from(await driver.takeScreenshot(), "base64"));
      }
    }
  } finally {
    writeFileSync(OUT, JSON.stringify({ log }, null, 2));
    console.log("Wrote", OUT);
    await driver.quit().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
