import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  REALITY_TEST_STEPS,
  brokenFeaturesHiddenFromHumanUi,
  compositorModuleExists,
  computeSourceOfTruthScore,
  maskGateBlocksPixelEdits,
  studioEntryExposesCompositorUrls,
} from "@/lib/editor-source-of-truth-audit";

describe("Editor Source of Truth Audit", () => {
  it("compositor module and overlays exist", () => {
    assert.equal(compositorModuleExists(), true);
  });

  it("mask gate blocks pixel edits in workspace", () => {
    assert.equal(maskGateBlocksPixelEdits(), true);
  });

  it("broken features are hidden until compositor-ready", () => {
    assert.equal(brokenFeaturesHiddenFromHumanUi(), true);
  });

  it("studio entry exposes compositor layer urls", () => {
    assert.equal(studioEntryExposesCompositorUrls(), true);
  });

  it("reality test documents end-to-end pipeline", () => {
    assert.equal(REALITY_TEST_STEPS.length, 11);
    const exportStep = REALITY_TEST_STEPS.find((row) => row.step === "Export PNG");
    assert.equal(exportStep?.pass, true);
  });

  it("overall source-of-truth score meets sprint threshold", () => {
    const score = computeSourceOfTruthScore();
    assert.ok(score.compositor >= 7, `compositor ${score.compositor}`);
    assert.ok(score.export >= 7, `export ${score.export}`);
    assert.ok(score.overall >= 6, `overall ${score.overall}`);
  });
});
