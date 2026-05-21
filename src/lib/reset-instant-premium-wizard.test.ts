import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getInstantWizardFormDefaults,
  isInstantWizardVideoProcessingActive,
} from "@/lib/reset-instant-premium-wizard";
import type { InstantPremiumStatusResponse } from "@/types/animation-api";

function snapshot(
  partial: Partial<InstantPremiumStatusResponse>
): InstantPremiumStatusResponse {
  return {
    projectId: "p1",
    projectType: "instant_premium",
    status: "running",
    phase: "generating_clips",
    progressPercent: 40,
    segments: [],
    finalVideoUrl: null,
    finalDurationSeconds: null,
    downloadable: false,
    errorMessage: null,
    ...partial,
  };
}

describe("reset-instant-premium-wizard", () => {
  it("returns empty step-1 defaults", () => {
    const defaults = getInstantWizardFormDefaults();
    assert.equal(defaults.step, 1);
    assert.equal(defaults.motionText, "");
    assert.deepEqual(defaults.chips, []);
    assert.deepEqual(defaults.lockedTextLayers, []);
  });

  it("detects in-flight video processing", () => {
    assert.equal(isInstantWizardVideoProcessingActive({ checkoutBusy: true }), true);
    assert.equal(
      isInstantWizardVideoProcessingActive({
        checkoutBusy: false,
        projectSnapshot: snapshot({ status: "running" }),
      }),
      true
    );
    assert.equal(
      isInstantWizardVideoProcessingActive({
        checkoutBusy: false,
        projectSnapshot: snapshot({ status: "completed" }),
      }),
      false
    );
    assert.equal(
      isInstantWizardVideoProcessingActive({
        checkoutBusy: false,
        projectSnapshot: snapshot({
          status: "running",
          finalVideoUrl: "https://cdn.example/final.mp4",
          downloadable: true,
        }),
      }),
      false
    );
    assert.equal(
      isInstantWizardVideoProcessingActive({
        checkoutBusy: false,
        projectSnapshot: snapshot({ status: "running", workerJobStatus: "running" }),
      }),
      true
    );
  });
});
