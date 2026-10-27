/**
 * Authenticated browser certification for unified historical projects.
 * Refuses every database that is not homecheff_film_cert_v24 on 127.0.0.1.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { chromium, type BrowserContext, type Page } from "playwright";
import { hashPassword } from "@/server/auth/session";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

const CERT_DB = "homecheff_film_cert_v24";
const base = process.env.V24_BASE ?? "https://127.0.0.1:3460";
const password = process.env.V24_CERT_PASSWORD ?? "";

function assertIsolatedDatabase() {
  const url = process.env.V24_CERT_DATABASE_URL?.trim() || "";
  const parsed = new URL(url);
  if (parsed.hostname !== "127.0.0.1" || parsed.pathname.replace(/^\//, "") !== CERT_DB) {
    throw new Error("Refusing a database that is not the disposable local certification database.");
  }
  if (/neon|vercel|preview|prod/i.test(url)) throw new Error("Certification database URL looks remote.");
  process.env.DATABASE_URL = url;
}

type Step = { name: string; ok: boolean; detail: string };
const steps: Step[] = [];
function record(name: string, ok: boolean, detail: string) {
  steps.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name} ${detail}`);
}

function canvas(id: string, name: string): EditorCanvasDocument {
  const now = new Date().toISOString();
  return {
    sessionId: id,
    name,
    sourceKind: "upload",
    sourceAssetId: null,
    backgroundUrl: "https://127.0.0.1/cert-still.png",
    workflowStep: "visual_editor",
    objects: [],
    placements: [],
    status: "editing",
    createdAt: now,
    updatedAt: now,
  };
}

async function login(context: BrowserContext, email: string) {
  const response = await context.request.post(`${base}/api/auth/login`, {
    headers: { origin: base },
    data: { email, password },
    timeout: 60000,
  });
  return response;
}

async function overflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
}

async function main() {
  if (!password) throw new Error("V24_CERT_PASSWORD is required.");
  assertIsolatedDatabase();
  const { prisma } = await import("@/lib/prisma");
  const identity = await prisma.$queryRaw<Array<{ addr: string; db: string }>>`
    SELECT inet_server_addr()::text AS addr, current_database() AS db
  `;
  if (identity[0]?.db !== CERT_DB || !String(identity[0]?.addr).startsWith("127.0.0.1")) {
    throw new Error("Connected database is not the isolated local certification database.");
  }
  const commit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const stamp = Date.now();
  const emailA = `v24-browser-a-${stamp}@example.test`;
  const emailB = `v24-browser-b-${stamp}@example.test`;
  const userA = await prisma.user.create({ data: { email: emailA, passwordHash: hashPassword(password), role: "user" } });
  const userB = await prisma.user.create({ data: { email: emailB, passwordHash: hashPassword(password), role: "user" } });
  for (const userId of [userA.id, userB.id]) {
    await prisma.studioAccount.create({ data: { userId, accountType: "creator", accountStatus: "active" } });
    await prisma.studioWallet.create({ data: { userId, balance: 0, promotionalBalance: 0, lifetimeGranted: 0 } });
  }
  const storyboard = await prisma.studioStoryboard.create({ data: { ownerId: userA.id, title: "Browser historical film" } });
  const animation = await prisma.animationProject.create({ data: { ownerId: userA.id, title: "Browser historical animation", status: "draft" } });
  const canvasId = `v24-browser-canvas-${stamp}`;
  await prisma.editorCanvasProject.create({
    data: { id: canvasId, ownerId: userA.id, name: "Browser historical image", payload: canvas(canvasId, "Browser historical image") as object },
  });
  const character = await prisma.studioCharacter.create({
    data: {
      ownerId: userA.id,
      name: "Browser historical character",
      slug: `browser-${stamp}`,
      role: "human",
      referenceImageUrl: "https://127.0.0.1/cert-character.png",
      referenceStorageKey: "cert/browser-character.png",
    },
  });
  const voice = await prisma.studioLibraryAsset.create({
    data: {
      ownerId: userA.id,
      family: "voice",
      title: "Browser generated voice",
      previewUrl: "https://127.0.0.1/cert-voice.mp3",
      sourceKind: "v24_browser",
      sourceId: `voice-${stamp}`,
    },
  });
  const creativeBefore = await prisma.studioCreativeProject.count({ where: { ownerId: userA.id, storyboardId: storyboard.id } });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 } });
  await context.addCookies([
    { name: "hc_locale", value: "nl", url: base },
    { name: "hc_locale_pref", value: "1", url: base },
  ]);
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  try {
    const signedIn = await login(context, emailA);
    record("login_a", signedIn.ok(), String(signedIn.status()));

    await page.goto(`${base}/studio`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.getByTestId("studio-v24-history-item").filter({ hasText: "Browser historical film" }).first().waitFor({ timeout: 30000 });
    const titles = await page.getByTestId("studio-v24-history-item").allInnerTexts();
    const joined = titles.join(" | ");
    record(
      "history_lists_existing_records",
      joined.includes("Browser historical film") &&
        joined.includes("Browser historical animation") &&
        joined.includes("Browser historical image") &&
        joined.includes("Browser historical character") &&
        joined.includes("Browser generated voice"),
      joined.slice(0, 400),
    );

    await page.goto(`${base}/studio?storyboardId=${storyboard.id}&stage=visuals`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForURL(/\/studio\/projects\//, { timeout: 30000 });
    const project = page.getByTestId("studio-v24-project");
    await project.waitFor({ timeout: 30000 });
    const legacy = await page.getByTestId("studio-adaptive-workspace").count();
    record(
      "historical_storyboard_opens_unified",
      (await project.innerText()).includes("Browser historical film") &&
        (await project.getAttribute("data-workflow")) === "film" &&
        legacy === 0 &&
        page.url().includes("workflow=film"),
      page.url(),
    );
    const projectId = (await project.getAttribute("data-project-id")) ?? "";
    await page.goto(`${base}/studio/projects/${projectId}?workflow=film&section=scenes`, { waitUntil: "domcontentloaded" });
    const sceneBefore = await prisma.studioScene.count({ where: { storyboardId: storyboard.id } });
    await page.getByRole("button", { name: "Scène toevoegen" }).evaluate((element) => (element as HTMLElement).click());
    await page.getByText("1. Nieuwe scène").waitFor({ timeout: 20000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByText("1. Nieuwe scène").waitFor({ timeout: 20000 });
    await page.goto(`${base}/studio`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("studio-v24-history-item").filter({ hasText: "Browser historical film" }).first().evaluate((element) => (element as HTMLElement).click());
    await page.waitForURL(/\/studio\/projects\//, { timeout: 30000 });
    const reopened = new URL(page.url());
    reopened.searchParams.set("section", "scenes");
    await page.goto(reopened.toString(), { waitUntil: "domcontentloaded" });
    await page.getByText("1. Nieuwe scène").waitFor({ timeout: 20000 });
    const sceneAfter = await prisma.studioScene.count({ where: { storyboardId: storyboard.id } });
    const pointers = await prisma.studioCreativeProject.count({ where: { ownerId: userA.id, storyboardId: storyboard.id } });
    const reopenedId = await page.getByTestId("studio-v24-project").getAttribute("data-project-id");
    record(
      "storyboard_edit_persists",
      sceneBefore === 0 && sceneAfter === 1 && pointers === 1 && creativeBefore === 0 && reopenedId === projectId,
      `scenes=${sceneAfter} pointers=${pointers} project=${reopenedId}`,
    );

    await page.goto(`${base}/studio/open/animation/${animation.id}`, { waitUntil: "domcontentloaded" });
    await page.waitForURL(/workflow=video/, { timeout: 30000 });
    const animationProject = page.getByTestId("studio-v24-project");
    await animationProject.waitFor();
    const animationScene = await animationProject.getAttribute("data-scene-id");
    record(
      "historical_animation_opens_unified",
      (await animationProject.innerText()).includes("Browser historical animation") &&
        (await animationProject.getAttribute("data-workflow")) === "video" &&
        animationScene === "" &&
        (await animationProject.getAttribute("data-project-id")) !== projectId,
      page.url(),
    );

    await page.goto(`${base}/studio/open/image/${canvasId}`, { waitUntil: "domcontentloaded" });
    await page.waitForURL(/workflow=image/, { timeout: 30000 });
    await page.getByRole("link", { name: "Afbeelding bewerken" }).evaluate((element) => (element as HTMLElement).click());
    await page.waitForURL(/\/editor\/start/, { timeout: 30000 });
    const imageHeading = await page.getByText("Browser historical image", { exact: true }).waitFor({ timeout: 60000 }).then(() => true).catch(() => false);
    const editorText = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(-400);
    record(
      "historical_image_editor",
      page.url().includes(`session=${encodeURIComponent(canvasId)}`) && imageHeading,
      editorText,
    );

    await page.goto(`${base}/studio/open/character/${character.id}`, { waitUntil: "domcontentloaded" });
    await page.waitForURL(new RegExp(`/studio/characters/${character.id}`), { timeout: 30000 });
    const characterHeading = await page.getByRole("heading", { name: "Browser historical character" }).waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
    record("historical_character", characterHeading, (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 240));

    await page.goto(`${base}/studio/open/asset/${voice.id}`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("studio-v24-asset").waitFor();
    const assetText = await page.getByTestId("studio-v24-asset").innerText();
    record(
      "read_only_voice_asset",
      assetText.includes("Browser generated voice") && assetText.includes("Audio afspelen") && (await page.locator("audio").count()) === 1,
      assetText.slice(0, 180),
    );

    await page.goto(`${base}/studio?storyboardId=${storyboard.id}&legacy=1`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("studio-adaptive-workspace").waitFor({ timeout: 30000 });
    record("legacy_escape_hatch", page.url().includes("legacy=1"), page.url());

    const routes = ["/editor", "/editor/start", "/animate", "/motion", "/publish", "/studio/photo-video", "/studio/assets", "/studio/characters"];
    for (const route of routes) {
      const response = await page.goto(`${base}${route}`, { waitUntil: "commit", timeout: 45000 }).catch(() => null);
      if (route === "/animate") await page.waitForURL(/\/motion/, { timeout: 8000 }).catch(() => undefined);
      const text = (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").trim();
      record(`legacy_${route}`, (response?.status() ?? 0) < 500 && text.length > 20, `${page.url()} status=${response?.status() ?? "none"}`);
    }

    for (const viewport of [
      { name: "desktop_1440", width: 1440, height: 900 },
      { name: "tablet_1024", width: 1024, height: 800 },
      { name: "tablet_768", width: 768, height: 900 },
      { name: "mobile_390", width: 390, height: 844 },
      { name: "mobile_360", width: 360, height: 740 },
    ]) {
      const sized = await context.newPage();
      sized.setDefaultTimeout(30000);
      await sized.setViewportSize({ width: viewport.width, height: viewport.height });
      try {
        await sized.goto(`${base}/studio`, { waitUntil: "commit", timeout: 30000 });
        await sized.getByTestId("studio-v24-history").waitFor();
        const homeOverflow = await overflow(sized);
        await sized.goto(`${base}/studio/projects/${projectId}?workflow=film&section=scenes`, { waitUntil: "commit", timeout: 30000 });
        await sized.getByTestId("studio-v24-project").waitFor();
        const addScene = sized.getByRole("button", { name: "Scène toevoegen" }).first();
        const box = await addScene.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return { width: rect.width, height: rect.height, left: rect.left };
        });
        const overflowNow = await overflow(sized);
        const clipped = box.width < 8 || box.left + box.width < 0 || box.left > viewport.width;
        record(viewport.name, !homeOverflow && !overflowNow && !clipped, `homeOverflow=${homeOverflow} overflow=${overflowNow} box=${box.width}x${box.height}@${Math.round(box.left)}`);
      } catch (error) {
        record(viewport.name, false, error instanceof Error ? error.message.split("\n")[0] : "viewport failed");
      } finally {
        await sized.close();
      }
    }

    const logout = await context.request.post(`${base}/api/auth/logout`, { headers: { origin: base } });
    const afterLogout = await context.request.get(`${base}/api/studio/projects/${projectId}/workspace`);
    record("logout_clears_access", logout.ok() && afterLogout.status() === 401, `logout=${logout.status()} workspace=${afterLogout.status()}`);

    const signedB = await login(context, emailB);
    const historyB = await context.request.get(`${base}/api/studio/history?limit=24`);
    const bodyB = (await historyB.json()) as { items?: Array<{ title: string }> };
    const openB = await context.request.post(`${base}/api/studio/open`, { data: { kind: "storyboard", id: storyboard.id } });
    record(
      "cross_user",
      signedB.ok() && openB.status() === 404 && !(bodyB.items ?? []).some((item) => item.title.includes("Browser historical")),
      `history=${historyB.status()} open=${openB.status()}`,
    );

    const balance = (await prisma.studioWallet.findUnique({ where: { userId: userA.id } }))?.balance;
    const ledger = await prisma.studioLedgerEntry.count({ where: { userId: userA.id } });
    const storyboardRow = await prisma.studioStoryboard.findUniqueOrThrow({ where: { id: storyboard.id } });
    record(
      "preservation_and_zero_spend",
      balance === 0 && ledger === 0 && storyboardRow.ownerId === userA.id && storyboardRow.title === "Browser historical film",
      `balance=${balance} ledger=${ledger}`,
    );
  } finally {
    await mkdir("docs/studio-v24", { recursive: true });
    await writeFile(
      "docs/studio-v24/BROWSER-CERT.json",
      JSON.stringify({ commit, database: CERT_DB, steps, failed: steps.filter((step) => !step.ok).length }, null, 2),
    );
    await browser.close();
    await prisma.$disconnect();
  }
  if (steps.some((step) => !step.ok)) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
