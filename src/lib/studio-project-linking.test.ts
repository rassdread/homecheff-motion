import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  decideLink,
  decideStoryboardCreate,
  mergeSceneSubtitleLine,
  moveSceneId,
} from "@/lib/studio-project-linking";

const root = process.cwd();

test("storyboard creation reuses an existing link and does not replace it", () => {
  assert.equal(decideStoryboardCreate(null), "create");
  assert.equal(decideStoryboardCreate("board-1"), "reuse");
});

test("storyboard attachment rejects unowned, conflicting, and unconfirmed links", () => {
  assert.deepEqual(
    decideLink({ currentId: null, targetId: "b", targetOwned: false, otherFilmId: null, confirmed: true }),
    { ok: false, code: "not_found" },
  );
  assert.deepEqual(
    decideLink({ currentId: "a", targetId: "b", targetOwned: true, otherFilmId: null, confirmed: true }),
    { ok: false, code: "already_linked_other" },
  );
  assert.deepEqual(
    decideLink({ currentId: "a", targetId: "a", targetOwned: true, otherFilmId: null, confirmed: false }),
    { ok: true, kind: "already_linked" },
  );
  assert.deepEqual(
    decideLink({ currentId: null, targetId: "b", targetOwned: true, otherFilmId: "other", confirmed: true }),
    { ok: false, code: "linked_elsewhere" },
  );
  assert.deepEqual(
    decideLink({ currentId: null, targetId: "b", targetOwned: true, otherFilmId: null, confirmed: false }),
    { ok: false, code: "confirmation_required" },
  );
  assert.deepEqual(
    decideLink({ currentId: null, targetId: "b", targetOwned: true, otherFilmId: null, confirmed: true }),
    { ok: true, kind: "attach" },
  );
});

test("scene order swaps neighbors and stays put at the ends", () => {
  assert.deepEqual(moveSceneId(["a", "b", "c"], "b", "up"), ["b", "a", "c"]);
  assert.deepEqual(moveSceneId(["a", "b", "c"], "b", "down"), ["a", "c", "b"]);
  assert.deepEqual(moveSceneId(["a", "b"], "a", "up"), ["a", "b"]);
  assert.equal(moveSceneId(["a"], "missing", "down"), null);
});

test("Dutch subtitle lines stay attached to a scene and drop when cleared", () => {
  const first = mergeSceneSubtitleLine([], { id: "scene-1", order: 2 }, "  Hallo  ");
  assert.deepEqual(first, [{ sceneId: "scene-1", text: "Hallo", start: 2, end: 3 }]);
  const replaced = mergeSceneSubtitleLine(first, { id: "scene-1", order: 2 }, "Tot ziens");
  assert.equal(replaced.length, 1);
  assert.equal(replaced[0]?.text, "Tot ziens");
  const keptOther = mergeSceneSubtitleLine(
    [...replaced, { sceneId: "scene-2", text: "Blijft", start: 0, end: 1 }],
    { id: "scene-1", order: 2 },
    "",
  );
  assert.deepEqual(keptOther, [{ sceneId: "scene-2", text: "Blijft", start: 0, end: 1 }]);
});

test("film preparation does not reserve HC, call providers, or write character masters", () => {
  const source = readFileSync(join(root, "src/server/studio/studio-film-preparation.ts"), "utf8");
  assert.doesNotMatch(source, /reserveStudioCredits|authorizeStudioAction|requireStudioCredits|openai|elevenlabs|vidu/i);
  const imageMentions = source.match(/referenceImageUrl/g) ?? [];
  const allowedImageReads = source.match(/referenceImageUrl(?:: true| \?\? "")/g) ?? [];
  assert.deepEqual(allowedImageReads, [
    "referenceImageUrl: true",
    "referenceImageUrl: true",
    'referenceImageUrl ?? ""',
  ]);
  assert.equal(imageMentions.length, allowedImageReads.length);
  assert.doesNotMatch(source, /studioCharacter\.(create|update|upsert)/);
  assert.doesNotMatch(source, /generatedPrompt/);
  assert.match(source, /storyboardId: null/);
  assert.match(source, /status: "draft"/);
  assert.match(source, /voiceNarrationScript/);
  assert.match(source, /setPreferredStudioSceneImage/);
  assert.doesNotMatch(source, /animationProject\.create/);
});

test("linking routes stay authenticated and legacy editors remain", () => {
  const storyboardRoute = readFileSync(
    join(root, "src/app/api/studio/projects/[projectId]/storyboard/route.ts"),
    "utf8",
  );
  const sceneRoute = readFileSync(
    join(root, "src/app/api/studio/projects/[projectId]/scenes/[sceneId]/route.ts"),
    "utf8",
  );
  assert.match(storyboardRoute, /requireActiveUser/);
  assert.match(sceneRoute, /requireActiveUser/);
  assert.doesNotMatch(`${storyboardRoute}\n${sceneRoute}`, /reserveStudioCredits|requireStudioCredits/);
  readFileSync(join(root, "src/app/studio/storyboards/[id]/page.tsx"), "utf8");
  readFileSync(join(root, "src/app/studio/storyboards/[id]/edit/page.tsx"), "utf8");
  const classic = readFileSync(join(root, "src/app/studio/storyboards/[id]/classic/page.tsx"), "utf8");
  assert.match(classic, /StudioFilmReturnLink/);
  assert.match(classic, /StudioStoryboardEditor/);
});

test("MADE WITH PASSION is not mutated by the preparation service source", () => {
  const source = readFileSync(join(root, "src/server/studio/studio-film-preparation.ts"), "utf8");
  assert.doesNotMatch(source, /cmvcbmxdp00032jryohiw8a84|cmvdlq3wy0005k007dpq2mp8c|cmvdlrtuo000fk007np7d6ft3|cmvdltib5000pk00762r013fr/);
});
