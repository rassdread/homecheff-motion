import assert from "node:assert/strict";
import test from "node:test";
import { filmDocumentFromCreativeProject } from "@/lib/studio-creative-film-document";
import { reverseStoryClipStarts } from "@/lib/studio-film-reverse-story";

test("reverse story plays the last clip first and keeps durations", () => {
  const next = reverseStoryClipStarts([
    { id: "open", durationMs: 2000 },
    { id: "middle", durationMs: 3000 },
    { id: "click", durationMs: 4000 },
  ]);
  assert.deepEqual(next, [
    { id: "click", startMs: 0, durationMs: 4000 },
    { id: "middle", startMs: 4000, durationMs: 3000 },
    { id: "open", startMs: 7000, durationMs: 2000 },
  ]);
});

test("film editor document keeps the creative project title and scene ids", () => {
  const document = filmDocumentFromCreativeProject({
    title: "MADE WITH PASSION",
    scenes: [
      { id: "scene-click", order: 2, title: "One click", dialogueText: "Het begon met één klik.", durationSeconds: 4 },
      { id: "scene-open", order: 1, title: "Open", dialogueText: "The kitchen is awake.", durationSeconds: 4, characterId: "baker" },
    ],
  });
  assert.equal(document.title, "MADE WITH PASSION");
  assert.deepEqual(
    document.scenes.map((scene) => scene.id),
    ["scene-open", "scene-click"],
  );
  assert.equal(document.scenes[0]?.sourceSceneId, "scene-open");
  assert.equal(document.scenes[1]?.dutchSubtitle, "Het begon met één klik.");
  assert.equal(document.export.width, 720);
  assert.equal(document.export.height, 1280);
});
