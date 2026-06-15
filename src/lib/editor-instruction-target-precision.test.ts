import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildChangePlanItemFromSelection } from "@/lib/editor-instruction-change-plan";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { DEFAULT_EDITOR_INSTRUCTION_SLIDERS } from "@/lib/editor-instruction-studio";
import {
  buildEditorInstructionPromptV3,
  buildEditorInstructionVariantPayload,
} from "@/lib/editor-instruction-prompt-builder";
import {
  evaluateProtectedRegionChecks,
  regionChangedBeyondThreshold,
} from "@/lib/editor-instruction-region-verification";
import {
  assessVariantPrecisionRisk,
  buildEditProtectionPlan,
  buildTargetOnlyInstructionBlock,
  buildTargetPrecisionContext,
  enrichChangePlanItemWithPrecision,
  isHomeCheffMascot,
  mergePrecisionWarnings,
  resolveLockedPartsForTarget,
} from "@/lib/editor-instruction-target-precision";
import type { EditorInstructionSelection } from "@/types/editor-instruction-studio";

function globeManDoc() {
  return createEditorDocumentFromUpload({
    name: "Globe Man.png",
    backgroundUrl: "https://example.com/globe-man.png",
  });
}

function jacketSelection(): EditorInstructionSelection & { color?: string } {
  return {
    objectKey: "obj_jacket",
    objectLabel: "Jacket",
    category: "clothing",
    action: "change_color",
    color: "rood",
    sliders: { ...DEFAULT_EDITOR_INSTRUCTION_SLIDERS },
    estimatedSelection: true,
  };
}

describe("editor-instruction-target-precision", () => {
  it("locks pants, face, and globe when jacket is selected on mascot", () => {
    const document = globeManDoc();
    const { protectedParts } = resolveLockedPartsForTarget(document, {
      objectId: "obj_jacket",
      objectLabel: "Jacket",
      targetPartId: "jacket",
    });

    assert.ok(protectedParts.some((p) => /pants/i.test(p)));
    assert.ok(protectedParts.some((p) => /face/i.test(p)));
    assert.ok(!protectedParts.some((p) => /jacket/i.test(p)));
  });

  it("creates structured protection plan for every edit request", () => {
    const document = globeManDoc();
    const plan = buildEditProtectionPlan(document, [
      { objectId: "obj_jacket", objectLabel: "Jacket", targetPartId: "jacket" },
    ]);

    assert.deepEqual(plan.targetParts, ["Jacket"]);
    assert.ok(plan.protectedParts.length > 0);
    assert.ok(plan.lockedIdentityFeatures.length > 0);
    assert.equal(plan.lockedBackground, true);
    assert.ok(plan.lockedStyle.length > 0);
    assert.ok(plan.protectedRegionBounds?.length);
    assert.ok(plan.targetRegionBounds?.length);
  });

  it("does not lock globe when globe is the edit target", () => {
    const document = globeManDoc();
    const plan = buildEditProtectionPlan(document, [
      { objectId: "obj_globe", objectLabel: "Globe", targetPartId: "globe" },
    ]);
    assert.ok(!plan.protectedParts.some((p) => /^globe$/i.test(p)));
  });

  it("adds HomeCheff mascot brand locks to the prompt", () => {
    const document = globeManDoc();
    assert.equal(isHomeCheffMascot(document), true);
    const ctx = buildTargetPrecisionContext(document, jacketSelection());
    const block = buildTargetOnlyInstructionBlock(ctx);

    assert.match(block, /Edit only the selected part/i);
    assert.match(block, /Protected parts:/i);
    assert.match(block, /Locked identity:/i);
    assert.match(block, /Locked style:/i);
    assert.match(block, /neutral white/i);
    assert.match(block, /NEGATIVE:/i);
    assert.match(block, /pants/i);
  });

  it("buildChangePlanItemFromSelection stores protection plan fields", () => {
    const document = globeManDoc();
    const item = buildChangePlanItemFromSelection(jacketSelection(), 0, document);

    assert.ok(item.protectionPlan?.targetParts.includes("Jacket"));
    assert.ok(item.protectionPlan?.protectedParts.length);
    assert.ok(item.protectionPlan?.lockedIdentityFeatures.length);
    assert.equal(item.protectionPlan?.lockedBackground, true);
    assert.ok(item.protectionPlan?.lockedStyle.length);
    assert.match(item.instruction, /Edit only the selected part/i);
    assert.equal(item.targetOnly, true);
  });

  it("buildEditorInstructionPromptV3 uses precision instructions for plan items", () => {
    const document = globeManDoc();
    const item = enrichChangePlanItemWithPrecision(
      buildChangePlanItemFromSelection(jacketSelection(), 0),
      document
    );
    const prompt = buildEditorInstructionPromptV3({
      entries: [item],
      document,
    });

    assert.match(prompt, /Protected parts:/i);
    assert.match(prompt, /Locked identity:/i);
    assert.doesNotMatch(prompt, /^1\. Change color of Jacket to rood\.$/m);
  });

  it("variant payload prompt includes locked parts when target-only is enabled", () => {
    const document = globeManDoc();
    const payload = buildEditorInstructionVariantPayload({
      ...jacketSelection(),
      document,
    });

    assert.match(payload.prompt, /Editable:/i);
    assert.match(payload.prompt, /Protected parts:/i);
    assert.match(payload.prompt, /neutral white/i);
  });

  it("mergePrecisionWarnings prefers verification low_precision", () => {
    assert.equal(
      mergePrecisionWarnings("possible_drift", {
        status: "low_precision",
        protectedRegionsChecked: 3,
        protectedRegionsChanged: 1,
        changedRegionLabels: ["Pants"],
        checkedAt: new Date().toISOString(),
      }),
      "low_precision"
    );
  });

  it("assessVariantPrecisionRisk returns low_precision from verification", () => {
    const warning = assessVariantPrecisionRisk({
      targetOnly: true,
      verification: {
        status: "low_precision",
        protectedRegionsChecked: 2,
        protectedRegionsChanged: 1,
        checkedAt: new Date().toISOString(),
      },
    });
    assert.equal(warning, "low_precision");
  });
});

describe("editor-instruction-region-verification", () => {
  it("detects protected region color drift", () => {
    const changed = regionChangedBeyondThreshold(
      [{ r: 20, g: 30, b: 200 }],
      [{ r: 200, g: 40, b: 30 }]
    );
    assert.equal(changed, true);
  });

  it("passes when protected region colors stay similar", () => {
    const changed = regionChangedBeyondThreshold(
      [{ r: 20, g: 30, b: 200 }, { r: 22, g: 28, b: 198 }],
      [{ r: 21, g: 31, b: 201 }, { r: 19, g: 29, b: 197 }]
    );
    assert.equal(changed, false);
  });

  it("flags low precision when any protected region changed", () => {
    const result = evaluateProtectedRegionChecks([
      {
        label: "Pants",
        sourceSamples: [{ r: 10, g: 10, b: 180 }],
        resultSamples: [{ r: 10, g: 10, b: 180 }],
      },
      {
        label: "Face",
        sourceSamples: [{ r: 250, g: 250, b: 250 }],
        resultSamples: [{ r: 180, g: 120, b: 90 }],
      },
    ]);
    assert.equal(result.status, "low_precision");
    assert.deepEqual(result.changedRegionLabels, ["Face"]);
  });
});
