import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isInstantWizardProjectSnapshotComplete,
  isProjectPlayablyComplete,
  resolveProjectDisplayStatus,
} from "@/lib/project-display-status";
import { isInstantWizardVideoProcessingActive } from "@/lib/reset-instant-premium-wizard";
import type { InstantPremiumStatusResponse } from "@/types/animation-api";

describe("project-display-status", () => {
  it("maps rendering project with playable URL to completed", () => {
    assert.equal(
      resolveProjectDisplayStatus({
        projectStatus: "rendering",
        exportStatus: "rendering",
        outputVideoUrl: "https://cdn.example/final.mp4",
      }),
      "completed"
    );
  });

  it("maps succeeded/done export aliases to completed", () => {
    assert.equal(
      resolveProjectDisplayStatus({
        projectStatus: "rendering",
        exportStatus: "succeeded",
        outputVideoUrl: "https://cdn.example/v.mp4",
      }),
      "completed"
    );
  });

  it("keeps failed when explicitly failed", () => {
    assert.equal(
      resolveProjectDisplayStatus({
        projectStatus: "failed",
        exportStatus: "completed",
        outputVideoUrl: "https://cdn.example/v.mp4",
      }),
      "failed"
    );
  });

  it("detects playable completion without completed status tokens", () => {
    assert.equal(
      isProjectPlayablyComplete({
        projectStatus: "rendering",
        exportStatus: "rendering",
        outputVideoUrl: "https://cdn.example/final.mp4",
      }),
      true
    );
  });

  it("treats saved wizard snapshot with finalVideoUrl as complete", () => {
    const snapshot = {
      projectId: "p1",
      status: "finalizing",
      downloadable: true,
      finalVideoUrl: "https://cdn.example/final.mp4",
    } as InstantPremiumStatusResponse;
    assert.equal(isInstantWizardProjectSnapshotComplete(snapshot), true);
    assert.equal(
      isInstantWizardVideoProcessingActive({
        checkoutBusy: false,
        projectSnapshot: snapshot,
      }),
      false
    );
  });
});
