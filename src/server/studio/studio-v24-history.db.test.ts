/**
 * Disposable local PostgreSQL certification for unified history.
 * Refuses every URL that is not the local database homecheff_film_cert_v24.
 * This file is not part of the default npm test script.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword } from "@/server/auth/session";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

const CERT_DB = "homecheff_film_cert_v24";

function isolatedDatabaseUrl(): string | null {
  const url = process.env.V24_CERT_DATABASE_URL?.trim() ?? "";
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("V24_CERT_DATABASE_URL is not a URL.");
  }
  const host = parsed.hostname;
  const name = parsed.pathname.replace(/^\//, "");
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error("Certification database host is not local.");
  }
  if (name !== CERT_DB) {
    throw new Error("Certification database name is not the disposable local database.");
  }
  if (/neon|vercel|preview|prod/i.test(`${host}${name}`)) {
    throw new Error("Certification database URL looks remote.");
  }
  return url;
}

function canvasDocument(id: string, name: string): EditorCanvasDocument {
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

test("historical records open in the unified studio without copying media", async (t) => {
  const url = isolatedDatabaseUrl();
  if (!url) {
    t.skip("V24_CERT_DATABASE_URL is not configured");
    return;
  }
  process.env.DATABASE_URL = url;
  delete process.env.OPENAI_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;
  delete process.env.VIDU_API_KEY;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  process.env.NODE_ENV = "test";

  const { prisma } = await import("@/lib/prisma");
  const { listStudioHistoryForOwner, openLegacyRecordInStudio } = await import("@/server/studio/studio-v24-history");
  const { updateStudioStoryboard } = await import("@/server/studio/studio-storyboard-service");
  const { upsertEditorCanvasProject } = await import("@/server/editor/editor-canvas-project-service");
  const stamp = Date.now();
  const userA = await prisma.user.create({
    data: { email: `v24-a-${stamp}@example.test`, passwordHash: hashPassword("film-cert-local-only"), role: "user" },
  });
  const userB = await prisma.user.create({
    data: { email: `v24-b-${stamp}@example.test`, passwordHash: hashPassword("film-cert-local-only"), role: "user" },
  });

  const storyboard = await prisma.studioStoryboard.create({
    data: { ownerId: userA.id, title: "Historical storyboard" },
  });
  const animation = await prisma.animationProject.create({
    data: { ownerId: userA.id, title: "Historical animation", status: "draft" },
  });
  const canvasId = `v24-canvas-${stamp}`;
  await prisma.editorCanvasProject.create({
    data: {
      id: canvasId,
      ownerId: userA.id,
      name: "Historical image",
      payload: canvasDocument(canvasId, "Historical image") as object,
    },
  });
  const character = await prisma.studioCharacter.create({
    data: {
      ownerId: userA.id,
      name: "Historical character",
      slug: `historical-${stamp}`,
      role: "human",
      referenceImageUrl: "https://127.0.0.1/cert-character.png",
      referenceStorageKey: "cert/character.png",
    },
  });
  const imageAsset = await prisma.studioLibraryAsset.create({
    data: {
      ownerId: userA.id,
      family: "image",
      title: "Generated still",
      previewUrl: "",
      sourceKind: "v24_cert",
      sourceId: `image-${stamp}`,
    },
  });
  const voiceAsset = await prisma.studioLibraryAsset.create({
    data: {
      ownerId: userA.id,
      family: "voice",
      title: "Generated voice",
      previewUrl: "https://127.0.0.1/cert-voice.mp3",
      sourceKind: "v24_cert",
      sourceId: `voice-${stamp}`,
    },
  });
  const creative = await prisma.studioCreativeProject.create({
    data: { ownerId: userA.id, title: "New film project" },
  });

  const before = {
    storyboardUpdated: storyboard.updatedAt.toISOString(),
    animationUpdated: animation.updatedAt.toISOString(),
    characterName: character.name,
  };
  const history = await listStudioHistoryForOwner(userA.id, 24);
  const ids = new Set(history.map((item) => item.sourceId));
  for (const id of [storyboard.id, animation.id, canvasId, character.id, imageAsset.id, voiceAsset.id, creative.id]) {
    assert.equal(ids.has(id), true, id);
  }
  const still = history.find((item) => item.sourceId === imageAsset.id);
  const voice = history.find((item) => item.sourceId === voiceAsset.id);
  assert.equal(still?.editable, false);
  assert.equal(still?.action, "view");
  assert.equal(still?.previewUrl, null);
  assert.equal(voice?.editable, false);
  assert.equal(voice?.action, "play");

  const firstOpen = await openLegacyRecordInStudio(userA.id, "storyboard", storyboard.id);
  const secondOpen = await openLegacyRecordInStudio(userA.id, "storyboard", storyboard.id);
  assert.equal(firstOpen?.created, true);
  assert.equal(secondOpen?.created, false);
  assert.equal(secondOpen?.href, firstOpen?.href);
  const pointers = await prisma.studioCreativeProject.count({ where: { ownerId: userA.id, storyboardId: storyboard.id } });
  assert.equal(pointers, 1);

  const animationOpen = await openLegacyRecordInStudio(userA.id, "animation", animation.id);
  const imageOpen = await openLegacyRecordInStudio(userA.id, "image", canvasId);
  const characterOpen = await openLegacyRecordInStudio(userA.id, "character", character.id);
  const assetOpen = await openLegacyRecordInStudio(userA.id, "asset", imageAsset.id);
  assert.match(animationOpen?.href ?? "", /^\/studio\/projects\/.+workflow=video/);
  assert.match(imageOpen?.href ?? "", /workflow=image/);
  assert.equal(characterOpen?.href, `/studio/characters/${character.id}`);
  assert.equal(assetOpen?.item?.editable, false);
  assert.deepEqual(await openLegacyRecordInStudio(userA.id, "animation", animation.id), {
    href: animationOpen?.href,
    created: false,
    item: null,
  });

  assert.equal(await openLegacyRecordInStudio(userB.id, "storyboard", storyboard.id), null);
  assert.equal(await openLegacyRecordInStudio(userB.id, "animation", animation.id), null);
  assert.equal(await openLegacyRecordInStudio(userB.id, "image", canvasId), null);
  assert.equal(await openLegacyRecordInStudio(userB.id, "character", character.id), null);
  assert.equal(await openLegacyRecordInStudio(userB.id, "asset", voiceAsset.id), null);
  const strangerHistory = await listStudioHistoryForOwner(userB.id, 24);
  assert.equal(strangerHistory.some((item) => item.sourceId === storyboard.id), false);

  const saved = await updateStudioStoryboard(storyboard.id, { id: userA.id, role: "user" }, { title: "Historical storyboard revised" });
  assert.equal("error" in saved, false);
  const denied = await updateStudioStoryboard(storyboard.id, { id: userB.id, role: "user" }, { title: "Stolen" });
  assert.equal("error" in denied, true);
  const reloaded = await prisma.studioStoryboard.findUniqueOrThrow({ where: { id: storyboard.id } });
  assert.equal(reloaded.title, "Historical storyboard revised");
  assert.equal(reloaded.ownerId, userA.id);
  assert.equal(reloaded.id, storyboard.id);

  await upsertEditorCanvasProject(userA.id, canvasId, {
    name: "Historical image revised",
    payload: canvasDocument(canvasId, "Historical image revised"),
  });
  const canvas = await prisma.editorCanvasProject.findUniqueOrThrow({ where: { id: canvasId } });
  assert.equal(canvas.name, "Historical image revised");
  assert.equal(canvas.ownerId, userA.id);
  assert.equal((canvas.payload as { backgroundUrl?: string }).backgroundUrl, "https://127.0.0.1/cert-still.png");
  assert.equal((canvas.payload as { objects?: unknown[] }).objects?.length, 0);

  const animationRow = await prisma.animationProject.findUniqueOrThrow({ where: { id: animation.id } });
  assert.equal(animationRow.title, "Historical animation");
  assert.equal(animationRow.ownerId, userA.id);
  assert.equal(animationRow.updatedAt.toISOString(), before.animationUpdated);
  const characterRow = await prisma.studioCharacter.findUniqueOrThrow({ where: { id: character.id } });
  assert.equal(characterRow.name, before.characterName);
  assert.equal(characterRow.referenceImageUrl, "https://127.0.0.1/cert-character.png");
  const sourceStoryboardTime = storyboard.updatedAt;
  assert.notEqual(reloaded.updatedAt.toISOString(), before.storyboardUpdated);
  assert.ok(reloaded.updatedAt >= sourceStoryboardTime);
});
