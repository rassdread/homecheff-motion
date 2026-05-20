import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CREATOR_WIZARD_STEP_COUNT,
  normalizeCreatorWizardStep,
} from "@/lib/creator-wizard-steps";

describe("creator wizard steps", () => {
  it("uses five creator-facing steps", () => {
    assert.equal(CREATOR_WIZARD_STEP_COUNT, 5);
  });

  it("maps legacy seven-step wizard to five steps", () => {
    assert.equal(normalizeCreatorWizardStep(7), 5);
    assert.equal(normalizeCreatorWizardStep(5), 4);
    assert.equal(normalizeCreatorWizardStep(3), 2);
    assert.equal(normalizeCreatorWizardStep(5, 2), 5);
  });
});
