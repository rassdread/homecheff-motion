/**
 * Save the disposable historical image and animation fixtures through their existing editors.
 */
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "playwright";

const base = "http://127.0.0.1:3462";
const password = "v272-local-only-password";
const evidence = path.resolve("docs/studio-v27-3-1/evidence");
const imageName = "V2731 historical image saved";
const animationTitle = "V2731 historical animation saved";
const report: Record<string, unknown> = {};

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
  await page.locator('input[name="email"]').fill("v272-user-a@studio.local.test");
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
    }, { email: "v272-user-a@studio.local.test", password });
    if (status !== 200) throw new Error("Login failed");
  }
}

function clickByText(page: Page, pattern: string) {
  return page.evaluate((source) => {
    const match = new RegExp(source, "i");
    const button = [...document.querySelectorAll("button")].find((item) => match.test(item.textContent ?? ""));
    if (!button) return false;
    (button as HTMLButtonElement).click();
    return true;
  }, pattern);
}

async function main() {
  const url = new URL(process.env.DATABASE_URL || "");
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/homecheff_studio_v27_2_test") {
    throw new Error("Certification refused a non-disposable database.");
  }
  await mkdir(evidence, { recursive: true });
  report.imageBefore = sql(`SELECT name FROM "EditorCanvasProject" WHERE id = 'v273-hist-image-0001'`);
  report.animationBefore = sql(`SELECT title FROM "AnimationProject" WHERE id = 'cmv273histanim0001'`);
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  page.setDefaultTimeout(120000);
  await login(page);

  await page.goto(`${base}/editor/start?session=v273-hist-image-0001&restoreServer=1`, { waitUntil: "commit" });
  await page.locator('[data-testid="editor-menu"]').waitFor();
  await page.locator('[data-testid="editor-menu"] button').first().evaluate((node) => (node as HTMLButtonElement).click());
  report.imageRenameClicked = await clickByText(page, "Rename project|Projectnaam wijzigen");
  await page.locator('[data-testid="editor-project-name-dialog"] input').waitFor();
  await page.screenshot({ path: path.join(evidence, "historical-image-1440.png") });
  const imageInput = page.locator('[data-testid="editor-project-name-dialog"] input');
  await imageInput.fill(imageName);
  report.imageSaveClicked = await clickByText(page, "Save as project|Opslaan als project");
  let imageNow = "";
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await page.waitForTimeout(500);
    imageNow = sql(`SELECT name FROM "EditorCanvasProject" WHERE id = 'v273-hist-image-0001'`);
    if (imageNow === imageName) break;
  }
  report.imageAfterSave = imageNow;
  await page.reload({ waitUntil: "commit" });
  await page.locator('[data-testid="editor-menu"]').waitFor();
  report.imageAfterReload = sql(`SELECT name FROM "EditorCanvasProject" WHERE id = 'v273-hist-image-0001'`);

  await page.goto(`${base}/videos/cmv273histanim0001`, { waitUntil: "commit" });
  await page.getByRole("heading", { level: 1 }).waitFor();
  report.animationRenameClicked = await clickByText(page, "Rename project|Hernoem project");
  await page.locator("#bundle-project-title").waitFor();
  await page.screenshot({ path: path.join(evidence, "historical-animation-1440.png") });
  await page.locator("#bundle-project-title").fill(animationTitle);
  report.animationSaveClicked = await clickByText(page, "Save settings|Instellingen opslaan");
  let animationNow = "";
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await page.waitForTimeout(500);
    animationNow = sql(`SELECT title FROM "AnimationProject" WHERE id = 'cmv273histanim0001'`);
    if (animationNow === animationTitle) break;
  }
  report.animationAfterSave = animationNow;
  await page.reload({ waitUntil: "commit" });
  await page.getByRole("heading", { level: 1 }).waitFor();
  report.animationHeading = (await page.getByRole("heading", { level: 1 }).innerText()).trim();
  report.animationAfterReload = sql(`SELECT title FROM "AnimationProject" WHERE id = 'cmv273histanim0001'`);
  await page.setViewportSize({ width: 390, height: 800 });
  await page.screenshot({ path: path.join(evidence, "historical-animation-390.png") });

  await writeFile(path.join(evidence, "historical-save-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch(async (error) => {
  report.fatal = error instanceof Error ? error.message : "failed";
  await mkdir(evidence, { recursive: true });
  await writeFile(path.join(evidence, "historical-save-report.json"), JSON.stringify(report, null, 2));
  console.error(report.fatal);
  process.exit(1);
});
