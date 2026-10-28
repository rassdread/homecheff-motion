/**
 * Zero-HC film confirmation using an explicit film request.
 * Disposable local database only.
 */
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { chromium } from "playwright";

const execFileAsync = promisify(execFile);
const base = "http://127.0.0.1:3462";
const password = "v272-local-only-password";
const evidence = path.resolve("docs/studio-v27-3/evidence");
const report: Record<string, unknown> = {};

function assertLocal() {
  const url = new URL(process.env.DATABASE_URL || "");
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/homecheff_studio_v27_2_test") {
    throw new Error("Certification refused a non-disposable database.");
  }
}

async function wallets() {
  const { stdout } = await execFileAsync("/opt/homebrew/bin/psql", [
    "-h", "127.0.0.1", "-p", "5432", "-d", "homecheff_studio_v27_2_test", "-t", "-A", "-F", "|",
    "-c",
    `SELECT u.email, w.balance, w."lifetimeSpent" FROM "StudioWallet" w JOIN "User" u ON u.id = w."userId" WHERE u.email LIKE 'v272-user-%' ORDER BY u.email;`,
  ]);
  return stdout.trim();
}

async function main() {
  assertLocal();
  await mkdir(evidence, { recursive: true });
  report.walletsBefore = await wallets();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator('input[name="email"]').fill("v272-user-c@studio.local.test");
  await page.locator('input[name="password"]').fill(password);
  const button = page.locator('form button[type="submit"]');
  await button.waitFor();
  await page.waitForFunction(() => {
    const node = document.querySelector('form button[type="submit"]');
    return !!node && Object.keys(node).some((key) => key.startsWith("__react"));
  });
  await button.evaluate((node) => (node as HTMLButtonElement).click());
  await page.waitForTimeout(1000);
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
    await page.goto(`${base}/studio`, { waitUntil: "domcontentloaded" });
  }
  await page.goto(`${base}/studio`, { waitUntil: "domcontentloaded" });
  const box = page.locator('[data-testid="studio-ai-home-composer"]').last();
  const prompt = "Create a short promotional film with three scenes. No paid generation.";
  await page.evaluate(() => sessionStorage.clear());
  const field = box.getByTestId("studio-ai-home-prompt");
  await field.waitFor();
  await field.fill(prompt);
  await box.getByTestId("studio-ai-home-submit").evaluate((node) => (node as HTMLButtonElement).click());
  await box.getByTestId("studio-ai-home-confirm").waitFor({ timeout: 20000 });
  report.summary = await box.getByTestId("studio-ai-home-confirm-summary").innerText();
  report.cost = await box.getByTestId("studio-ai-home-confirm-cost").innerText().catch(() => "");
  await page.screenshot({ path: path.join(evidence, "zero-hc-confirm-1440.png") });
  await box.getByTestId("studio-ai-home-confirm-make").evaluate((node) => (node as HTMLButtonElement).click());
  await page.waitForURL(/\/studio\/projects\//, { timeout: 25000, waitUntil: "commit" }).catch(() => undefined);
  report.url = page.url();
  report.created = page.url().includes("/studio/projects/");
  await page.screenshot({ path: path.join(evidence, "zero-hc-project-1440.png") });
  if (report.created) {
    const projectId = page.url().split("/studio/projects/")[1]?.split("?")[0] ?? "";
    report.projectId = projectId;
    if (/^[A-Za-z0-9]+$/.test(projectId)) {
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
    }
  }
  report.walletsAfter = await wallets();
  await writeFile(path.join(evidence, "zero-hc-report.json"), JSON.stringify(report, null, 2));
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}

main().catch(async (error) => {
  report.fatal = error instanceof Error ? error.message : "failed";
  await mkdir(evidence, { recursive: true });
  await writeFile(path.join(evidence, "zero-hc-report.json"), JSON.stringify(report, null, 2));
  console.error(report.fatal);
  process.exit(1);
});
