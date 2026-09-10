#!/usr/bin/env npx tsx
import { webkit } from "playwright";
async function main() {
  const browser = await webkit.connectOverCDP("http://127.0.0.1:9222");
  const page = browser.contexts()[0]?.pages()[0];
  if (!page) throw new Error("no page");
  console.log("URL:", page.url());
  const state = await page.evaluate(() => ({
    posture: document.querySelector('[data-testid="px4a-edit-zone"]')?.getAttribute("data-posture"),
    items: [...document.querySelectorAll('[data-testid^="px4a-photo-"]')]
      .filter((el) => /^px4a-photo-\d+$/.test(el.getAttribute("data-testid") || ""))
      .map((el) => ({
        id: el.getAttribute("data-testid"),
        video: !!el.querySelector('[data-testid^="px4a-video-thumb-"]'),
        preparing: !!el.querySelector('[data-testid^="px4a-video-preparing-"]'),
      })),
    contextBar: !!document.querySelector('[data-testid="px4a-context-bar"]'),
  }));
  console.log(JSON.stringify(state, null, 2));
  await browser.close();
}
void main();
