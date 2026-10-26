/**
 * Browser certification against the disposable local database and local HTTPS server.
 * Refuses any database that is not homecheff_film_cert_2u on 127.0.0.1.
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { hashPassword } from "@/server/auth/session";

const CERT_DB = "homecheff_film_cert_2u";
const base = process.env.FILM_CERT_BASE_URL?.trim() || "https://127.0.0.1:3456";
const password = "film-cert-local-only";

function assertLocal() {
  const url = process.env.FILM_CERT_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim() || "";
  const parsed = new URL(url);
  const name = parsed.pathname.replace(/^\//, "");
  if (parsed.hostname !== "127.0.0.1" || name !== CERT_DB) {
    throw new Error("Browser certification refused a non-local database.");
  }
  if (!base.startsWith("https://127.0.0.1:")) {
    throw new Error("Browser certification must use the local HTTPS origin.");
  }
  process.env.DATABASE_URL = url;
}

async function main() {
assertLocal();

const { prisma } = await import("@/lib/prisma");

const email = `film-browser-${Date.now()}@example.test`;
const user = await prisma.user.create({
  data: { email, passwordHash: hashPassword(password), role: "user" },
});
await prisma.studioAccount.create({
  data: { userId: user.id, accountType: "creator", accountStatus: "active" },
});
await prisma.studioWallet.create({
  data: {
    userId: user.id,
    balance: 500,
    promotionalBalance: 500,
    lifetimeGranted: 500,
  },
});
const characterA = await prisma.studioCharacter.create({
  data: {
    ownerId: user.id,
    name: "Character A",
    slug: `character-a-${Date.now()}`,
    role: "human",
    referenceImageUrl: "https://cert.local/masters/a.png",
    referenceStorageKey: "local/a",
  },
});
const characterB = await prisma.studioCharacter.create({
  data: {
    ownerId: user.id,
    name: "Character B",
    slug: `character-b-${Date.now()}`,
    role: "human",
    referenceImageUrl: "https://cert.local/masters/b.png",
    referenceStorageKey: "local/b",
  },
});

const forbiddenHosts: string[] = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ ignoreHTTPSErrors: true });
page.on("request", (request) => {
  try {
    const host = new URL(request.url()).hostname;
    if (host.endsWith("homecheff.eu") || host === "api.openai.com" || host.endsWith("stripe.com")) {
      forbiddenHosts.push(host);
    }
  } catch {
    /* ignore */
  }
});

try {
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30000 });

  await page.goto(`${base}/projects`, { waitUntil: "domcontentloaded" });
  const title = page.locator('input[name="filmTitle"]');
  await title.waitFor();
  await title.evaluate((element) => {
    const input = element as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, "Browser certification film");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const createFilm = page.getByRole("button", { name: /Nieuwe film|New film/ });
  await createFilm.waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const button = document.querySelector('form button[type="submit"]');
    return button instanceof HTMLButtonElement && !button.disabled;
  });
  await createFilm.click();
  await page.waitForURL(/\/studio\/projects\/[^/]+\?section=scenes/, { timeout: 30000 });
  const projectId = page.url().split("/studio/projects/")[1]?.split("?")[0] ?? "";
  assert.match(projectId, /^c[a-z0-9]+$/);
  await page.getByText(/storyboard van deze film is gekoppeld|storyboard is linked/i).waitFor();

  const addScene = page.getByRole("button", { name: /Scène toevoegen|Add scene/ });
  await addScene.click();
  await page.getByRole("button", { name: /1\. Nieuwe scène|1\. New scene/ }).waitFor();
  await addScene.click();
  await page.getByRole("button", { name: /2\. Nieuwe scène|2\. New scene/ }).waitFor();

  await prisma.studioLibraryAsset.create({
    data: {
      ownerId: user.id,
      projectId,
      family: "character",
      title: "Character A",
      sourceKind: "passion_character_master",
      sourceId: `browser-a-${projectId}`,
      metadataJson: { characterId: characterA.id },
    },
  });
  await prisma.studioLibraryAsset.create({
    data: {
      ownerId: user.id,
      projectId,
      family: "character",
      title: "Character B",
      sourceKind: "passion_character_master",
      sourceId: `browser-b-${projectId}`,
      metadataJson: { characterId: characterB.id },
    },
  });
  await page.reload({ waitUntil: "domcontentloaded" });

  await page.getByRole("checkbox", { name: "Character A" }).check();
  await page.getByRole("button", { name: /Scène opslaan|Save scene/ }).click();
  await page.getByRole("button", { name: /2\. Nieuwe scène|2\. New scene/ }).click();
  await page.getByRole("checkbox", { name: "Character B" }).check();
  await page.getByRole("button", { name: /Scène opslaan|Save scene/ }).click();
  await page.waitForTimeout(500);

  await page.goto(`${base}/projects`, { waitUntil: "domcontentloaded" });
  await page.goto(`${base}/studio/projects/${projectId}?section=scenes`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /1\. Nieuwe scène|1\. New scene/ }).click();
  assert.equal(await page.getByRole("checkbox", { name: "Character A" }).isChecked(), true);
  await page.getByRole("button", { name: /2\. Nieuwe scène|2\. New scene/ }).click();
  assert.equal(await page.getByRole("checkbox", { name: "Character B" }).isChecked(), true);
  assert.equal(await page.getByRole("checkbox", { name: "Character A" }).isChecked(), false);

  const storyboard = await prisma.studioCreativeProject.findUniqueOrThrow({
    where: { id: projectId },
    select: { storyboardId: true, title: true, ownerId: true },
  });
  assert.equal(storyboard.title, "Browser certification film");
  assert.equal(storyboard.ownerId, user.id);
  assert.ok(storyboard.storyboardId);
  const scenes = await prisma.studioScene.findMany({
    where: { storyboardId: storyboard.storyboardId },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  assert.equal(scenes.length, 2);

  const generated = await page.evaluate(
    async ({ storyboardId, sceneId }) => {
      const response = await fetch(`/api/studio/storyboards/${storyboardId}/scenes/${sceneId}/images`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: true }),
      });
      const body = (await response.json().catch(() => ({}))) as { code?: string; image?: { id?: string } };
      return { status: response.status, code: body.code ?? "", imageId: body.image?.id ?? "" };
    },
    { storyboardId: storyboard.storyboardId, sceneId: scenes[1]!.id },
  );
  assert.equal(generated.status, 201, generated.code);
  const image = await prisma.studioSceneImage.findFirstOrThrow({
    where: { sceneId: scenes[1]!.id },
    orderBy: { createdAt: "desc" },
  });
  assert.equal(image.provider, "mock");
  assert.equal(image.status, "completed");
  assert.match(image.imageUrl, /^file:\/\//);

  await page.getByRole("button", { name: /Profile|Profiel/ }).click();
  await page.getByRole("button", { name: /Logout|Uitloggen/ }).click();
  await page.waitForURL(/\/login/, { timeout: 15000 });
  const projectsApi = await page.evaluate(async () => {
    const response = await fetch("/api/studio/projects", { credentials: "include" });
    return response.status;
  });
  assert.equal(projectsApi, 401);
  assert.deepEqual(forbiddenHosts, []);
  console.log(`BROWSER_PROJECT_ID=${projectId}`);
} finally {
  await browser.close();
  await prisma.$disconnect();
}
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "browser certification failed";
  console.error(message);
  process.exit(1);
});
