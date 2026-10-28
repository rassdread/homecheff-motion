/**
 * Cross-user, zero-HC, and responsive checks on the disposable local database.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "playwright";

const base = "http://127.0.0.1:3462";
const password = "v272-local-only-password";
const projectId = "cmvrdlbwg0005dh92s468jz8g";
const imagePath = "/api/studio/local-media/67a7d26e-ba69-4736-a6c5-66a17e2efbec";
const evidence = path.resolve("docs/studio-v27-2/evidence");
const report: Record<string, unknown> = {};

function assertLocal() {
  const url = new URL(process.env.DATABASE_URL || "");
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/homecheff_studio_v27_2_test") {
    throw new Error("Certification refused a non-disposable database.");
  }
}

async function login(page: Page, email: string) {
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  const button = page.locator('form button[type="submit"]');
  await button.waitFor();
  await page.waitForFunction(() => {
    const node = document.querySelector('form button[type="submit"]');
    return !!node && Object.keys(node).some((key) => key.startsWith("__react"));
  });
  const posted = page.waitForResponse((response) => response.url().includes("/api/auth/login") && response.request().method() === "POST", { timeout: 15000 }).catch(() => null);
  await button.evaluate((node) => (node as HTMLButtonElement).click());
  const response = await posted;
  if (!response?.ok()) {
    const status = await page.evaluate(async (input) => {
      const next = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      return next.status;
    }, { email, password });
    if (status !== 200) throw new Error(`Login for ${email} returned ${response ? response.status() : "no response"} then ${status}`);
  }
  if (page.url().includes("/login")) {
    await page.goto(`${base}/studio`, { waitUntil: "domcontentloaded" }).catch(() => undefined);
  }
}

async function overflow(page: Page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
}

async function main() {
  assertLocal();
  await mkdir(evidence, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const userB = await browser.newContext();
  const bPage = await userB.newPage();
  await login(bPage, "v272-user-b@studio.local.test");
  const projectResponse = await bPage.goto(`${base}/studio/projects/${projectId}?section=scenes`, { waitUntil: "domcontentloaded" });
  report.userBProjectStatus = projectResponse?.status();
  report.userBProjectUrl = bPage.url();
  const text = (await bPage.locator("body").innerText()).replace(/\s+/g, " ");
  report.userBSeesFilmTitle = text.includes("V27.2 Synthetic Film Certification");
  report.userBProjectExcerpt = text.slice(0, 280);
  const checks = [
    ["image", imagePath],
    ["timeline", `/api/studio/projects/${projectId}/timeline`],
    ["characters", `/api/studio/projects/${projectId}/film-characters`],
    ["render", `/api/studio/projects/${projectId}/timeline/render`],
  ] as const;
  const api: Record<string, number> = {};
  for (const [name, url] of checks) {
    api[name] = (await userB.request.get(`${base}${url}`)).status();
  }
  const renderPost = await userB.request.post(`${base}/api/studio/projects/${projectId}/timeline/render`, {
    data: { phase: "start" },
  });
  api.renderPost = renderPost.status();
  report.userBApi = api;
  await writeFile(path.join(evidence, "security-report.json"), JSON.stringify(report, null, 2));
  await userB.close();

  const userC = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const cPage = await userC.newPage();
  await login(cPage, "v272-user-c@studio.local.test");
  await cPage.goto(`${base}/studio`, { waitUntil: "domcontentloaded" });
  const composer = cPage.locator('[data-testid="studio-ai-home-composer"]').last();
  report.zeroHomepage = await composer.getByTestId("studio-ai-home-prompt").isVisible();
  report.zeroCreditsText = ((await cPage.locator("body").innerText()).replace(/\s+/g, " ").match(/\d+\s+CREDITS/) || [""])[0];
  await cPage.evaluate(() => sessionStorage.clear());
  const prompt = composer.getByTestId("studio-ai-home-prompt");
  await prompt.fill("V272 Zero HC film. A short free editing check with one scene.");
  await composer.getByTestId("studio-ai-home-submit").evaluate((node) => (node as HTMLButtonElement).click());
  const confirm = composer.getByTestId("studio-ai-home-confirm-make");
  const confirmVisible = await confirm.waitFor({ timeout: 10000 }).then(() => true).catch(() => false);
  report.zeroConfirmVisible = confirmVisible;
  if (confirmVisible) {
    await confirm.evaluate((node) => (node as HTMLButtonElement).click());
    await cPage.waitForURL(/\/studio\/projects\//, { timeout: 20000, waitUntil: "commit" }).catch(() => undefined);
  }
  let zeroProject = cPage.url().split("/studio/projects/")[1]?.split("?")[0] ?? "";
  if (!zeroProject) {
    const created = await userC.request.post(`${base}/api/studio/films`, {
      data: { title: "V272 Zero HC film", description: "A short free editing check with one scene.", idempotencyKey: "v272-user-c-film" },
    });
    report.zeroFilmStatus = created.status();
    const createdBody = await created.json();
    zeroProject = createdBody.project?.id ?? createdBody.projectId ?? createdBody.id ?? "";
    report.zeroFilmBodyKeys = Object.keys(createdBody);
  }
  report.zeroProject = zeroProject;
  const scene = await userC.request.post(`${base}/api/studio/projects/${zeroProject}/scenes`, { data: { title: "Free edit" } });
  report.zeroSceneStatus = scene.status();
  const sceneBody = await scene.json();
  const sceneIdForQuote = sceneBody.sceneId ?? "";
  report.zeroSceneId = sceneIdForQuote;
  const saved = await userC.request.patch(`${base}/api/studio/projects/${zeroProject}/scenes/${sceneIdForQuote}`, {
    data: { dialogueText: "This line is only quoted. It is not generated." },
  });
  report.zeroDialogueStatus = saved.status();
  const quote = await userC.request.post(`${base}/api/studio/projects/${zeroProject}/scenes/${sceneIdForQuote}/dialogue`, {
    data: { action: "quote", voiceProfile: "warm_narrator" },
  });
  report.zeroQuoteStatus = quote.status();
  report.zeroQuote = await quote.json().catch(() => null);
  await userC.close();

  const owner = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await owner.newPage();
  await login(page, "v272-user-a@studio.local.test");
  const widths = [1440, 1280, 1080, 1024, 768, 390, 360];
  const layout: Record<string, unknown> = {};
  for (const width of widths) {
    await page.setViewportSize({ width, height: width < 800 ? 844 : 900 });
    await page.goto(`${base}/studio/projects/${projectId}?section=timeline`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("film-timeline-play").waitFor({ timeout: 20000 });
    layout[String(width)] = await overflow(page);
    if (width === 1440 || width === 768 || width === 390) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(evidence, `timeline-${width}.png`) });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/studio/projects/${projectId}?section=scenes`, { waitUntil: "domcontentloaded" });
  layout.scenes390 = await overflow(page);
  await page.screenshot({ path: path.join(evidence, "scenes-390.png") });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/studio`, { waitUntil: "domcontentloaded" });
  layout.home1440 = await overflow(page);
  await page.screenshot({ path: path.join(evidence, "home-1440.png") });
  report.layout = layout;
  await owner.close();
  await browser.close();
  await writeFile(path.join(evidence, "security-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch(async (error) => {
  report.fatal = error instanceof Error ? error.message : String(error);
  await mkdir(evidence, { recursive: true }).catch(() => undefined);
  await writeFile(path.join(evidence, "security-report.json"), JSON.stringify(report, null, 2)).catch(() => undefined);
  console.error(error);
  process.exit(1);
});
