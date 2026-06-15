import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAccessoryAddPrompt,
  buildAccessorySelectionPatch,
  isAccessoryEligibleTarget,
  resolveAccessoryTypesForTarget,
} from "@/lib/editor-instruction-accessory-actions";
import {
  buildChangePlanItemFromSelection,
  validateChangePlanItemInput,
} from "@/lib/editor-instruction-change-plan";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { DEFAULT_EDITOR_INSTRUCTION_SLIDERS } from "@/lib/editor-instruction-studio";
import { buildRequestedChange } from "@/lib/editor-instruction-target-precision";
import type { EditorInstructionSelection } from "@/types/editor-instruction-studio";

function globeManDoc() {
  return createEditorDocumentFromUpload({
    name: "Globe Man.png",
    backgroundUrl: "https://example.com/globe-man.png",
  });
}

function accessorySelection(
  partial: Partial<EditorInstructionSelection> &
    Pick<EditorInstructionSelection, "objectLabel" | "objectKey" | "category">
): EditorInstructionSelection & { color?: string } {
  return {
    action: "accessory_add",
    accessoryType: "sunglasses",
    sliders: { ...DEFAULT_EDITOR_INSTRUCTION_SLIDERS },
    ...partial,
  };
}

describe("editor-instruction-accessory-actions", () => {
  it("selecting Eyes allows sunglasses", () => {
    assert.ok(
      isAccessoryEligibleTarget({ label: "Eyes", partId: "eyes", category: "character" })
    );
    const types = resolveAccessoryTypesForTarget({
      label: "Eyes",
      partId: "eyes",
      category: "character",
    });
    assert.ok(types.includes("sunglasses"));
    assert.ok(types.includes("glasses"));
  });

  it("selecting Head allows hat", () => {
    assert.ok(
      isAccessoryEligibleTarget({ label: "Head", partId: "head", category: "character" })
    );
    const types = resolveAccessoryTypesForTarget({
      label: "Head",
      partId: "head",
      category: "character",
    });
    assert.ok(types.includes("hat"));
    assert.ok(types.includes("beanie"));
  });

  it("non-target parts are protected when adding an accessory", () => {
    const document = globeManDoc();
    const selection = accessorySelection({
      objectKey: "obj_eyes",
      objectLabel: "Eyes",
      category: "character",
      targetPartId: "eyes",
      accessoryType: "sunglasses",
    });
    const item = buildChangePlanItemFromSelection(selection, 0, document);

    assert.equal(item.action, "accessory_add");
    assert.equal(item.accessoryType, "sunglasses");
    assert.ok(item.protectionPlan?.protectedParts.length);
    assert.ok(
      item.protectionPlan?.protectedParts.some((part) => /shirt|pants|tie/i.test(part))
    );
    assert.equal(item.protectionPlan?.lockedBackground, true);
    assert.ok(
      item.protectionPlan?.lockedIdentityFeatures.some((feature) => /pose/i.test(feature))
    );
  });

  it("action creates change plan item with accessory_add", () => {
    const document = globeManDoc();
    const selection = accessorySelection({
      objectKey: "obj_face",
      objectLabel: "Face",
      category: "character",
      targetPartId: "face",
      accessoryType: "sunglasses",
    });

    const validation = validateChangePlanItemInput(selection, document);
    assert.equal(validation.ok, true);

    const item = buildChangePlanItemFromSelection(selection, 0, document);
    assert.equal(item.action, "accessory_add");
    assert.equal(item.accessoryType, "sunglasses");
    assert.equal(item.objectLabel, "Face");
    assert.ok(item.instruction.length > 0);
  });

  it("prompt includes accessory and protection rules", () => {
    const prompt = buildAccessoryAddPrompt({
      targetLabel: "Face",
      targetPartId: "face",
      accessoryType: "sunglasses",
    });
    assert.match(prompt, /black sunglasses/i);
    assert.match(prompt, /face\/eyes area/i);

    const requested = buildRequestedChange({
      objectLabel: "Face",
      action: "accessory_add",
      accessoryType: "sunglasses",
      targetPartId: "face",
    });
    assert.match(requested, /black sunglasses/i);
    assert.match(requested, /Do not change face identity/i);
    assert.match(requested, /clothing, pose, background/i);

    const patch = buildAccessorySelectionPatch("hat");
    assert.equal(patch.action, "accessory_add");
    assert.equal(patch.accessoryType, "hat");
    assert.equal(patch.replacement, "a hat");
  });
});
