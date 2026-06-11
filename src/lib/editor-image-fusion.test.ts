import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EDITOR_FUSION_CATEGORY_ORDER,
  fusionIntentDefinition,
  fusionIntentsForCategory,
  normalizeFusionIntent,
  requiresMultiUpload,
} from "@/lib/editor-image-fusion-catalog";
import {
  activePreservationRules,
  createInitialFusionPlan,
  ensureFusionPlan,
  patchFusionPlan,
} from "@/lib/editor-fusion-plan";
import { buildEditorFusionPrompt } from "@/lib/editor-fusion-prompt-builder";
import {
  buildFusionPlanFromDirectorRequest,
  detectFusionIntentFromPrompt,
  parseFusionDirectorRequest,
} from "@/lib/editor-fusion-request-parser";
import { applyWearOutfitComposition } from "@/lib/editor-wear-outfit-composition";
import { applyPostUploadMode } from "@/lib/editor-start-flow";
import {
  combineRequiresMultiUpload,
  EDITOR_COMBINE_INTENT_OPTIONS,
  fusionIntentsInCategory,
} from "@/lib/editor-workflow-product";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

function mockDocument(overrides: Partial<EditorCanvasDocument> = {}): EditorCanvasDocument {
  const now = new Date().toISOString();
  return {
    sessionId: "sess_fusion",
    name: "Fusion test",
    sourceKind: "upload",
    sourceAssetId: null,
    backgroundUrl: "https://example.com/person.png",
    workflowStep: "visual_editor",
    objects: [],
    placements: [],
    status: "editing",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("Editor Image Fusion catalog", () => {
  it("orders five fusion categories", () => {
    assert.deepEqual(EDITOR_FUSION_CATEGORY_ORDER, [
      "people_characters",
      "animals",
      "products_brands",
      "marketing_content",
      "future_identity",
    ]);
  });

  it("lists non-legacy intents across categories", () => {
    const total = EDITOR_FUSION_CATEGORY_ORDER.reduce(
      (sum, category) => sum + fusionIntentsForCategory(category).length,
      0
    );
    assert.equal(total, EDITOR_COMBINE_INTENT_OPTIONS.length);
    assert.ok(total >= 20);
    assert.ok(fusionIntentsInCategory("future_identity").every((d) => d.isSimulation));
  });

  it("normalizes legacy person_outfit to outfit_from_reference", () => {
    assert.equal(normalizeFusionIntent("person_outfit"), "outfit_from_reference");
    assert.equal(fusionIntentDefinition("person_outfit").id, "outfit_from_reference");
  });

  it("requires multi upload for dual-reference intents", () => {
    assert.equal(requiresMultiUpload("outfit_from_reference"), true);
    assert.equal(combineRequiresMultiUpload("outfit_from_reference"), true);
    assert.equal(combineRequiresMultiUpload("custom_composition"), false);
  });
});

describe("Editor Fusion plan", () => {
  it("creates fusion plan with preservation defaults", () => {
    const doc = applyPostUploadMode(mockDocument(), "combine", {
      combineIntent: "character_fusion",
    });
    const withPlan = ensureFusionPlan(doc);
    const plan = withPlan.instructionStudioState?.fusionPlan;
    assert.ok(plan);
    assert.equal(plan?.intent, "character_fusion");
    assert.equal(plan?.category, "people_characters");
    assert.ok(plan?.inheritedTraits.length > 0);
    assert.ok(activePreservationRules(plan!).includes("identity"));
  });

  it("adds simulation disclaimer for future identity intents", () => {
    const plan = createInitialFusionPlan(mockDocument(), "how_will_i_look");
    assert.ok(plan.simulationDisclaimer?.includes("simulation"));
    assert.equal(plan.category, "future_identity");
  });

  it("patches fusion strength and user instructions", () => {
    const base = ensureFusionPlan(
      applyPostUploadMode(mockDocument(), "combine", { combineIntent: "animal_fusion" })
    );
    const next = patchFusionPlan(base, {
      fusionStrength: 75,
      userInstructions: "Combine wolf and eagle",
    });
    const plan = next.instructionStudioState?.fusionPlan;
    assert.equal(plan?.fusionStrength, 75);
    assert.equal(plan?.userInstructions, "Combine wolf and eagle");
  });

  it("seeds fusion plan from wear-outfit composition", () => {
    const next = applyWearOutfitComposition(
      mockDocument(),
      "https://example.com/outfit.png",
      "Outfit"
    );
    const fusionPlan = next.instructionStudioState?.fusionPlan;
    assert.ok(fusionPlan);
    assert.equal(fusionPlan?.intent, "outfit_from_reference");
    assert.ok((fusionPlan?.items.length ?? 0) >= 4);
  });
});

describe("Editor Fusion prompt builder", () => {
  it("separates what may change and what must stay", () => {
    const plan = createInitialFusionPlan(mockDocument(), "outfit_from_reference");
    const prompt = buildEditorFusionPrompt({ plan });
    assert.ok(prompt.includes("WHAT MAY CHANGE"));
    assert.ok(prompt.includes("WHAT MUST STAY"));
    assert.ok(prompt.includes("Preserve face"));
    assert.ok(prompt.includes("IMAGE FUSION"));
  });

  it("includes simulation disclaimer for future intents", () => {
    const plan = createInitialFusionPlan(mockDocument(), "future_child");
    const prompt = buildEditorFusionPrompt({ plan });
    assert.ok(prompt.toLowerCase().includes("simulation"));
  });
});

describe("Editor Fusion AI Director parser", () => {
  it("detects outfit intent from natural language", () => {
    assert.equal(detectFusionIntentFromPrompt("Make me wear this outfit"), "outfit_from_reference");
  });

  it("detects mascot and animal fusion prompts", () => {
    assert.equal(
      detectFusionIntentFromPrompt("Turn Globe Man into a realistic human"),
      "mascot_into_human"
    );
    assert.equal(detectFusionIntentFromPrompt("Give my dog my eyes"), "animal_human_fusion");
    assert.equal(detectFusionIntentFromPrompt("Combine this wolf and eagle"), "animal_fusion");
  });

  it("detects future and identity simulation prompts", () => {
    assert.equal(detectFusionIntentFromPrompt("How will I look at 60?"), "how_will_i_look");
    assert.equal(
      detectFusionIntentFromPrompt("What would my daughter look like?"),
      "future_child"
    );
    assert.equal(detectFusionIntentFromPrompt("Turn me into an astronaut"), "future_professions");
  });

  it("builds fusion plan from director request", () => {
    const parsed = parseFusionDirectorRequest("Create a premium version of this product");
    assert.equal(parsed.intent, "product_family");
    const plan = buildFusionPlanFromDirectorRequest(
      applyPostUploadMode(mockDocument(), "combine"),
      parsed
    );
    assert.equal(plan.intent, "product_family");
    assert.ok(plan.userInstructions.includes("premium"));
  });
});
