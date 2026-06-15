import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  enableAdvancedFusionCompose,
  isAdvancedFusionComposeParam,
  shouldShowLegacyComposeWorkspace,
} from "@/lib/editor-fusion-advanced";
import {
  allFusionArchetypes,
  buildCategoryNegativePrompt,
  buildCategoryOutputPromptLines,
  fusionArchetypeForIntent,
  fusionCategoryOutputFields,
  fusionDynamicQuestions,
  fusionMinimumCharacterCount,
  fusionRequiredInputRoles,
  isFusionIntentOfferedInWizard,
  resolveSimpleFusionWizardHref,
  seedCategoryOutputSettings,
} from "@/lib/editor-fusion-archetypes";
import { buildEditorFusionPrompt } from "@/lib/editor-fusion-prompt-builder";
import { createInitialFusionPlan } from "@/lib/editor-fusion-plan";
import { applyPostUploadMode, workspaceModeForPostUpload } from "@/lib/editor-start-flow";
import { fusionIntentsForCategory } from "@/lib/editor-image-fusion-catalog";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

function mockDocument(overrides: Partial<EditorCanvasDocument> = {}): EditorCanvasDocument {
  const now = new Date().toISOString();
  return {
    sessionId: "sess_fusion_audit",
    name: "Fusion audit",
    backgroundUrl: "https://example.com/base.png",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("fusion wizard audit", () => {
  it("1. all fusion archetypes exist", () => {
    assert.equal(allFusionArchetypes().length, 26);
    assert.ok(allFusionArchetypes().every((archetype) => archetype.intent));
  });

  it("2. each archetype has required inputs", () => {
    for (const archetype of allFusionArchetypes()) {
      assert.ok(archetype.requiredInputRoles.length > 0, archetype.id);
      const roles = fusionRequiredInputRoles(archetype.intent);
      assert.deepEqual(roles, archetype.requiredInputRoles);
    }
  });

  it("3. each archetype has own output settings", () => {
    for (const archetype of allFusionArchetypes()) {
      assert.ok(archetype.outputFields.length > 0, archetype.id);
      const fields = fusionCategoryOutputFields(archetype.intent);
      assert.equal(fields.length, archetype.outputFields.length);
      const seeded = seedCategoryOutputSettings(archetype.intent);
      assert.equal(seeded.fusionArchetypeId, archetype.id);
    }
  });

  it("4. person + background opens wizard route", () => {
    assert.equal(resolveSimpleFusionWizardHref(), "/editor/fuse");
    const archetype = fusionArchetypeForIntent("person_background");
    assert.equal(archetype?.id, "person_background");
    assert.equal(isFusionIntentOfferedInWizard("person_background"), true);
    assert.ok(fusionIntentsForCategory("marketing_content").some((item) => item.id === "person_background"));
  });

  it("5. logo placement preserveLogoExact defaults on", () => {
    const settings = seedCategoryOutputSettings("product_branding");
    assert.equal(settings.preserveLogoExact, true);
    const prompt = buildCategoryNegativePrompt("product_branding", settings);
    assert.match(prompt, /logo/i);
  });

  it("6. character + outfit protects face and pose", () => {
    const settings = seedCategoryOutputSettings("outfit_from_reference");
    assert.equal(settings.protectFace, true);
    assert.equal(settings.protectPose, true);
    const negative = buildCategoryNegativePrompt("outfit_from_reference", settings);
    assert.match(negative, /face/i);
    assert.match(negative, /pose/i);
  });

  it("7. mascot scene preserves mascot style and brand colors", () => {
    const settings = seedCategoryOutputSettings("human_into_mascot");
    assert.equal(settings.preserveMascotStyle, true);
    assert.equal(settings.preserveBrandColors, true);
    const negative = buildCategoryNegativePrompt("human_into_mascot", settings);
    assert.match(negative, /mascot/i);
    assert.match(negative, /brand colors/i);
  });

  it("8. multi character scene requires 2+ characters", () => {
    assert.equal(fusionMinimumCharacterCount("character_fusion"), 2);
    assert.deepEqual(fusionRequiredInputRoles("character_fusion"), ["character"]);
  });

  it("9. simple fusion combine mode uses instruction studio workspace", () => {
    const doc = applyPostUploadMode(mockDocument(), "combine", {
      combineIntent: "person_background",
    });
    assert.equal(doc.workspaceMode, "instruction_studio");
    assert.equal(doc.editorFlowMode, "combine");
    assert.equal(doc.instructionStudioState?.workflow?.intent, "combine");
    assert.ok(doc.instructionStudioState?.fusionPlan);
  });

  it("10. wizard-offered intents exclude legacy custom composition", () => {
    assert.equal(isFusionIntentOfferedInWizard("custom_composition"), false);
    assert.equal(isFusionIntentOfferedInWizard("multiple_references"), false);
    assert.equal(isFusionIntentOfferedInWizard("outfit_from_reference"), true);
    for (const archetype of allFusionArchetypes()) {
      if (archetype.id === "multi_reference" || archetype.id === "custom_composition") {
        continue;
      }
      assert.equal(isFusionIntentOfferedInWizard(archetype.intent), true, archetype.id);
    }
  });

  it("11. advanced workspace only via advanced flag", () => {
    const combineDoc = applyPostUploadMode(mockDocument(), "combine");
    assert.equal(shouldShowLegacyComposeWorkspace(combineDoc, false), false);
    assert.equal(shouldShowLegacyComposeWorkspace(combineDoc, true), true);
    const advancedDoc = enableAdvancedFusionCompose(combineDoc);
    assert.equal(advancedDoc.workspaceMode, "compose");
    assert.equal(shouldShowLegacyComposeWorkspace(advancedDoc), true);
    assert.equal(isAdvancedFusionComposeParam({ get: () => "1" }), true);
  });

  it("12. category-specific dynamic questions differ per archetype", () => {
    const personQuestions = fusionDynamicQuestions("person_background");
    const logoQuestions = fusionDynamicQuestions("product_branding");
    assert.ok(personQuestions.some((q) => q.outputKey === "preserveIdentity"));
    assert.ok(logoQuestions.some((q) => q.outputKey === "preserveLogoExact"));
    assert.equal(
      personQuestions.some((q) => q.outputKey === "preserveLogoExact"),
      false
    );
  });

  it("prompt builder includes category output and negative prompt", () => {
    const doc = mockDocument();
    const plan = createInitialFusionPlan(doc, "product_branding");
    const prompt = buildEditorFusionPrompt({ plan });
    assert.match(prompt, /CATEGORY OUTPUT SETTINGS/);
    assert.match(prompt, /NEGATIVE PROMPT/);
    assert.match(prompt, /preserveLogoExact/);
    const outputLines = buildCategoryOutputPromptLines("product_branding", plan.generationSettings);
    assert.ok(outputLines.some((line) => line.includes("product_logo_placement")));
  });

  it("combine post-upload maps to instruction_studio not compose", () => {
    assert.equal(workspaceModeForPostUpload("combine"), "instruction_studio");
  });
});
