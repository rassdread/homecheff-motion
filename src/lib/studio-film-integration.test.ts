import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  characterIdsFromLibraryAssets,
  normalizeFilmRequestKey,
  uniqueSceneCharacterIds,
} from "@/lib/studio-film-characters";
import { decideStoryboardCreate } from "@/lib/studio-project-linking";
import { pickReferenceUrlsForStillAdapter } from "@/lib/studio-production-prompt-orchestrator";
import type { ProductionInstructions, ProductionReferenceAsset } from "@/types/studio-unified-production-context";

const root = process.cwd();

function source(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

test("explicit film storyboard linking reuses an existing storyboard and leaves a null link alone", () => {
  assert.equal(decideStoryboardCreate(null), "create");
  assert.equal(decideStoryboardCreate("board-owned"), "reuse");
});

test("project characters come from character library assets and ignore unrelated assets", () => {
  const ids = characterIdsFromLibraryAssets([
    { family: "character", metadataJson: { characterId: "char-a" } },
    { family: "character", metadataJson: { characterId: "char-a" } },
    { family: "character", metadataJson: { characterId: "  char-b  " } },
    { family: "image", metadataJson: { characterId: "char-c" } },
    { family: "character", metadataJson: {} },
    { family: "character", metadataJson: null },
  ]);
  assert.deepEqual(ids, ["char-a", "char-b"]);
});

test("scene assignment is idempotent and removal is only a missing id", () => {
  assert.deepEqual(uniqueSceneCharacterIds(["a", "a", " b ", ""]), ["a", "b"]);
  const assigned = uniqueSceneCharacterIds(["a", "b"]);
  const repeated = uniqueSceneCharacterIds([...assigned, "a"]);
  assert.deepEqual(repeated, ["a", "b"]);
  const withoutB = uniqueSceneCharacterIds(assigned.filter((id) => id !== "b"));
  assert.deepEqual(withoutB, ["a"]);
});

test("film request keys are explicit and do not accept arbitrary client owner ids", () => {
  assert.equal(normalizeFilmRequestKey("film-key-1"), "film-key-1");
  assert.equal(normalizeFilmRequestKey("short"), null);
  assert.equal(normalizeFilmRequestKey("owner-id with spaces"), null);
  assert.equal(normalizeFilmRequestKey(undefined), null);
});

test("still adapter receives the assigned master once and excludes an unassigned character", () => {
  const assigned: ProductionReferenceAsset = {
    entityId: "char-a",
    entityKind: "character",
    label: "A",
    role: "identity",
    url: "https://cdn.example.test/masters/a.png",
    exactness: "MUST_PRESERVE",
  };
  const duplicate: ProductionReferenceAsset = { ...assigned };
  const picked = pickReferenceUrlsForStillAdapter({
    references: [assigned, duplicate],
  } as ProductionInstructions);
  assert.deepEqual(
    picked.map((item) => item.url),
    ["https://cdn.example.test/masters/a.png"],
  );
  assert.equal(
    picked.some((item) => item.url.includes("/masters/unassigned")),
    false,
  );
});

test("film creation, assignment, and master confirmation reuse existing services", () => {
  const films = source("src/app/api/studio/films/route.ts");
  const preparation = source("src/server/studio/studio-film-preparation.ts");
  const creative = source("src/app/api/studio/creative-projects/route.ts");
  const passion = source("src/server/studio/studio-passion-character-masters-runtime.ts");
  const sceneImage = source("src/server/studio/studio-scene-image-service.ts");
  const workspace = source("src/server/studio/load-studio-project-workspace.ts");
  const login = source("src/app/api/auth/login/route.ts");
  const logout = source("src/app/api/auth/logout/route.ts");
  const previewAuth = source("src/server/auth/preview-local-auth.ts");
  const session = source("src/server/auth/session.ts");
  const library = source("src/components/projects/studio-my-projects-library.tsx");
  const panel = source("src/components/studio/studio-project-scene-panel.tsx");

  assert.match(films, /createOwnedFilmProject/);
  assert.match(films, /requireActiveUser/);
  assert.match(films, /ownerId: user\.id/);
  assert.doesNotMatch(films, /body\.ownerId/);
  const filmCreate = preparation.slice(
    preparation.indexOf("export async function createOwnedFilmProject"),
    preparation.indexOf("async function findOwnedFilmByRequestKey"),
  );
  assert.match(filmCreate, /prisma\.\$transaction/);
  assert.doesNotMatch(filmCreate, /animationProjectId|editorCanvasProjectId|homeCheffProjectId/);
  assert.match(preparation, /decideStoryboardCreate/);
  assert.match(preparation, /uniqueSceneCharacterIds/);
  assert.match(preparation, /characterIdsFromLibraryAssets/);
  assert.doesNotMatch(creative, /createOwnedFilmProject/);
  assert.doesNotMatch(passion, /updateFilmScene|studioSceneCharacter/);
  assert.doesNotMatch(sceneImage, /CHARACTER_MASTER_REQUIRED|characterMasterBlocked/);
  assert.match(workspace, /characterIdsFromLibraryAssets/);
  assert.doesNotMatch(login, /studio-film-preparation/);
  assert.doesNotMatch(logout, /studio-film-preparation/);
  assert.doesNotMatch(previewAuth, /studio-film-preparation/);
  assert.doesNotMatch(session, /studio-film-preparation/);
  assert.match(library, /\/api\/studio\/films/);
  assert.match(panel, /\/film-characters/);
  assert.match(panel, /characterIds/);
});

test("scene references stay limited to characters assigned on that scene", () => {
  const orchestrator = source("src/lib/studio-production-prompt-orchestrator.ts");
  assert.match(
    orchestrator,
    /if \(ref\.entityKind === "character"\) \{\s*return scene\.characterIds\.includes\(ref\.entityId\);/,
  );
});
