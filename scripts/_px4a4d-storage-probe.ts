#!/usr/bin/env npx tsx
/**
 * PX.4A.4D diagnostic: trace sessionStorage mutations around Maak gratis video round-trip.
 */
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HC = "https://homecheff.eu";
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROFILE = process.env.PX4A4_CHROME_PROFILE?.trim() || join(REPO_ROOT, ".px4a4-chrome-profile");

async function main() {
  const context = await chromium.launchPersistentContext(PROFILE, {
    channel: "chrome",
    headless: false,
    viewport: { width: 1280, height: 800 },
    locale: "nl-NL",
    args: ["--disable-blink-features=AutomationControlled"],
  });
  await context.addInitScript(() => {
    const w = window as Window & { __px4a4dLog?: string[] };
    w.__px4a4dLog = w.__px4a4dLog || [];
    const log = (msg: string) => {
      w.__px4a4dLog!.push(`${Date.now()} ${location.host} ${msg}`);
      console.log("[px4a4d]", msg);
    };
    try {
      const proto = Object.getPrototypeOf(sessionStorage) as Storage;
      const setItem = proto.setItem.bind(sessionStorage);
      const removeItem = proto.removeItem.bind(sessionStorage);
      const clear = proto.clear.bind(sessionStorage);
      proto.setItem = function (k: string, v: string) {
        if (/px4a|last_user|canary/i.test(k)) log(`SET ${k} chars=${String(v).length}`);
        return setItem(k, v);
      };
      proto.removeItem = function (k: string) {
        if (/px4a|last_user|canary/i.test(k)) log(`REMOVE ${k}`);
        return removeItem(k);
      };
      proto.clear = function () {
        log("CLEAR_ALL keys=" + Object.keys(sessionStorage).join(","));
        return clear();
      };
    } catch (e) {
      log("hook-fail " + String(e));
    }
  });

  const page = context.pages()[0] || (await context.newPage());
  page.on("console", (msg) => {
    if (msg.text().includes("[px4a4d]") || msg.text().includes("CLEAR")) {
      console.log("console", msg.text());
    }
  });

  await page.goto(`${HC}/sell/new`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(2500);
  const before = await page.evaluate(() => {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) keys.push(sessionStorage.key(i) || "");
    return {
      href: location.href,
      keys,
      draftChars: sessionStorage.getItem("hc-px4a-item-form:v1")?.length ?? 0,
      lastUser: sessionStorage.getItem("last_user_id"),
      currentUser: localStorage.getItem("current_user_id"),
      log: (window as Window & { __px4a4dLog?: string[] }).__px4a4dLog ?? [],
    };
  });
  console.log("BEFORE", JSON.stringify(before, null, 2));

  await page.evaluate(() => {
    sessionStorage.setItem("px4a4d-canary", "alive");
  });

  const cta = page.locator('[data-testid="px4a-make-free-video"]');
  if (await cta.isVisible().catch(() => false)) {
    await cta.click();
    await page.waitForTimeout(8000);
  } else {
    console.log("CTA not visible; body snippet", (await page.locator("body").innerText()).slice(0, 400));
  }
  console.log("AFTER CLICK url", page.url());
  await page.waitForTimeout(2000);
  if (/studio\.homecheff/.test(page.url())) {
    const back = page.locator('[data-testid="px4a-item-back"], [data-testid="px4a-item-cancel"]').first();
    if (await back.isVisible().catch(() => false)) await back.click();
    await page.waitForURL(/homecheff\.eu\/sell\/new/i, { timeout: 90_000 }).catch(() => undefined);
    await page.waitForTimeout(2500);
  }
  const after = await page.evaluate(() => {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) keys.push(sessionStorage.key(i) || "");
    return {
      href: location.href,
      keys,
      draftChars: sessionStorage.getItem("hc-px4a-item-form:v1")?.length ?? 0,
      canary: sessionStorage.getItem("px4a4d-canary"),
      lastUser: sessionStorage.getItem("last_user_id"),
      currentUser: localStorage.getItem("current_user_id"),
      log: (window as Window & { __px4a4dLog?: string[] }).__px4a4dLog ?? [],
    };
  });
  console.log("AFTER RETURN", JSON.stringify(after, null, 2));
  await context.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
