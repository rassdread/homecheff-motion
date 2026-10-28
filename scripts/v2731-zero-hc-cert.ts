/**
 * Zero-HC film regression for disposable user C.
 * Quote only. No provider start and no credit grant.
 */
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "playwright";

const base = "http://127.0.0.1:3462";
const password = "v272-local-only-password";
const evidence = path.resolve("docs/studio-v27-3-1/evidence");
const report: Record<string, unknown> = {};

function sql(query: string) {
  return execFileSync("/opt/homebrew/bin/psql", [
    "postgresql://sergioarrias@127.0.0.1:5432/homecheff_studio_v27_2_test",
    "-At",
    "-c",
    query,
  ], { encoding: "utf8" });
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
  report.walletsBefore = sql(`SELECT u.email, w.balance, w."lifetimeSpent" FROM "StudioWallet" w JOIN "User" u ON u.id = w."userId" WHERE u.email LIKE 'v272-user-%' ORDER BY u.email;`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  await login(page);
  await page.goto(`${base}/studio`, { waitUntil: "commit" });
  const box = page.locator('[data-testid="studio-ai-home-composer"]').last();
  const prompt = "Create a short promotional film with three scenes for the final local check. No paid generation.";
  await page.evaluate(() => sessionStorage.clear());
  const field = box.getByTestId("studio-ai-home-prompt");
  await field.waitFor();
  await field.fill(prompt);
  await box.getByTestId("studio-ai-home-submit").evaluate((node) => (node as HTMLButtonElement).click());
  await box.getByTestId("studio-ai-home-confirm").waitFor();
  report.cost = await box.getByTestId("studio-ai-home-confirm-cost").innerText();
  await box.getByTestId("studio-ai-home-confirm-make").evaluate((node) => (node as HTMLButtonElement).click());
  await page.waitForURL(/\/studio\/projects\//, { timeout: 30000, waitUntil: "commit" });
  const projectId = page.url().split("/studio/projects/")[1]?.split("?")[0] ?? "";
  report.projectId = projectId;
  await page.getByRole("button", { name: /Add scene|Scène toevoegen/ }).evaluate((node) => (node as HTMLButtonElement).click());
  await page.waitForTimeout(1200);
  const dialogue = page.locator("label", { hasText: /Spoken dialogue|Gesproken/ }).locator("textarea");
  await dialogue.waitFor();
  await dialogue.fill("Welkom bij HomeCheff. Dit is een gratis project.");
  await page.locator("form").filter({ has: dialogue }).locator('button[type="submit"]').evaluate((node) => (node as HTMLButtonElement).click());
  await page.waitForTimeout(1000);
  await page.reload({ waitUntil: "commit" });
  report.scenes = sql(`SELECT s."order" || '|' || s.id || '|' || s.title || '|' || left(s."dialogueText", 40) FROM "StudioScene" s JOIN "StudioCreativeProject" p ON p."storyboardId" = s."storyboardId" WHERE p.id = '${projectId}' ORDER BY s."order";`);
  const sceneId = report.scenes.toString().split("|")[1] ?? "";
  report.sceneId = sceneId;
  const quote = await context.request.post(`${base}/api/studio/projects/${projectId}/scenes/${sceneId}/dialogue`, {
    data: { action: "quote", voiceProfile: "warm_narrator" },
  });
  report.quoteStatus = quote.status();
  report.quote = await quote.json();
  report.walletsAfter = sql(`SELECT u.email, w.balance, w."lifetimeSpent" FROM "StudioWallet" w JOIN "User" u ON u.id = w."userId" WHERE u.email LIKE 'v272-user-%' ORDER BY u.email;`);
  await writeFile(path.join(evidence, "zero-hc-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch(async (error) => {
  report.fatal = error instanceof Error ? error.message : "failed";
  await mkdir(evidence, { recursive: true });
  await writeFile(path.join(evidence, "zero-hc-report.json"), JSON.stringify(report, null, 2));
  console.error(report.fatal);
  process.exit(1);
});
