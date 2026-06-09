import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatSceneSemanticRecipeForMotion,
  buildSceneSemanticRecipe,
  buildScenePromptLineage,
} from "@/lib/build-scene-semantic-recipe";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import {
  auditRenderIdentityLineage,
  auditSceneSemanticRecipe,
} from "@/lib/studio-identity-continuity";
import {
  blocksReplacementAssetSuggestion,
  buildIdentityProfileConsumptionLines,
  resolveDirectorIdentityProfileGuidance,
} from "@/lib/studio-asset-identity-profile";
import { buildStudioRenderAuditMetadata } from "@/lib/studio-project-metadata";
import {
  buildSceneImageGenerationPrompt,
} from "@/lib/studio-scene-image-prompt";
import { buildScenePrompt } from "@/lib/studio-prompt-builder";
import { serializeAssetSemanticRecordToNotes } from "@/lib/studio-asset-semantic-record";
import {
  studioCharacterListItem,
  studioStoryboardDetail,
} from "@/test/studio-api-fixtures";
import type { SceneSemanticRecipe } from "@/types/studio-scene-semantic-recipe";
import type { SceneSnapshot } from "@/types/studio-scene-snapshot";
import type { SceneMemoryBundle } from "@/types/studio-memory-snapshots";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";

const SEMANTIC_RECORD = {
  version: 1 as const,
  brandIdentity: "HomeCheff Globe Mascot",
  assetFamily: "HomeCheff Mascots",
  identityAssetType: "mascot" as const,
  identityProfile: "master_character" as const,
  identityImportance: "critical",
  preserveRules: ["face", "silhouette", "brand identity"],
};

function characterWithIdentity() {
  return studioCharacterListItem({
    id: "globe-1",
    name: "Globe Man",
    isMascot: true,
    referenceNotes: serializeAssetSemanticRecordToNotes("Globe mascot", SEMANTIC_RECORD),
  });
}

function recipeWithIdentity(profile: string): SceneSemanticRecipe {
  return {
    version: 1,
    recipeId: `recipe-${profile}`,
    sceneId: "scene-1",
    characters: [
      {
        assetId: "globe-1",
        kind: "character",
        name: "Globe Man",
        brandIdentity: "HomeCheff Globe Mascot",
        assetFamily: "HomeCheff Mascots",
        identityAssetType: "mascot",
        identityProfile: profile,
        identityImportance: profile === "master_character" ? "critical" : "important",
        preserveRules: SEMANTIC_RECORD.preserveRules,
      },
    ],
    props: [],
    brandIdentity: "HomeCheff Globe Mascot",
    assetFamily: "HomeCheff Mascots",
  };
}

describe("identity profile consumption completion", () => {
  it("director asset refs carry identity fields and block replacement for master_character", () => {
    const character = characterWithIdentity();
    const proposal = buildDirectorProposal({
      idea: "Show our mascot chef presenting a dish",
      storyboard: studioStoryboardDetail({ id: "sb-1", scenes: [] }),
      characters: [character],
      locations: [],
      props: [],
      worlds: [],
      t: (key) => String(key),
    });
    const scene = proposal.scenes[0];
    assert.ok(scene);
    const ref = scene.characterRefs.find((r) => r.existingId === "globe-1");
    assert.ok(ref);
    assert.equal(ref.identityAssetType, "mascot");
    assert.equal(ref.identityProfile, "master_character");
    assert.equal(ref.identityImportance, "critical");
    assert.match(ref.semanticLabel ?? "", /Profile: master character/i);
    assert.equal(scene.proposedCharacters.length, 0);
    assert.ok(
      proposal.identityConsumption.directorContextLines.some((line) =>
        line.includes(resolveDirectorIdentityProfileGuidance("master_character"))
      )
    );
    assert.equal(blocksReplacementAssetSuggestion("master_character"), true);
  });

  it("scene generation prompt includes explicit identity profile fields", () => {
    const character = characterWithIdentity();
    const scene: SceneSnapshot = {
      sceneId: "s1",
      order: 0,
      title: "Chef presents",
      description: "Launch",
      location: null,
      characters: [
        {
          id: character.id,
          name: character.name,
          role: "mascot",
          description: "",
          personality: "",
          referenceImageUrl: "https://example.com/globe.png",
        },
      ],
      props: [],
      action: "presenting",
      emotion: "proud",
      camera: "medium_shot",
      transitionToNext: "",
      durationSeconds: 8,
    };
    const memoryBundle: SceneMemoryBundle = {
      characters: [
        {
          id: character.id,
          name: character.name,
          role: "mascot",
          description: "",
          personality: "",
          personalityMemory: "",
          appearanceMemory: "",
          defaultClothing: "",
          defaultAccessories: "",
          visualKeywords: "",
          referenceImageUrl: "https://example.com/globe.png",
          referenceNotes: character.referenceNotes ?? "",
          primaryReferenceImageId: null,
          continuityNotes: "",
          continuityStrength: "strong",
          identityStrength: "strong",
          worldProfileId: null,
          worldProfileName: null,
          canonicalIdentity: null,
        },
      ],
      location: null,
      props: [],
    };
    const prompt = buildSceneImageGenerationPrompt(scene, buildScenePrompt(scene, "commercial"), {
      memoryBundle,
    });
    assert.match(prompt, /Identity profile: master_character/);
    assert.match(prompt, /Identity importance: critical/);
    assert.match(prompt, /Asset type: mascot/);
    assert.match(prompt, /Maximum character continuity/);
  });

  it("scene semantic recipe refs include identityAssetType", () => {
    const row = {
      id: "scene-1",
      title: "Scene",
      description: "Desc",
      action: "Act",
      emotion: "warm",
      sceneEnergy: "medium",
      voicePriority: "",
      audioFocus: "",
      characters: [{ character: characterWithIdentity() }],
      props: [],
      location: null,
    };
    const recipe = buildSceneSemanticRecipe({
      row: row as never,
      generatedPrompt: "Scene prompt",
      promptLineage: buildScenePromptLineage({
        sceneId: "scene-1",
        selectedSceneImageId: null,
        generatedPrompt: "Scene prompt",
        promptVersion: 1,
        summarySource: "rebuilt",
      }),
    });
    assert.equal(recipe.characters[0]?.identityAssetType, "mascot");
    assert.equal(recipe.characters[0]?.identityProfile, "master_character");
    assert.equal(recipe.characters[0]?.identityImportance, "critical");
  });

  it("motion instructions differ by profile and include asset type", () => {
    const master = recipeWithIdentity("master_character");
    const brandLock = recipeWithIdentity("brand_lock");
    brandLock.characters[0]!.identityAssetType = "packaging";
    brandLock.characters[0]!.identityProfile = "brand_lock";
    brandLock.characters[0]!.identityImportance = "critical";

    const masterMotion = formatSceneSemanticRecipeForMotion(master);
    const brandMotion = formatSceneSemanticRecipeForMotion(brandLock);
    assert.match(masterMotion, /Asset types: Globe Man=mascot/);
    assert.match(brandMotion, /Asset types: Globe Man=packaging/);
    assert.notEqual(masterMotion, brandMotion);
    assert.match(masterMotion, /Maximum character continuity/);
    assert.match(brandMotion, /Brand protection mode/);
  });

  it("render audit collects identity asset types", () => {
    const audit = buildStudioRenderAuditMetadata({
      studioSourceStoryboardId: "sb-1",
      studioHandoffVersion: 26,
      studioHandoffJson: {
        version: 26,
        scenes: [
          {
            order: 0,
            sceneId: "scene-1",
            title: "Scene",
            semanticRecipe: recipeWithIdentity("master_character"),
          },
        ],
      },
      studioIntelligenceJson: null,
    });
    assert.deepEqual(audit.identityProfiles, ["master_character"]);
    assert.deepEqual(audit.identityImportanceLevels, ["critical"]);
    assert.deepEqual(audit.identityAssetTypes, ["mascot"]);
    const gaps = auditRenderIdentityLineage(audit);
    assert.equal(gaps.length, 0);
  });

  it("continuity audit warns when recipe identity fields are incomplete", () => {
    const incomplete: SceneSemanticRecipe = {
      version: 1,
      recipeId: "r1",
      sceneId: "s1",
      characters: [{ assetId: "c1", kind: "character", name: "Chef" }],
      props: [],
    };
    const gaps = auditSceneSemanticRecipe(incomplete);
    assert.ok(gaps.some((g) => g.field === "identityProfile"));
    assert.ok(gaps.some((g) => g.field === "identityImportance"));
    assert.ok(gaps.some((g) => g.field === "identityAssetType"));
  });

  it("consumption lines are profile-specific", () => {
    const master = buildIdentityProfileConsumptionLines({
      identityAssetType: "mascot",
      identityProfile: "master_character",
      identityImportance: "critical",
    });
    const relaxed = buildIdentityProfileConsumptionLines({
      identityAssetType: "world",
      identityProfile: "relaxed",
      identityImportance: "flexible",
    });
    assert.notDeepEqual(master, relaxed);
    assert.ok(master.some((line) => /Maximum character continuity/.test(line)));
    assert.ok(relaxed.some((line) => /Flexible interpretation/.test(line)));
  });
});
