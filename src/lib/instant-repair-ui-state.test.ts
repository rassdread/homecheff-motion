import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  resolveInstantRepairUiView,
  shouldShowUnifiedVideoRepairCard,
} from "@/lib/instant-repair-ui-state";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("instant-repair-ui-state", () => {
  it("shows repair_action when export failed without final video", () => {
    const view = resolveInstantRepairUiView({
      snapshot: {
        canRepairFinalVideo: true,
        canRebuildFinalVideo: true,
        canRetryOverlay: false,
        canRetryMerge: false,
        segmentsMergeFailed: true,
        finalVideoUrl: null,
        overlayFailed: false,
        status: "failed",
        videoRepairStatus: null,
        isRestoringFinalVideo: false,
      },
    });
    assert.equal(view, "repair_action");
    assert.equal(shouldShowUnifiedVideoRepairCard(view), true);
  });

  it("shows repair_running when repairStarting is true", () => {
    const view = resolveInstantRepairUiView({
      snapshot: {
        canRepairFinalVideo: true,
        canRebuildFinalVideo: true,
        canRetryOverlay: false,
        canRetryMerge: false,
        segmentsMergeFailed: false,
        finalVideoUrl: null,
        overlayFailed: false,
        status: "rendering",
        videoRepairStatus: null,
        isRestoringFinalVideo: false,
      },
      repairStarting: true,
    });
    assert.equal(view, "repair_running");
  });

  it("progress page uses one unified repair card in the panel", () => {
    const src = readFileSync(
      join(__dirname, "../app/animate/instant/progress/page.tsx"),
      "utf8"
    );
    assert.match(src, /showUnifiedRepair=\{videoRepair\.showRepairCard\}/);
    assert.match(src, /hideMergeRepairButton=\{videoRepair\.showRepairCard\}/);
    assert.doesNotMatch(src, /onVideoRepair=\{\(\) => void runVideoRepair\(\)\}/);
  });

  it("video detail page does not duplicate amber recover card when progress panel shows repair", () => {
    const src = readFileSync(join(__dirname, "../app/videos/[id]/page.tsx"), "utf8");
    assert.match(src, /!showInstantProgress && videoRepair\.showRepairCard/);
    assert.doesNotMatch(src, /instant\.recover\.notCompleted/);
  });
});
