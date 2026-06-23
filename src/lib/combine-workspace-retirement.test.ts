import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  combineRetirementPlan,
  combineWorkspaceAllowedForUser,
  shouldSteerCombineIntentToWizard,
} from "@/lib/combine-workspace-retirement";

describe("combine workspace retirement plan", () => {
  it("includes campaign_variant as migrate_to_wizard", () => {
    const plan = combineRetirementPlan();
    const campaign = plan.find((entry) => entry.intent === "campaign_variant");
    assert.ok(campaign);
    assert.equal(campaign!.decision, "migrate_to_wizard");
    assert.equal(campaign!.wizardFirstToday, true);
  });

  it("steers wizard-first intents for normal users", () => {
    assert.equal(shouldSteerCombineIntentToWizard("campaign_variant"), true);
    assert.equal(
      combineWorkspaceAllowedForUser({ role: "user", billingFree: false }),
      false
    );
    assert.equal(
      combineWorkspaceAllowedForUser({ role: "admin", billingFree: false }),
      true
    );
  });

  it("keeps legacy composition admin-only", () => {
    const plan = combineRetirementPlan();
    const custom = plan.find((entry) => entry.intent === "custom_composition");
    assert.equal(custom?.decision, "admin_only");
  });
});
