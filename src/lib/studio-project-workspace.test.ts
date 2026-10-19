import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { assembleProjectWorkspace } from "@/lib/studio-project-workspace";

const PASSION = "cmvcbmxdp00032jryohiw8a84";
const BAKER = "cmvdlq3wy0005k007dpq2mp8c";
const POTTER = "cmvdlrtuo000fk007np7d6ft3";
const GARDENER = "cmvdltib5000pk00762r013fr";

test("MADE WITH PASSION keeps masters, empty scenes, and separate audio layers", () => {
  const view = assembleProjectWorkspace({
    project: {
      id: PASSION,
      title: "MADE WITH PASSION",
      description: "",
      status: "active",
      createdAt: "2026-10-18T00:00:00.000Z",
      updatedAt: "2026-10-19T00:35:42.747Z",
      storyboardLinked: false,
      animationLinked: false,
    },
    characters: [
      {
        id: BAKER,
        name: "Baker",
        description: "Baker",
        referenceImageUrl: "https://cdn.example/baker.png",
        voiceProfile: "",
        voiceLanguage: "en",
        voiceGender: "female",
        voiceDescription: "",
      },
      {
        id: POTTER,
        name: "Potter",
        description: "Potter",
        referenceImageUrl: "https://cdn.example/potter.png",
        voiceProfile: "",
        voiceLanguage: "en",
        voiceGender: "female",
        voiceDescription: "",
      },
      {
        id: GARDENER,
        name: "Gardener",
        description: "Gardener",
        referenceImageUrl: "https://cdn.example/gardener.png",
        voiceProfile: "",
        voiceLanguage: "en",
        voiceGender: "male",
        voiceDescription: "",
      },
    ],
    assets: [
      { id: "draft-baker", family: "character", title: "Baker", status: "draft", previewUrl: "https://cdn.example/baker.png" },
      { id: "archived-still", family: "image", title: "Broken", status: "archived", previewUrl: "https://cdn.example/broken.png" },
    ],
    scenes: [],
    music: [{ id: "bed", name: "Warm bed", audioUrl: "https://cdn.example/music.mp3" }],
    soundEffects: [{ id: "hit", name: "Door", audioUrl: "https://cdn.example/hit.mp3" }],
    voiceover: [],
    exports: [],
    jobs: [],
    links: [],
    mediaProjectIds: [],
    audioLibraryAvailable: true,
    hcAvailable: 40,
  });

  assert.deepEqual(view.characters.map((item) => item.id), [BAKER, POTTER, GARDENER]);
  assert.deepEqual(
    view.characters.map((item) => item.referenceImageUrl),
    ["https://cdn.example/baker.png", "https://cdn.example/potter.png", "https://cdn.example/gardener.png"],
  );
  assert.equal(view.characters.every((item) => item.voiceAssigned === false), true);
  assert.equal(view.scenes.length, 0);
  assert.equal(view.media.length, 0);
  assert.equal(view.music[0]?.kind, "music");
  assert.equal(view.soundEffects[0]?.kind, "sfx");
  assert.equal(view.voiceover.length, 0);
  assert.equal(view.exports.length, 0);
  assert.equal(view.director.executable, false);
  assert.equal(view.timeline, null);
  assert.equal(view.hcAvailable, 40);
});

test("completed narration stays out of the music list", () => {
  const view = assembleProjectWorkspace({
    project: {
      id: "p1",
      title: "Spot",
      description: "",
      status: "active",
      createdAt: "2026-10-19T00:00:00.000Z",
      updatedAt: "2026-10-19T00:00:00.000Z",
      storyboardLinked: true,
      animationLinked: false,
    },
    characters: [],
    assets: [{ id: "img", family: "image", title: "Still", status: "active", previewUrl: "https://cdn.example/still.png" }],
    scenes: [
      { id: "s2", order: 2, title: "B", description: "", imageUrl: null, imageStatus: null },
      { id: "s1", order: 1, title: "A", description: "Open", imageUrl: null, imageStatus: "completed" },
    ],
    music: [],
    soundEffects: [],
    voiceover: [
      { id: "vo", language: "nl", status: "completed", audioUrl: "https://cdn.example/vo.mp3" },
      { id: "bad", language: "en", status: "failed", audioUrl: "https://cdn.example/bad.mp3" },
    ],
    exports: [],
    jobs: [],
    links: [],
    mediaProjectIds: ["sb"],
    audioLibraryAvailable: false,
    hcAvailable: null,
  });

  assert.deepEqual(view.scenes.map((scene) => scene.id), ["s1", "s2"]);
  assert.equal(view.media.length, 1);
  assert.equal(view.voiceover.length, 1);
  assert.equal(view.voiceover[0]?.kind, "voiceover");
  assert.equal(view.music.length, 0);
  assert.equal(view.hcAvailable, null);
});

test("workspace loader does not reserve credits or attach records", () => {
  const source = readFileSync(join(process.cwd(), "src/server/studio/load-studio-project-workspace.ts"), "utf8");
  assert.equal(/reserveStudioCredits|updateCreativeProject|touchOpened|authorizeStudioAction/.test(source), false);
});
