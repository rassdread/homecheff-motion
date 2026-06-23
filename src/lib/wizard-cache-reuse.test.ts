import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveWizardWorkflowPrice } from "@/lib/wizard-workflow-pricing";
import { PREMIUM_VISION_ANALYSIS_CREDITS } from "@/lib/editor-premium-vision-credits";
import { fusionWorkflowRenderCredits } from "@/lib/editor-fusion-workflow-credits";

describe("wizard cache reuse", () => {
  it("charges only render when all references are cached", () => {
    const price = resolveWizardWorkflowPrice({
      workflowType: "human_into_mascot",
      referenceCount: 3,
      cachedAnalysisCount: 3,
      userIsAdmin: false,
    });
    assert.equal(price.analysisCredits, 0);
    assert.equal(price.uncachedReferenceCount, 0);
    assert.equal(price.totalCredits, fusionWorkflowRenderCredits("human_into_mascot"));
  });

  it("charges partial analysis for mixed cache", () => {
    const price = resolveWizardWorkflowPrice({
      workflowType: "character_fusion",
      referenceCount: 2,
      cachedAnalysisCount: 1,
      userIsAdmin: false,
    });
    assert.equal(price.analysisCredits, PREMIUM_VISION_ANALYSIS_CREDITS);
    assert.equal(price.cachedAnalysesUsed, 1);
  });
});
