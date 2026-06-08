import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildScenePromptForDetail } from "@/server/studio/studio-prompt-builder-service";
import { buildCharacterStructuredIdentityPromptLines } from "@/lib/studio-character-identity-prompt-lines";
import { buildScenePromptFromInput } from "@/lib/studio-prompt-builder";
import {
  comparePreviewAndProductionPrompts,
  productionPromptHasIdentityContext,
} from "@/lib/studio-prompt-parity";
import {
  buildPromptSourceEntitiesFromSceneDetail,
  buildSceneDirectorContextLines,
} from "@/lib/studio-prompt-source-entities";
import { studioSceneDetailToPromptInput } from "@/lib/studio-scene-to-prompt-input";
import {
  studioCharacterListItem,
  studioSceneDetail,
  studioWorldProfileListItem,
} from "@/test/studio-api-fixtures";
import type { StudioSceneDetail } from "@/types/studio-api";
import { PROMPT_BUILDER_VERSION } from "@/types/studio-prompt-builder";

function minimalScene(overrides?: Partial<StudioSceneDetail>): StudioSceneDetail {
  return {
    id: "scene-1",
    storyboardId: "sb-1",
    order: 1,
    title: "Market morning",
    description: "Busy street scene",
    action: "Chef presents ingredients",
    emotion: "warm",
    camera: "medium",
    shotType: "medium_shot",
    cameraMovement: "static",
    sceneEnergy: "calm",
    transitionToNext: "cut",
    musicCueType: "",
    musicEnergyTarget: "",
    musicTransitionType: "",
    musicStartBehavior: "",
    musicEndBehavior: "",
    soundEnvironmentOverride: "",
    soundCharacterOverride: "",
    soundPropOverride: "",
    soundTransitionOverride: "",
    soundAmbientOverride: "",
    voicePriority: "",
    musicPriority: "",
    soundPriority: "",
    audioFocus: "",
    duckingMode: "",
    voiceAssetOverride: "",
    musicAssetOverride: "",
    ambienceAssetOverride: "",
    sfxAssetOverride: "",
    durationSeconds: 5,
    locationId: null,
    location: null,
    characters: [],
    props: [],
    selectedSceneImageId: null,
    sceneImages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("studio-prompt-parity", () => {
  it("parses hc tokens into explicit character identity lines", () => {
    const lines = buildCharacterStructuredIdentityPromptLines(
      "hc:type=mascot, hc:style=cinematic cartoon, hc:shape=rounded, hc:energy=energetic, hc:color=HomeCheff"
    );
    assert.ok(lines.some((l) => l.includes("Character type: mascot")));
    assert.ok(lines.some((l) => l.includes("Visual style: cinematic cartoon")));
    assert.ok(lines.some((l) => l.includes("Color theme: HomeCheff")));
  });

  it("production prompt includes identity and director sections when libraries present", () => {
    const world = studioWorldProfileListItem({
      id: "world-1",
      name: "HomeCheff Kitchen",
      visualStyle: "warm cinematic",
      continuityRules: "[render:strategies]\nstory_montage",
    });
    const character = studioCharacterListItem({
      id: "char-1",
      name: "Chef",
      visualKeywords: "hc:type=chef, hc:style=modern",
      defaultClothing: "white apron",
      appearanceMemory: "friendly chef",
    });
    const scene = minimalScene({ characters: [character] });
    const sourceEntities = buildPromptSourceEntitiesFromSceneDetail(scene, [world]);
    const output = buildScenePromptFromInput(
      studioSceneDetailToPromptInput(scene, "cinematic", undefined, {
        sourceEntities,
        directorContextLines: buildSceneDirectorContextLines(scene, sourceEntities),
      })
    );

    assert.equal(output.metadata.promptVersion, PROMPT_BUILDER_VERSION);
    assert.ok(productionPromptHasIdentityContext(output));
    assert.ok(output.sections.identity.trim().length > 0 || output.sections.directorIdentity.trim().length > 0);
    assert.match(output.prompt, /apron|chef|HomeCheff/i);
  });

  it("preview and production paths produce identical prompts for same input", () => {
    const scene = minimalScene({
      characters: [
        studioCharacterListItem({
          id: "c1",
          name: "Sanne",
          visualKeywords: "hc:type=grower",
        }),
      ],
    });
    const report = comparePreviewAndProductionPrompts({
      scene,
      worlds: [
        studioWorldProfileListItem({ id: "w1", name: "Dutch Garden" }),
      ],
    });
    assert.equal(report.parity, true);
    assert.equal(report.missingInProduction.length, 0);
  });

  it("buildScenePromptForDetail uses unified production path with identity context", () => {
    const scene = studioSceneDetail({
      order: 0,
      characters: [
        studioCharacterListItem({
          id: "c1",
          name: "Marcus",
          defaultClothing: "street chef outfit",
          visualKeywords: "hc:type=chef, hc:style=street",
          appearanceMemory: "jamaican chef",
        }),
      ],
    });
    const output = buildScenePromptForDetail(scene, "cinematic");
    assert.ok(productionPromptHasIdentityContext(output));
    assert.match(output.prompt, /street chef outfit|chef/i);
  });
});
