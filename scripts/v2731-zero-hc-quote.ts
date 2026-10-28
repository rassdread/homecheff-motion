/**
 * Persist dialogue on the zero-HC scene through the scene form, then quote voice.
 */
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "playwright";

const base = "http://127.0.0.1:3462";
const password = "v272-local-only-password";
const projectId = "cmvscxnvi000hdht73dxe9vn8";
const sceneId = "cmvsd0ps4000ldht70d0g6rb2";
const evidence = path.resolve("docs/studio-v27-3-1/evidence");
const line = "Welkom bij HomeCheff. Dit is een gratis project.";
const report: Record<string, unknown> = { projectId, sceneId };

function sql(query: string) {
  return execFileSync("/opt/homebrew/bin/psql", [
    "postgresql://sergioarrias@127.0.0.1:5432/homecheff_studio_v27_2_test",
    "-At",
    "-c",
    query,
  ], { encoding: "utf8" }).trim();
}

async function login(page: Page) {
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.locator('input[name="email"]').fill("v272-user-c@studio.local.test");
  await page.locator('input[name="password"]').fill(password);
  const button = page.locator('form button[type="submit"]');
  await button.waitFor();
  await page.waitForFunction(() => Object.keys(document.querySelector('form button[type="submit"]') ?? {}).some((key) => key.startsWith("__react")));
  await button.evaluate((node) => (node as HTMLButtonElement).click());
  await page.waitForURL((url) => !url.toString().includes("/login"), { timeout: 20000 }).catch(() => undefined);
  if (page.url().includes("/login")) {
    const status = await page.evaluate(async (input) => {
      const next = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      return next.status;
    }, { email: "v272-user-c@studio.local.test", password });
    if (status !== 200) throw new Error("Login failed");
  }
}

async function main() {
  const url = new URL(process.env.DATABASE_URL || "");
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/homecheff_studio_v27_2_test") {
    throw new Error("Certification refused a non-disposable database.");
  }
  await mkdir(evidence, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  await login(page);
  await page.goto(`${base}/studio/projects/${projectId}?section=scenes&scene=${sceneId}&workflow=film`, { waitUntil: "commit" });
  await page.locator("form textarea").nth(1).waitFor();
  report.filled = await page.evaluate((value) => {
    const form = [...document.querySelectorAll("form")].find((item) => item.querySelectorAll("textarea").length >= 2);
    const field = form?.querySelectorAll("textarea")[1];
    if (!(field instanceof HTMLTextAreaElement) || !form) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    setter?.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    form.requestSubmit();
    return true;
  }, line);
  let stored = "";
  for (let attempt = 0; attempt < 15; attempt += 1) {
    await page.waitForTimeout(400);
    stored = sql(`SELECT "dialogueText" FROM "StudioScene" WHERE id = '${sceneId}'`);
    if (stored === line) break;
  }
  report.stored = stored;
  await page.reload({ waitUntil: "commit" });
  await page.locator("form textarea").nth(1).waitFor();
  report.afterReload = await page.locator("form textarea").nth(1).inputValue();
  const quote = await context.request.post(`${base}/api/studio/projects/${projectId}/scenes/${sceneId}/dialogue`, {
    data: { action: "quote", voiceProfile: "warm_narrator" },
  });
  report.quoteStatus = quote.status();
  report.quote = await quote.json();
  report.wallet = sql(`SELECT balance || '|' || "lifetimeSpent" FROM "StudioWallet" WHERE "userId" = 'cmvrdb5ep000adhrzv85bhal6'`);
  await writeFile(path.join(evidence, "zero-hc-quote.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch(async (error) => {
  report.fatal = error instanceof Error ? error.message : "failed";
  await mkdir(evidence, { recursive: true });
  await writeFile(path.join(evidence, "zero-hc-quote.json"), JSON.stringify(report, null, 2));
  console.error(report.fatal);
  process.exit(1);
});
