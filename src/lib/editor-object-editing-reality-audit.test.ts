import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  APPEARANCE_AUDIT,
  MASK_TRUTH_PIPELINE,
  MASCOT_USER_JOURNEY,
  OBJECT_SELECTION_REALITY,
  PIXEL_CHANGE_AUDIT,
  TOP_15_OBJECT_EDITING_BLOCKERS,
  canvasPreviewUsesBackgroundOnly,
  changeClothingHiddenFromHumanUi,
  computeObjectEditingScore,
  editAppearanceIsNoOp,
  freshLayerHasNoMaskUrl,
  humanFirstHidesUnselectedLayers,
  runMaskedEditRequiresMaskUrl,
} from "@/lib/editor-object-editing-reality-audit";
import { shouldShowActionInHumanUi } from "@/lib/editor-ux-cleanup";

describe("Editor Object Editing Reality Audit", () => {
  it("documents selection matrix for nine object types", () => {
    assert.equal(OBJECT_SELECTION_REALITY.length, 9);
    const face = OBJECT_SELECTION_REALITY.find((r) => r.objectType === "face");
    assert.equal(face?.selectable, "no");
    const clothing = OBJECT_SELECTION_REALITY.find((r) => r.objectType === "clothing");
    assert.equal(clothing?.editable, "no");
  });

  it("fresh upload layer has no maskUrl for replace/remove plans", () => {
    assert.equal(freshLayerHasNoMaskUrl(), true);
  });

  it("runMaskedEdit requires maskUrl in workspace", () => {
    assert.equal(runMaskedEditRequiresMaskUrl(), true);
  });

  it("mask truth pipeline shows default is estimated bbox template", () => {
    const initial = MASK_TRUTH_PIPELINE.find((r) => r.stage.includes("After upload"));
    assert.equal(initial?.estimated, true);
    assert.equal(initial?.real, false);
    const gate = MASK_TRUTH_PIPELINE.find((r) => r.stage.includes("runMaskedEdit"));
    assert.ok(gate?.requiresUserAction?.includes("maskUrl"));
  });

  it("pixel audit: unmasked replace and brand kit do not change pixels", () => {
    const unmasked = PIXEL_CHANGE_AUDIT.find((r) => r.action.includes("no mask"));
    const brand = PIXEL_CHANGE_AUDIT.find((r) => r.action.includes("Brand kit"));
    assert.equal(unmasked?.pixelsChange, false);
    assert.equal(brand?.pixelsChange, false);
    const masked = PIXEL_CHANGE_AUDIT.find((r) => r.action.includes("masked OpenAI"));
    assert.equal(masked?.pixelsChange, true);
  });

  it("appearance: change_clothing hidden; edit_appearance not implemented", () => {
    assert.equal(changeClothingHiddenFromHumanUi(), true);
    assert.equal(shouldShowActionInHumanUi("change_clothing"), false);
    assert.equal(editAppearanceIsNoOp(), true);
    const editAppearance = APPEARANCE_AUDIT.find((r) => r.feature.includes("edit_appearance"));
    assert.equal(editAppearance?.status, "not_implemented");
  });

  it("canvas preview uses backgroundUrl only", () => {
    assert.equal(canvasPreviewUsesBackgroundOnly(), true);
  });

  it("humanFirst mode hides unselected layer handles on canvas", () => {
    assert.equal(humanFirstHidesUnselectedLayers(), true);
  });

  it("mascot user journey: jacket and logo tasks blocked without mask/compositor", () => {
    const jacket = MASCOT_USER_JOURNEY.find((t) => t.task === "Change jacket");
    const logo = MASCOT_USER_JOURNEY.find((t) => t.task === "Add HomeCheff logo");
    assert.equal(jacket?.completable, false);
    assert.equal(logo?.completable, false);
  });

  it("object editing overall score is below production threshold", () => {
    const score = computeObjectEditingScore();
    assert.ok(score.overall < 6, `expected overall < 6, got ${score.overall}`);
    assert.ok(score.pixelEditing <= 3);
    assert.ok(score.masks <= 3);
  });

  it("lists 15 ranked object editing blockers", () => {
    assert.equal(TOP_15_OBJECT_EDITING_BLOCKERS.length, 15);
    assert.ok(TOP_15_OBJECT_EDITING_BLOCKERS[0]?.blocker.includes("maskUrl"));
  });
});
