import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyPostUploadMode,
  editorV3WorkflowChooserModes,
  startScreenPrimaryOptions,
  workspaceModeForPostUpload,
} from "@/lib/editor-start-flow";
import {
  EDITOR_COMBINE_INTENT_OPTIONS,
  EDITOR_WORKFLOW_PRODUCTS,
  combineIntentOption,
  workflowChooserModes,
} from "@/lib/editor-workflow-product";
import {
  WEAR_OUTFIT_PRESERVE_RULES,
  applyWearOutfitComposition,
  buildWearOutfitPlanItems,
  detectClothingLabelsFromReference,
  isClothingObjectLabel,
} from "@/lib/editor-wear-outfit-composition";
import {
  EDITOR_UPSCALE_MODES,
  computeMaxSafePrintSize,
  evaluatePrintReadiness,
  exportTargetsForCategory,
  upscaleMultiplier,
} from "@/lib/editor-export-workflow";
import { printPresetSpec } from "@/lib/editor-instruction-print-export";
import { analyzeCompositionReference } from "@/lib/editor-composition-plan";
import { listChangePlanEntries } from "@/lib/editor-instruction-change-plan";
import { listInstructionVariants } from "@/lib/editor-instruction-version";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

function mockDocument(overrides: Partial<EditorCanvasDocument> = {}): EditorCanvasDocument {
  const now = new Date().toISOString();
  return {
    sessionId: "sess_v3",
    name: "V3 flow",
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

describe("Editor V3 workflow chooser", () => {
  it("exposes four workflow products before upload", () => {
    assert.equal(EDITOR_WORKFLOW_PRODUCTS.length, 4);
    assert.deepEqual(workflowChooserModes(), ["edit", "combine", "motion_prepare", "export"]);
    assert.deepEqual(editorV3WorkflowChooserModes(), workflowChooserModes());
  });

  it("start screen primary options lead with workflow chooser", () => {
    assert.deepEqual(startScreenPrimaryOptions(), ["workflow", "upload", "library"]);
  });

  it("maps each workflow to the correct workspace mode", () => {
    for (const product of EDITOR_WORKFLOW_PRODUCTS) {
      assert.equal(
        workspaceModeForPostUpload(product.mode),
        product.mode === "combine" ? "compose"
        : product.mode === "export" ? "export"
        : "instruction_studio"
      );
    }
  });
});

describe("Editor V3 combine intents", () => {
  it("lists six combine composition intents", () => {
    assert.equal(EDITOR_COMBINE_INTENT_OPTIONS.length, 6);
    assert.equal(combineIntentOption("person_outfit").requiresDualUpload, true);
    assert.equal(combineIntentOption("custom_composition").requiresDualUpload, false);
  });

  it("stores combine intent on document when applied", () => {
    const doc = applyPostUploadMode(mockDocument(), "combine", {
      combineIntent: "person_outfit",
    });
    assert.equal(doc.instructionStudioState?.combineIntent, "person_outfit");
    assert.equal(doc.workspaceMode, "compose");
  });
});

describe("Editor V3 wear outfit from reference", () => {
  it("detects clothing labels from outfit reference analysis", () => {
    const ref = analyzeCompositionReference({
      name: "Outfit",
      url: "https://example.com/outfit.png",
      type: "style",
    });
    const withLabels = {
      ...ref,
      editableObjectLabels: ["Jacket", "Face", "Shirt", "Pants"],
    };
    const labels = detectClothingLabelsFromReference(withLabels);
    assert.ok(labels.includes("Jacket"));
    assert.ok(labels.includes("Shirt"));
    assert.equal(labels.includes("Face"), false);
    assert.equal(isClothingObjectLabel("Winter Jacket"), true);
  });

  it("builds clothing-only composition plan with preserve rules", () => {
    const outfitRef = analyzeCompositionReference({
      name: "Outfit",
      url: "https://example.com/outfit.png",
      type: "style",
    });
    const items = buildWearOutfitPlanItems({ outfitReference: outfitRef });
    assert.ok(items.length >= 4);
    assert.ok(items.every((item) => item.instruction?.includes("clothing only")));
    assert.deepEqual([...WEAR_OUTFIT_PRESERVE_RULES].slice(0, 3), ["face", "identity", "hair"]);
  });

  it("applyWearOutfitComposition seeds plan on person document", () => {
    const person = mockDocument();
    const next = applyWearOutfitComposition(
      person,
      "https://example.com/outfit.png",
      "Outfit reference"
    );
    const plan = next.instructionStudioState?.compositionPlan;
    assert.ok(plan);
    assert.ok((plan?.items.length ?? 0) >= 4);
    assert.equal(next.instructionStudioState?.combineIntent, "person_outfit");
    assert.ok(plan?.userNotes?.includes("Preserve face"));
  });
});

describe("Editor V3 export and print", () => {
  it("evaluates expanded print readiness metrics", () => {
    const report = evaluatePrintReadiness({
      preset: "a1",
      sourceWidthPx: 1200,
      sourceHeightPx: 900,
    });
    assert.ok(report.printSuitabilityScore >= 0);
    assert.ok(typeof report.logoQualityScore === "number");
    assert.ok(typeof report.textReadabilityScore === "number");
    assert.equal(report.bleedReady, true);
  });

  it("supports three upscale modes with increasing multipliers", () => {
    assert.deepEqual([...EDITOR_UPSCALE_MODES], ["safe", "creative", "maximum_detail"]);
    assert.equal(upscaleMultiplier("safe"), 2);
    assert.ok(upscaleMultiplier("creative") > upscaleMultiplier("safe"));
    assert.ok(upscaleMultiplier("maximum_detail") > upscaleMultiplier("creative"));
  });

  it("computes max safe print size tiers", () => {
    const report = computeMaxSafePrintSize(4000, 3000);
    const area = (preset: string) => {
      const spec = printPresetSpec(preset as never);
      return spec.widthMm * spec.heightMm;
    };
    assert.ok(area(report.withPremiumUpscale) >= area(report.withSafeUpscale));
    assert.ok(area(report.withSafeUpscale) >= area(report.withoutUpscale));
    assert.equal(report.withoutUpscale, "a5");
    assert.equal(report.withSafeUpscale, "a3");
    assert.equal(report.withPremiumUpscale, "a2");
  });

  it("groups export targets by category including marketplace and print", () => {
    assert.ok(exportTargetsForCategory("social").length >= 3);
    assert.ok(exportTargetsForCategory("marketplace").some((t) => t.id === "marketplace"));
    assert.ok(exportTargetsForCategory("print").some((t) => t.printPreset));
  });
});

describe("Editor V3 planning vs results", () => {
  it("change plan entries are listable before variants exist", () => {
    const doc = mockDocument({
      instructionStudioState: {
        changePlan: [
          {
            id: "cp1",
            entryType: "object",
            objectId: "jacket",
            objectLabel: "Jacket",
            objectCategory: "clothing",
            action: "add_logo",
            instruction: "Add HomeCheff logo",
            strength: 70,
            preserveStyle: 80,
            preserveBrand: 90,
            order: 0,
            status: "pending",
          },
        ],
      },
    });
    assert.equal(listChangePlanEntries(doc).length, 1);
    assert.equal(listInstructionVariants(doc).filter((v) => v.status === "completed").length, 0);
  });

  it("results should only show when completed variants exist", () => {
    const planning = mockDocument();
    const withResult = mockDocument({
      instructionVariants: [
        {
          id: "v1",
          name: "Variant A",
          status: "completed",
          approvalStatus: "draft",
          resultUrl: "https://example.com/v1.png",
          sourceImageUrl: "https://example.com/bg.png",
          sourceImageId: "background",
          instruction: {
            objectKey: "obj_main",
            objectLabel: "Main",
            category: "other",
            action: "replace",
            sliders: { strength: 70, preserveStyle: 80, preserveBrand: 90 },
          },
          prompt: "test",
          provider: "openai",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });
    const planningCompleted = listInstructionVariants(planning).filter(
      (v) => v.status === "completed" || Boolean(v.resultUrl?.trim())
    );
    const resultsCompleted = listInstructionVariants(withResult).filter(
      (v) => v.status === "completed" || Boolean(v.resultUrl?.trim())
    );
    assert.equal(planningCompleted.length, 0);
    assert.equal(resultsCompleted.length, 1);
  });
});
