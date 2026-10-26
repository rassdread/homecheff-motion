/**
 * Disposable local PostgreSQL certification.
 * Refuses every URL that is not the local database homecheff_film_cert_2u.
 * This file is not part of the default npm test script.
 */
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { hashPassword } from "@/server/auth/session";

const CERT_DB = "homecheff_film_cert_2u";

function isolatedDatabaseUrl(): string | null {
  const url = process.env.FILM_CERT_DATABASE_URL?.trim() ?? "";
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("FILM_CERT_DATABASE_URL is not a URL.");
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

test("film project certification against the disposable local database", async (t) => {
  const url = isolatedDatabaseUrl();
  if (!url) {
    t.skip("FILM_CERT_DATABASE_URL is not configured");
    return;
  }
  process.env.DATABASE_URL = url;
  delete process.env.OPENAI_API_KEY;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
  process.env.NODE_ENV = "test";
  process.env.STUDIO_SCENE_IMAGE_PROVIDER = "mock";
  process.env.STUDIO_SCENE_IMAGE_LOCAL_DIR = await mkdtemp(join(tmpdir(), "film-cert-images-"));

  const { prisma } = await import("@/lib/prisma");
  const { createCreativeProject } = await import("@/server/studio-library/creative-project-service");
  const {
    attachFilmStoryboard,
    createFilmScene,
    createOwnedFilmProject,
    listOwnedFilmCharacters,
    updateFilmScene,
  } = await import("@/server/studio/studio-film-preparation");
  const { loadStudioProjectWorkspace } = await import("@/server/studio/load-studio-project-workspace");
  const { createStudioScene, createStudioStoryboard, updateStudioScene } = await import(
    "@/server/studio/studio-storyboard-service"
  );
  const { generateStudioSceneImage } = await import("@/server/studio/studio-scene-image-service");
  const { getSelectedSceneImageProviderId } = await import("@/server/scene-image-providers");

  assert.equal(getSelectedSceneImageProviderId(), "mock");

  const userA = await prisma.user.create({
    data: {
      email: `film-cert-a-${Date.now()}@example.test`,
      passwordHash: hashPassword("film-cert-local-only"),
      role: "user",
    },
  });
  const userB = await prisma.user.create({
    data: {
      email: `film-cert-b-${Date.now()}@example.test`,
      passwordHash: hashPassword("film-cert-local-only"),
      role: "user",
    },
  });
  const viewerA = { id: userA.id, role: "user" as const };
  const viewerB = { id: userB.id, role: "user" as const };

  const first = await createOwnedFilmProject({
    ownerId: userA.id,
    title: "  Certification film  ",
    description: "Local only",
    idempotencyKey: "cert-film-key-0001",
  });
  assert.equal("error" in first, false);
  if ("error" in first) return;
  assert.equal(first.created, true);
  assert.equal(first.title, "Certification film");
  const project = await prisma.studioCreativeProject.findUniqueOrThrow({ where: { id: first.projectId } });
  const storyboard = await prisma.studioStoryboard.findUniqueOrThrow({ where: { id: first.storyboardId! } });
  assert.equal(project.storyboardId, storyboard.id);
  assert.equal(project.ownerId, userA.id);
  assert.equal(storyboard.ownerId, userA.id);
  assert.equal(project.title, "Certification film");
  assert.equal(project.animationProjectId, null);
  assert.equal(project.editorCanvasProjectId, null);
  assert.equal(project.homeCheffProjectId, null);

  const repeated = await createOwnedFilmProject({
    ownerId: userA.id,
    title: "Different title",
    idempotencyKey: "cert-film-key-0001",
  });
  assert.equal("error" in repeated, false);
  if ("error" in repeated) return;
  assert.equal(repeated.projectId, first.projectId);
  assert.equal(repeated.storyboardId, first.storyboardId);
  assert.equal(repeated.created, false);
  assert.equal(repeated.title, "Certification film");

  const concurrentKey = "cert-film-concurrent-01";
  const concurrent = await Promise.all(
    Array.from({ length: 8 }, () =>
      createOwnedFilmProject({
        ownerId: userA.id,
        title: "Concurrent film",
        idempotencyKey: concurrentKey,
      }),
    ),
  );
  const concurrentIds = new Set(
    concurrent.map((result) => ("error" in result ? "error" : result.projectId)),
  );
  assert.deepEqual([...concurrentIds], [concurrent[0] && "error" in concurrent[0] ? "error" : concurrent[0]!.projectId]);
  assert.equal(concurrentIds.has("error"), false);
  const concurrentCount = await prisma.studioCreativeProject.count({
    where: {
      ownerId: userA.id,
      AND: [{ metadataJson: { path: ["filmRequestKey"], equals: concurrentKey } }],
    },
  });
  assert.equal(concurrentCount, 1);

  const otherKey = await createOwnedFilmProject({
    ownerId: userA.id,
    title: "Second film",
    idempotencyKey: "cert-film-key-0002",
  });
  assert.equal("error" in otherKey, false);
  if ("error" in otherKey) return;
  assert.notEqual(otherKey.projectId, first.projectId);

  const otherUser = await createOwnedFilmProject({
    ownerId: userB.id,
    title: "Other owner film",
    idempotencyKey: "cert-film-key-0001",
  });
  assert.equal("error" in otherUser, false);
  if ("error" in otherUser) return;
  assert.notEqual(otherUser.projectId, first.projectId);

  const scene1 = await createFilmScene(userA.id, first.projectId, viewerA, "Scene one");
  const scene2 = await createFilmScene(userA.id, first.projectId, viewerA, "Scene two");
  assert.equal("error" in scene1, false);
  assert.equal("error" in scene2, false);
  if ("error" in scene1 || "error" in scene2) return;
  assert.equal(scene1.scene.storyboardId, storyboard.id);
  assert.equal(scene2.scene.storyboardId, storyboard.id);

  async function character(ownerId: string, name: string, referenceImageUrl: string) {
    return prisma.studioCharacter.create({
      data: {
        ownerId,
        name,
        slug: name.toLowerCase().replace(/\s+/g, "-"),
        role: "human",
        referenceImageUrl,
        referenceStorageKey: `local/${name}`,
      },
    });
  }

  const characterA = await character(userA.id, "Character A", "https://cert.local/masters/a.png");
  const characterB = await character(userA.id, "Character B", "https://cert.local/masters/b.png");
  const outsider = await character(userA.id, "Outsider", "https://cert.local/masters/outsider.png");
  const foreign = await character(userB.id, "Foreign", "https://cert.local/masters/foreign.png");

  async function linkCharacter(characterId: string, sourceId: string) {
    await prisma.studioLibraryAsset.create({
      data: {
        ownerId: userA.id,
        projectId: first.projectId,
        family: "character",
        title: sourceId,
        sourceKind: "passion_character_master",
        sourceId,
        metadataJson: { characterId },
        previewUrl: "",
      },
    });
  }
  await linkCharacter(characterA.id, "master-a");
  await linkCharacter(characterB.id, "master-b");

  const listed = await listOwnedFilmCharacters(userA.id, first.projectId);
  assert.deepEqual(listed.map((item) => item.id).sort(), [characterA.id, characterB.id].sort());

  const assignA = await updateFilmScene(userA.id, first.projectId, scene1.scene.id, viewerA, {
    characterIds: [characterA.id],
  });
  const assignB = await updateFilmScene(userA.id, first.projectId, scene2.scene.id, viewerA, {
    characterIds: [characterB.id],
  });
  assert.equal("error" in assignA, false);
  assert.equal("error" in assignB, false);
  const scene1Ids = async () =>
    (await prisma.studioSceneCharacter.findMany({ where: { sceneId: scene1.scene.id }, select: { characterId: true } })).map(
      (row) => row.characterId,
    );
  const scene2Ids = async () =>
    (await prisma.studioSceneCharacter.findMany({ where: { sceneId: scene2.scene.id }, select: { characterId: true } })).map(
      (row) => row.characterId,
    );
  assert.deepEqual(await scene1Ids(), [characterA.id]);
  assert.deepEqual(await scene2Ids(), [characterB.id]);

  const assignAgain = await updateFilmScene(userA.id, first.projectId, scene1.scene.id, viewerA, {
    characterIds: [characterA.id, characterA.id],
  });
  assert.equal("error" in assignAgain, false);
  assert.equal(await prisma.studioSceneCharacter.count({ where: { sceneId: scene1.scene.id, characterId: characterA.id } }), 1);

  await prisma.studioSceneCharacter.create({
    data: { sceneId: scene1.scene.id, characterId: outsider.id },
  });
  const kept = await updateFilmScene(userA.id, first.projectId, scene1.scene.id, viewerA, {
    characterIds: [characterA.id, outsider.id],
  });
  assert.equal("error" in kept, false);
  assert.deepEqual((await scene1Ids()).sort(), [characterA.id, outsider.id].sort());

  const rejected = await updateFilmScene(userA.id, first.projectId, scene2.scene.id, viewerA, {
    characterIds: [characterB.id, foreign.id],
  });
  assert.equal("error" in rejected, true);
  if (!("error" in rejected)) return;
  assert.equal(rejected.error.code, "character_not_in_film");
  assert.deepEqual(await scene2Ids(), [characterB.id]);

  const ownedButNotInFilm = await updateFilmScene(userA.id, first.projectId, scene2.scene.id, viewerA, {
    characterIds: [characterB.id],
  });
  assert.equal("error" in ownedButNotInFilm, false);

  const removed = await updateFilmScene(userA.id, first.projectId, scene1.scene.id, viewerA, {
    characterIds: [outsider.id],
  });
  assert.equal("error" in removed, false);
  assert.deepEqual(await scene1Ids(), [outsider.id]);
  const stillThere = await prisma.studioCharacter.findUniqueOrThrow({ where: { id: characterA.id } });
  assert.equal(stillThere.referenceImageUrl, "https://cert.local/masters/a.png");
  assert.deepEqual(await scene2Ids(), [characterB.id]);

  const reopened = await loadStudioProjectWorkspace(userA.id, first.projectId);
  assert.ok(reopened);
  assert.equal(reopened?.project.id, first.projectId);
  assert.equal(reopened?.project.storyboardId, first.storyboardId);
  assert.deepEqual(
    reopened?.scenes.map((scene) => scene.title).sort(),
    ["Scene one", "Scene two"],
  );
  const reopenedScene2 = reopened?.scenes.find((scene) => scene.id === scene2.scene.id);
  assert.deepEqual(reopenedScene2?.characters.map((item) => item.id), [characterB.id]);
  assert.equal(
    reopened?.characters.find((item) => item.id === characterB.id)?.referenceImageUrl,
    "https://cert.local/masters/b.png",
  );

  const { MockSceneImageProvider } = await import("@/server/scene-image-providers/mock-provider");
  const seen: string[][] = [];
  const originalGenerate = MockSceneImageProvider.prototype.generate;
  MockSceneImageProvider.prototype.generate = async function (input) {
    seen.push((input.referenceImages ?? []).map((item) => item.url));
    return originalGenerate.call(this, input);
  };
  const generated = await generateStudioSceneImage(storyboard.id, scene2.scene.id, viewerA);
  MockSceneImageProvider.prototype.generate = originalGenerate;
  assert.equal("error" in generated, false);
  if ("error" in generated) return;
  assert.equal(generated.image.provider, "mock");
  assert.equal(seen.length, 1);
  assert.deepEqual(seen[0], ["https://cert.local/masters/b.png"]);
  const stored = await prisma.studioSceneImage.findUniqueOrThrow({ where: { id: generated.image.id } });
  assert.equal(stored.status, "completed");
  assert.equal(stored.provider, "mock");
  assert.match(stored.imageUrl, /^file:\/\//);
  const bytes = await readFile(stored.storageKey);
  assert.ok(bytes.length > 8);

  const emptyScene = await createFilmScene(userA.id, first.projectId, viewerA, "No characters");
  assert.equal("error" in emptyScene, false);
  if ("error" in emptyScene) return;
  const unblocked = await generateStudioSceneImage(storyboard.id, emptyScene.scene.id, viewerA);
  assert.equal("error" in unblocked, false);
  if (!("error" in unblocked)) {
    assert.notEqual(unblocked.image.status, "failed");
  }

  assert.equal(await loadStudioProjectWorkspace(userB.id, first.projectId), null);
  const stolenBoard = await attachFilmStoryboard({
    ownerId: userB.id,
    projectId: otherUser.projectId,
    storyboardId: storyboard.id,
    confirmed: true,
  });
  assert.equal("error" in stolenBoard, true);
  const stolenScene = await updateFilmScene(userB.id, first.projectId, scene2.scene.id, viewerB, {
    characterIds: [foreign.id],
  });
  assert.equal("error" in stolenScene, true);
  const stolenImage = await generateStudioSceneImage(storyboard.id, scene2.scene.id, viewerB);
  assert.equal("error" in stolenImage, true);
  assert.equal(await prisma.studioSceneImage.count({ where: { id: stored.id, scene: { storyboard: { ownerId: userB.id } } } }), 0);

  const plain = await createCreativeProject({ ownerId: userA.id, title: "Ordinary project" });
  assert.equal(plain.storyboardId, null);
  assert.equal(plain.animationProjectId, null);
  assert.equal(plain.title, "Ordinary project");

  const legacyBoard = await createStudioStoryboard(userA.id, { title: "Legacy board" });
  assert.equal("error" in legacyBoard, false);
  if ("error" in legacyBoard) return;
  const legacyScene = await createStudioScene(legacyBoard.storyboard.id, viewerA, { title: "Legacy scene" });
  assert.equal("error" in legacyScene, false);
  if ("error" in legacyScene) return;
  const legacyAssign = await updateStudioScene(legacyBoard.storyboard.id, legacyScene.scene.id, viewerA, {
    characterIds: [outsider.id],
  });
  assert.equal("error" in legacyAssign, false);
  assert.equal(
    await prisma.studioSceneCharacter.count({
      where: { sceneId: legacyScene.scene.id, characterId: outsider.id },
    }),
    1,
  );
});
