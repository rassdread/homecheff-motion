import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { resolveInstantRecoveryActionVisibility } from "@/lib/instant-recovery-actions";
import { en } from "@/i18n/locales/en";
import { nl } from "@/i18n/locales/nl";

describe("instant recovery action visibility", () => {
  it("shows Video herstellen when export failed without final video", () => {
    const visibility = resolveInstantRecoveryActionVisibility({
      canRepairFinalVideo: true,
      canRebuildFinalVideo: true,
      canRetryOverlay: false,
      canRetryMerge: false,
      segmentsMergeFailed: true,
      finalVideoUrl: null,
      overlayFailed: false,
      status: "failed",
    });
    assert.equal(visibility.showVideoRepair, true);
    assert.equal(visibility.showTextRerender, false);
    assert.equal(visibility.showAdminForceRebuild, true);
  });

  it("shows Edit texts when final video exists and export completed", () => {
    const visibility = resolveInstantRecoveryActionVisibility({
      canRepairFinalVideo: false,
      canRebuildFinalVideo: true,
      canRetryOverlay: false,
      canRetryMerge: false,
      segmentsMergeFailed: false,
      finalVideoUrl: "https://example.com/final.mp4",
      overlayFailed: false,
      status: "completed",
    });
    assert.equal(visibility.showVideoRepair, false);
    assert.equal(visibility.showTextRerender, true);
    assert.equal(visibility.showAdminForceRebuild, false);
  });

  it("shows Video herstellen for overlay failure instead of text rerender", () => {
    const visibility = resolveInstantRecoveryActionVisibility({
      canRepairFinalVideo: false,
      canRebuildFinalVideo: true,
      canRetryOverlay: true,
      canRetryMerge: false,
      segmentsMergeFailed: false,
      finalVideoUrl: null,
      overlayFailed: true,
      status: "failed_overlay",
    });
    assert.equal(visibility.showVideoRepair, true);
    assert.equal(visibility.showTextRerender, false);
  });

  it("needs_refresh language path uses text rerender label keys", () => {
    assert.equal(en["instant.textRerender.cta"], "Edit texts");
    assert.equal(nl["instant.textRerender.cta"], "Teksten aanpassen");
  });

  it("normal user labels avoid merge/ffmpeg/worker/recovery jargon", () => {
    const userKeys = [
      "instant.videoRepair.cta",
      "instant.videoRepair.hint",
      "instant.textRerender.cta",
      "instant.textRerender.hint",
      "instant.recover.cta",
      "instant.progress.segmentsMergeFailed",
    ] as const;
    const banned = /\b(ffmpeg|worker|recovery|merge|samenstel)\b/i;
    for (const key of userKeys) {
      assert.ok(!banned.test(en[key]), `${key} EN should stay user-friendly`);
      assert.ok(!banned.test(nl[key]), `${key} NL should stay user-friendly`);
    }
  });

  it("force rebuild keys exist for admin advanced section", () => {
    assert.equal(en["instant.forceRebuild.cta"], "Force rebuild");
    assert.equal(nl["instant.advancedOptions.title"], "Geavanceerde opties");
  });

  it("text rerender and repair server paths do not call Vidu", () => {
    const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
    const repairSrc = fs.readFileSync(
      path.join(root, "server/instant-premium/finalize-repair.ts"),
      "utf8"
    );
    const rebuildSrc = fs.readFileSync(
      path.join(root, "server/instant-premium/rebuild-final-video.ts"),
      "utf8"
    );
    for (const src of [repairSrc, rebuildSrc]) {
      assert.ok(!src.includes("triggerVidu"));
      assert.ok(!src.includes("viduClient"));
    }
  });
});
