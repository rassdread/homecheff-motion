#!/usr/bin/env npx tsx
/**
 * Smoke: can real Safari WebDriver attach?
 */
import { Builder } from "selenium-webdriver";
import safari from "selenium-webdriver/safari.js";

async function main(): Promise<void> {
  const options = new safari.Options();
  const driver = await new Builder().forBrowser("safari").setSafariOptions(options).build();
  try {
    await driver.get("https://studio.homecheff.eu/studio/photo-video");
    const title = await driver.getTitle();
    const url = await driver.getCurrentUrl();
    console.log(JSON.stringify({ title, url, ua: await driver.executeScript("return navigator.userAgent") }));
  } finally {
    await driver.quit();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
