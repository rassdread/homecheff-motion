import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MOTION_CHARACTER_RENDER_CREDITS,
  MOTION_VISION_ANALYSIS_CREDITS,
  resolveMotionWizardGeneratePrice,
  resolveMotionWizardWorkflowPrice,
} from "@/lib/wizard-workflow-pricing";
import { validateWizardCreditReservation } from "@/lib/wizard-credit-reservation";
import { fusionWorkflowUsesWizardFirst } from "@/lib/editor-fusion-wizard-flow";

describe("motion wizard pricing", () => {
  it("totals vision + render before analysis completes", () => {
    const price = resolveMotionWizardWorkflowPrice({
      workflowId: "motion_ready_character",
      visionAnalysisComplete: false,
      userIsAdmin: false,
    });
    assert.equal(price.analysisCredits, MOTION_VISION_ANALYSIS_CREDITS);
    assert.equal(price.renderCredits, MOTION_CHARACTER_RENDER_CREDITS);
    assert.equal(price.totalCredits, 25);
  });

  it("charges render only after vision analysis is complete", () => {
    const price = resolveMotionWizardGeneratePrice({
      workflowId: "full_body_extension",
      userIsAdmin: false,
    });
    assert.equal(price.analysisCredits, 0);
    assert.equal(price.totalCredits, MOTION_CHARACTER_RENDER_CREDITS);
    assert.equal(price.cachedAnalysesUsed, 1);
  });

  it("passes credit pre-flight for motion generate step", () => {
    const price = resolveMotionWizardGeneratePrice({
      workflowId: "motion_ready_character",
      userIsAdmin: false,
    });
    const result = validateWizardCreditReservation({
      price,
      creditsAvailable: price.totalCredits,
    });
    assert.equal(result.ok, true);
  });
});

describe("campaign variant wizard-first", () => {
  it("uses wizard-first flow after FUSION_INTELLIGENCE migration", () => {
    assert.equal(fusionWorkflowUsesWizardFirst("campaign_variant"), true);
  });
});
