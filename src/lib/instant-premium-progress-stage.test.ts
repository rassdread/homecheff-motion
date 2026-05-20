import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  INSTANT_EXPORT_STUCK_MS,
  isInstantExportProgressStuck,
  resolveInstantPremiumProgress,
} from "@/lib/instant-premium-progress-stage";

describe("instant premium progress stage", () => {
  it("maps segment generation to 0–70%", () => {
    const view = resolveInstantPremiumProgress({
      status: "running",
      phase: "generating_clips",
      progressPercent: 40,
    });
    assert.equal(view.stage, "segment_rendering");
    assert.ok(view.displayPercent <= 70);
  });

  it("maps rebuild merge at 75% to poster or merge stage", () => {
    const view = resolveInstantPremiumProgress({
      status: "finalizing",
      phase: "merging_clips",
      progressPercent: 75,
      isRebuildingFinalVideo: true,
      instantTextRenderMode: "poster_motion_preserve",
    });
    assert.equal(view.activeOperation, "rebuild");
    assert.equal(view.stage, "poster_compositing");
  });

  it("maps upload band at 88%", () => {
    const view = resolveInstantPremiumProgress({
      status: "finalizing",
      phase: "uploading_final",
      progressPercent: 88,
    });
    assert.equal(view.stage, "upload_storage");
    assert.equal(view.activeOperation, "upload");
  });

  it("detects stuck export after 90s without progress change", () => {
    const now = Date.now();
    assert.equal(
      isInstantExportProgressStuck({
        isActive: true,
        lastProgressChangeAtMs: now - INSTANT_EXPORT_STUCK_MS - 1,
        nowMs: now,
      }),
      true
    );
  });
});
