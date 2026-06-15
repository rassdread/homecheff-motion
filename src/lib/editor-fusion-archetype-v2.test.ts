import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EDITOR_FUSION_INTENTS } from "@/types/editor-instruction-studio";
import {
  allFusionArchetypes,
  fusionArchetypeForIntent,
  fusionCategoryOutputFields,
  fusionDynamicQuestions,
  seedCategoryOutputSettings,
} from "@/lib/editor-fusion-archetypes";
import {
  buildFusionOutputSettings,
  buildFusionSaveMetadata,
  resolveFusionDynamicQuestions,
  runFusionArchetypeEngine,
  validateFusionOutput,
} from "@/lib/editor-fusion-archetype-v2";
import { buildEditorFusionPrompt } from "@/lib/editor-fusion-prompt-builder";
import { createInitialFusionPlan } from "@/lib/editor-fusion-plan";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";

function mockSlot(role: string, roleId: string) {
  const doc = createEditorDocumentFromUpload({
    name: `${role} ref`,
    backgroundUrl: `https://example.com/${roleId}.png`,
    storageKey: `${roleId}.png`,
  });
  return {
    roleId,
    role,
    instances: [
      {
        instanceId: `inst_${roleId}`,
        document: doc,
        analysis: { status: "done" as const, faceDetected: role === "person", clothingDetected: role === "outfit" },
        metadata: { role },
      },
    ],
  };
}

describe("fusion archetype v2", () => {
  it("all 27 fusion intents resolve to an archetype", () => {
    for (const intent of EDITOR_FUSION_INTENTS) {
      const archetype = fusionArchetypeForIntent(intent);
      assert.ok(archetype.id, intent);
      assert.ok(archetype.outputFields.length > 0, intent);
      assert.ok(fusionDynamicQuestions(intent).length > 0, intent);
    }
    assert.equal(allFusionArchetypes().length, 26);
  });

  it("outfit fusion protects face pose and background by default", () => {
    const settings = seedCategoryOutputSettings("outfit_from_reference");
    assert.equal(settings.protectFace, true);
    assert.equal(settings.protectPose, true);
    assert.equal(settings.protectBackground, true);
    assert.equal(settings.clothingOnly, true);
    const validation = validateFusionOutput("outfit_from_reference", settings);
    assert.equal(validation.valid, true);
  });

  it("future child asks age stage and validates both parents", () => {
    const questions = resolveFusionDynamicQuestions("future_child", {
      intent: "future_child",
      slots: [mockSlot("person", "parent_a")],
    });
    assert.ok(questions.some((q) => q.id === "childAge" || q.id === "add_second_parent"));
    const validation = validateFusionOutput(
      "future_child",
      seedCategoryOutputSettings("future_child"),
      { intent: "future_child", slots: [mockSlot("person", "parent_a")] }
    );
    assert.equal(validation.valid, false);
  });

  it("life timeline seeds age options", () => {
    const settings = seedCategoryOutputSettings("life_timeline");
    assert.deepEqual(settings.selectedAges, [20, 30, 40, 50, 60, 70, 80]);
    const questions = fusionDynamicQuestions("life_timeline");
    assert.ok(questions.some((q) => q.outputKey === "selectedAges"));
  });

  it("animal fusion has blend settings", () => {
    const fields = fusionCategoryOutputFields("animal_fusion");
    assert.ok(fields.some((f) => f.key === "blendStyle"));
    assert.equal(fusionArchetypeForIntent("animal_fusion").minCharacterCount, 2);
  });

  it("product branding preserves logo by default", () => {
    const settings = seedCategoryOutputSettings("product_branding");
    assert.equal(settings.preserveLogoExact, true);
    const validation = validateFusionOutput("product_branding", settings);
    assert.equal(validation.valid, true);
  });

  it("campaign variant has distinct output settings", () => {
    const social = seedCategoryOutputSettings("social_media_visual");
    const campaign = seedCategoryOutputSettings("campaign_variant");
    assert.notEqual(social.platform, campaign.variantGoal);
    assert.ok(campaign.preserveLogoExact);
  });

  it("buildFusionOutputSettings applies question answers", () => {
    const settings = buildFusionOutputSettings("outfit_from_reference", {
      face: false,
    });
    assert.equal(settings.protectFace, false);
  });

  it("save metadata includes fusion intent and archetype", () => {
    const slots = [mockSlot("person", "parent_a"), mockSlot("person", "parent_b")];
    const engine = runFusionArchetypeEngine({ intent: "future_child", slots });
    assert.equal(engine.saveMetadata.fusionIntent, "future_child");
    assert.equal(engine.saveMetadata.fusionArchetype, "future_child");
    assert.equal(engine.saveMetadata.sourceAssets.length, 2);
  });

  it("prompt builder uses archetype output lines", () => {
    const doc = createEditorDocumentFromUpload({
      name: "base",
      backgroundUrl: "https://example.com/base.png",
      storageKey: "base.png",
    });
    const plan = createInitialFusionPlan(doc, "campaign_variant");
    const prompt = buildEditorFusionPrompt({ plan });
    assert.match(prompt, /CATEGORY OUTPUT SETTINGS/);
    assert.match(prompt, /campaign_variant/);
  });

  it("dynamic questions UI panel is referenced in reference flow", () => {
    const content = require("node:fs").readFileSync(
      require("node:path").join(process.cwd(), "src/components/editor/editor-reference-role-flow.tsx"),
      "utf8"
    ) as string;
    assert.match(content, /EditorFusionDynamicQuestionsPanel/);
    assert.match(content, /dynamic_questions/);
  });
});
