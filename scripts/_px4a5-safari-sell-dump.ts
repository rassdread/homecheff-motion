import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Builder, type WebDriver } from "selenium-webdriver";
import safari from "selenium-webdriver/safari.js";

const HC = "https://homecheff.eu";
const STUDIO = "https://studio.homecheff.eu";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROFILE = join(ROOT, ".px4a4-chrome-profile");
const OUT = join(ROOT, "docs/audits/px4a5-human-cert/shots");

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

async function main(): Promise<void> {
  const driver = await new Builder().forBrowser("safari").setSafariOptions(new safari.Options()).build();
  try {
    await inject(driver);
    await driver.get(`${HC}/sell/new`);
    await driver.sleep(2500);
    const info = await driver.executeScript(`
      const buttons = [...document.querySelectorAll('button,a,[role="button"]')]
        .slice(0, 80)
        .map(el => ({tag: el.tagName, testid: el.getAttribute('data-testid'), text: (el.innerText||'').trim().slice(0,80)}));
      return {
        url: location.href,
        title: document.title,
        cta: Boolean(document.querySelector('[data-testid="px4a-make-free-video"]')),
        body: document.body.innerText.slice(0, 4000),
        buttons,
      };
    `);
    writeFileSync(join(OUT, "safari-sell-new-dump.json"), JSON.stringify(info, null, 2));
    const png = await driver.takeScreenshot();
    writeFileSync(join(OUT, "safari-sell-new.png"), Buffer.from(png, "base64"));
    console.log(JSON.stringify({ url: (info as {url:string}).url, cta: (info as {cta:boolean}).cta, buttons: (info as {buttons:unknown[]}).buttons?.length }));
  } finally {
    await driver.quit();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
