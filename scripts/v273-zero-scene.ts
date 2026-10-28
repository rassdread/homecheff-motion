/**
 * Adds one scene on the zero-HC film through the existing button, then quotes voice.
 */
import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { chromium } from "playwright";

const execFileAsync = promisify(execFile);
const base = "http://127.0.0.1:3462";
const password = "v272-local-only-password";
const projectId = "cmvs2nqpl0062dh92uzqi61xk";
const report: Record<string, unknown> = {};

async function main() {
  const url = new URL(process.env.DATABASE_URL || "");
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/homecheff_studio_v27_2_test") {
    throw new Error("Certification refused a non-disposable database.");
  }
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator('input[name="email"]').fill("v272-user-c@studio.local.test");
  await page.locator('input[name="password"]').fill(password);
  const button = page.locator('form button[type="submit"]');
  await button.waitFor();
  await page.waitForFunction(() => Object.keys(document.querySelector('form button[type="submit"]') ?? {}).some((key) => key.startsWith("__react")));
  await button.evaluate((node) => (node as HTMLButtonElement).click());
  await page.waitForTimeout(800);
  if (page.url().includes("/login")) {
    await page.evaluate(async (input) => {
      await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
    }, { email: "v272-user-c@studio.local.test", password });
  }
  await page.goto(`${base}/studio/projects/${projectId}?section=scenes&workflow=film`, { waitUntil: "domcontentloaded" });
  const add = page.getByRole("button", { name: /Add scene|Scène toevoegen/ }).first();
  await add.waitFor({ timeout: 20000 });
  await add.evaluate((node) => (node as HTMLButtonElement).click());
  await page.waitForTimeout(1500);
  const { stdout } = await execFileAsync("/opt/homebrew/bin/psql", [
    "-h", "127.0.0.1", "-p", "5432", "-d", "homecheff_studio_v27_2_test", "-t", "-A", "-F", "|",
    "-c",
    `SELECT s."order", s.id, s.title FROM "StudioScene" s JOIN "StudioCreativeProject" p ON p."storyboardId" = s."storyboardId" WHERE p.id = '${projectId}' ORDER BY s."order";`,
  ]);
  report.scenes = stdout.trim();
  const sceneId = stdout.trim().split("\n")[0]?.split("|")[1] ?? "";
  if (sceneId) {
    const quote = await context.request.post(`${base}/api/studio/projects/${projectId}/scenes/${sceneId}/dialogue`, {
      data: { action: "quote" },
    });
    report.quoteStatus = quote.status();
    report.quote = await quote.json();
  }
  const { stdout: wallet } = await execFileAsync("/opt/homebrew/bin/psql", [
    "-h", "127.0.0.1", "-p", "5432", "-d", "homecheff_studio_v27_2_test", "-t", "-A",
    "-c",
    `SELECT balance || '|' || "lifetimeSpent" FROM "StudioWallet" WHERE "userId" = 'cmvrdb5ep000adhrzv85bhal6';`,
  ]);
  report.wallet = wallet.trim();
  await writeFile(path.resolve("docs/studio-v27-3/evidence/zero-hc-scene.json"), JSON.stringify(report, null, 2));
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
