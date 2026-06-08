import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildScenePromptLineage,
  buildSceneSemanticRecipe,
  formatSceneSemanticRecipeForMotion,
} from "@/lib/build-scene-semantic-recipe";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";

function minimalSceneRow() {
  return {
    id: "scene-1",
    title: "Chef presents dish",
    description: "Community kitchen moment",
    action: "Presents proudly",
    emotion: "warm_proud",
    sceneEnergy: "medium",
    voicePriority: "character",
    audioFocus: "narration",
    characters: [
      {
        character: {
          id: "char-1",
          name: "Chef",
          referenceNotes: "",
          appearanceMemory: "Cartoon mascot",
          visualKeywords: "hc:characterType=mascot",
          continuityNotes: "",
          worldProfile: {
            id: "world-1",
            name: "HomeCheff World",
            visualStyle: "Friendly",
            tone: "Warm",
            description: "Community",
            continuityRules: "Keep brand green",
          },
        },
      },
    ],
    props: [
      {
        prop: {
          id: "prop-1",
          name: "Serving tray",
          continuityNotes: "",
          appearanceMemory: "Wooden tray",
          brandingRules: "HomeCheff",
        },
      },
    ],
    location: {
      id: "loc-1",
      name: "Community Kitchen",
      continuityNotes: "",
      visualIdentity: "Bright kitchen",
      worldMemory: "Warm community space",
      worldProfile: {
        id: "world-1",
        name: "HomeCheff World",
        visualStyle: "Friendly",
        tone: "Warm",
        description: "Community",
        continuityRules: "Keep brand green",
      },
    },
  } as import("@/server/studio/studio-storyboard-service").StudioStoryboardSceneRow;
}

describe("build-scene-semantic-recipe", () => {
  it("builds compact recipe with cross-asset relations", () => {
    const row = minimalSceneRow();
    const lineage = buildScenePromptLineage({
      sceneId: row.id,
      selectedSceneImageId: "img-1",
      generatedPrompt: "Chef in kitchen with tray.",
      promptVersion: 2,
      summarySource: "selected_scene_image",
    });
    const recipe = buildSceneSemanticRecipe({
      row,
      generatedPrompt: "Chef in kitchen with tray.",
      promptLineage: lineage,
      visualStyleProfile: "commercial",
    });

    assert.equal(recipe.version, 1);
    assert.equal(recipe.characters[0]?.name, "Chef");
    assert.equal(recipe.location?.name, "Community Kitchen");
    assert.equal(recipe.props[0]?.name, "Serving tray");
    assert.ok(recipe.crossAssetRelations?.some((r) => r.type === "character_prop"));
    assert.ok(recipe.crossAssetRelations?.some((r) => r.type === "character_location"));
    assert.equal(recipe.promptLineage?.handoffVersion, MOTION_HANDOFF_PAYLOAD_VERSION);
  });

  it("formatSceneSemanticRecipeForMotion stays compact", () => {
    const row = minimalSceneRow();
    const lineage = buildScenePromptLineage({
      sceneId: row.id,
      selectedSceneImageId: null,
      generatedPrompt: "Scene prompt",
      promptVersion: 1,
      summarySource: "rebuilt",
    });
    const recipe = buildSceneSemanticRecipe({
      row,
      generatedPrompt: "Scene prompt",
      promptLineage: lineage,
    });
    const text = formatSceneSemanticRecipeForMotion(recipe);
    assert.ok(text.length < 600);
    assert.match(text, /Chef/);
    assert.match(text, /Community Kitchen/);
  });
});
