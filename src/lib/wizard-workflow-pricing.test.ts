import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveWizardWorkflowPrice,
  resolveWizardWorkflowPriceFromIntake,
  wizardIncludedFeaturesForWorkflow,
  wizardWorkflowPricingTier,
} from "@/lib/wizard-workflow-pricing";
import { createReferenceIntakeState } from "@/lib/editor-reference-role-intake";
import { workflowReferenceConfigForIntent } from "@/lib/editor-workflow-reference-config";
import { fusionWorkflowRenderCredits } from "@/lib/editor-fusion-workflow-credits";

describe("wizard workflow pricing", () => {
  it("returns total credits as analysis + render for users", () => {
    const price = resolveWizardWorkflowPrice({
      workflowType: "mascot_into_human",
      referenceCount: 2,
      cachedAnalysisCount: 0,
      userIsAdmin: false,
    });
    assert.equal(price.analysisCredits, 10);
    assert.equal(price.renderCredits, fusionWorkflowRenderCredits("mascot_into_human"));
    assert.equal(price.totalCredits, price.analysisCredits + price.renderCredits);
    assert.equal(price.requiresPayment, true);
  });

  it("admin bypass sets total to zero", () => {
    const price = resolveWizardWorkflowPrice({
      workflowType: "character_fusion",
      referenceCount: 2,
      cachedAnalysisCount: 0,
      userIsAdmin: true,
    });
    assert.equal(price.totalCredits, 0);
    assert.equal(price.adminBypass, true);
    assert.equal(price.requiresPayment, false);
  });

  it("cached analysis costs zero analysis credits", () => {
    const price = resolveWizardWorkflowPrice({
      workflowType: "outfit_from_reference",
      referenceCount: 2,
      cachedAnalysisCount: 2,
      userIsAdmin: false,
    });
    assert.equal(price.analysisCredits, 0);
    assert.equal(price.cachedAnalysesUsed, 2);
    assert.equal(price.totalCredits, price.renderCredits);
  });

  it("maps character studio workflows to character tier", () => {
    assert.equal(wizardWorkflowPricingTier("outfit_from_reference"), "character_studio");
    assert.equal(wizardWorkflowPricingTier("product_branding"), "simple_edit");
    assert.equal(wizardWorkflowPricingTier("future_child"), "fusion_studio");
  });

  it("includes smart analysis for all workflows", () => {
    const features = wizardIncludedFeaturesForWorkflow("product_branding");
    assert.ok(features.includes("smart_analysis"));
    assert.ok(features.includes("high_quality_render"));
  });

  it("resolves price from intake config", () => {
    const config = workflowReferenceConfigForIntent("character_fusion");
    const intake = createReferenceIntakeState({ config });
    const price = resolveWizardWorkflowPriceFromIntake({ intake, isAdmin: false });
    assert.ok(price);
    assert.equal(price!.workflowType, "character_fusion");
    assert.ok(price!.totalCredits >= fusionWorkflowRenderCredits("character_fusion"));
  });
});
