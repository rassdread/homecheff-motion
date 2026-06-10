import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clothingFeaturesRemainHidden } from "@/lib/editor-clothing-appearance";
import {
  PRODUCTION_READY_ITEMS,
  REAL_USER_TEST_STEPS,
  autoMaskOnSelectWired,
  computeProductionCompletionScore,
  motionPrefillUsesCompositorUrls,
  oneClickBackgroundRemovalWired,
  serverEditorProjectsApiExists,
  studioImportFromEditorWired,
} from "@/lib/editor-production-completion-audit";

describe("Editor Production Completion Audit", () => {
  it("server editor projects API exists", () => {
    assert.equal(serverEditorProjectsApiExists(), true);
  });

  it("auto mask on select is wired", () => {
    assert.equal(autoMaskOnSelectWired(), true);
  });

  it("one-click background removal updates compositor", () => {
    assert.equal(oneClickBackgroundRemovalWired(), true);
  });

  it("motion prefill uses compositor urls", () => {
    assert.equal(motionPrefillUsesCompositorUrls(), true);
  });

  it("studio import from editor is wired", () => {
    assert.equal(studioImportFromEditorWired(), true);
  });

  it("clothing features remain hidden without dedicated pixel paths", () => {
    assert.equal(clothingFeaturesRemainHidden(), true);
  });

  it("real user test documents pipeline steps", () => {
    assert.equal(REAL_USER_TEST_STEPS.length, 11);
  });

  it("production completion score meets threshold", () => {
    const score = computeProductionCompletionScore();
    assert.ok(score.overall >= 6, `overall ${score.overall}`);
    assert.ok(score.projects >= 6);
    assert.ok(PRODUCTION_READY_ITEMS.length >= 5);
  });
});
