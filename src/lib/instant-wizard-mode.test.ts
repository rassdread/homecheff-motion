import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildWizardNavHandlers,
  clampWizardStep,
  resolveWizardView,
  wizardStepCount,
} from "@/lib/instant-wizard-flow";

describe("instant wizard flow", () => {
  it("beginner has four steps upload → storyboard → text → generate", () => {
    assert.equal(wizardStepCount("beginner"), 4);
    assert.equal(resolveWizardView("beginner", 1), "upload");
    assert.equal(resolveWizardView("beginner", 2), "storyboard");
    assert.equal(resolveWizardView("beginner", 3), "text");
    assert.equal(resolveWizardView("beginner", 4), "generate");
  });

  it("expert keeps five-step creator flow", () => {
    assert.equal(wizardStepCount("expert"), 5);
    assert.equal(resolveWizardView("expert", 2), "style");
    assert.equal(resolveWizardView("expert", 5), "generate");
  });

  it("expert studio handoff skips style and mood", () => {
    const opts = { studioHandoff: true };
    assert.equal(wizardStepCount("expert", opts), 3);
    assert.equal(resolveWizardView("expert", 1, opts), "upload");
    assert.equal(resolveWizardView("expert", 2, opts), "prompt");
    assert.equal(resolveWizardView("expert", 3, opts), "generate");
  });

  it("clamps out-of-range steps", () => {
    assert.equal(clampWizardStep("beginner", 9), 4);
    assert.equal(clampWizardStep("expert", 0), 1);
  });

  it("builds nav for beginner checkout step", () => {
    let checkout = false;
    const nav = buildWizardNavHandlers("beginner", 4, {
      setStep: () => {},
      startCheckoutWithQa: () => {
        checkout = true;
      },
      canContinueFromUpload: true,
      checkoutBusy: false,
    });
    nav.onPrimary();
    assert.equal(checkout, true);
    assert.equal(nav.showBack, true);
  });
});
