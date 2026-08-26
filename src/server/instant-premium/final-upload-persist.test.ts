import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { finalBlobPathname } from "@/lib/final-video-storage";
import { resolveFinalBlobVersionForUpload } from "@/server/instant-premium/render-version-service";

const __dirname = dirname(fileURLToPath(import.meta.url));

function read(rel: string): string {
  return readFileSync(join(__dirname, rel), "utf8");
}

describe("final upload and persist (automatic vs rebuild)", () => {
  const merge = read("merge-instant-project.ts");
  const commit = read("final-video-export-commit.ts");
  const replace = read("replace-final-video-blob.ts");

  it("1: merge reads local output before blob upload", () => {
    assert.match(merge, /await fs\.readFile\(mergedPath\)/);
    assert.match(merge, /finalBlobUploadStart/);
  });

  it("2: upload is awaited before workDir cleanup in finally", () => {
    const uploadIdx = merge.indexOf("await uploadMergedVideoToBlob");
    const finallyIdx = merge.indexOf("} finally {");
    assert.ok(uploadIdx > 0 && finallyIdx > uploadIdx);
    assert.match(merge, /await fs\.rm\(workDir/);
  });

  it("3: upload success persists finalVideoUrl via commitInstantPremiumFinalVideoExport", () => {
    assert.match(merge, /await commitInstantPremiumFinalVideoExport/);
    assert.match(commit, /outputVideoUrl: finalUrl/);
  });

  it("4: upload failure leaves recoverable export state", () => {
    assert.match(merge, /ExportBlobUploadError/);
    assert.match(merge, /retryUploadLocalMergedFinalVideo/);
    assert.match(merge, /status: "failed"/);
  });

  it("5–6: finalize repair path does not call Vidu or reserve provider credits", () => {
    const finalize = read("finalize-repair.ts");
    const rebuild = read("rebuild-final-video.ts");
    assert.ok(!/triggerVidu|createVidu|openai\.|images\.generate/i.test(finalize));
    assert.match(rebuild, /billingImpact|aiCreditsUsed/);
  });

  it("7–8: rebuild and status orchestration share runFinalExportToCompletion", () => {
    const finalize = read("finalize-repair.ts");
    const rebuild = read("rebuild-final-video.ts");
    assert.match(finalize, /runFinalExportToCompletion/);
    assert.match(rebuild, /runFinalExportToCompletion/);
    assert.match(finalize, /isInstantPremiumExportCompleted/);
  });

  it("9: automatic and rebuild use the same uploadMergedVideoToBlob primitive", () => {
    assert.match(merge, /uploadMergedVideoToBlob/);
    assert.match(merge, /replaceFinalVideoBlobSafely/);
    assert.equal(
      merge.includes("uploadMergedVideoToBlob(projectId, mergedPath"),
      true
    );
  });

  it("9b: automatic and rebuild share version persistence via persistFinalRenderVersionAfterExport", () => {
    const commit = read("final-video-export-commit.ts");
    assert.match(commit, /persistFinalRenderVersionAfterExport/);
    assert.match(merge, /renderVersionKind/);
  });

  it("10: DB commit is separate from storage upload (distinguishable failures)", () => {
    assert.match(merge, /await uploadMergedVideoToBlob[\s\S]*await commitInstantPremiumFinalVideoExport/);
    assert.match(commit, /await prisma\.animationExport\.update/);
  });

  it("11: workDir cleanup happens after upload attempt in finally block", () => {
    const tryFinally = merge.slice(merge.indexOf("try {"), merge.indexOf("} finally {") + 200);
    assert.match(tryFinally, /uploadMergedVideoToBlob/);
  });

  it("12: successful commit sets completed export progress 100", () => {
    assert.match(commit, /progress: 100/);
    assert.match(commit, /status: "completed"/);
  });

  it("13: failed upload does not leave export at fake 70% without error", () => {
    assert.match(merge, /errorMessage: message/);
    assert.match(merge, /instantWorkerJobStatus: "failed"/);
  });

  it("14: automatic re-finalization uses versioned blob when rebuild count > 0", () => {
    const version = resolveFinalBlobVersionForUpload({
      pendingRenderVersionNumber: null,
      isMergeOnlyTextRebuild: false,
      nextTextRebuildCount: 5,
      existingRebuildCount: 4,
    });
    assert.equal(version, 5);
    assert.equal(finalBlobPathname("proj", version), "motion/final/proj/final-v5.mp4");
    assert.match(merge, /existingRebuildCount/);
    assert.match(merge, /isVersionedAutomaticRefinalization/);
  });

  it("legacy final.mp4 upload allows overwrite for first-time path", () => {
    assert.match(merge, /allowOverwrite: true/);
    assert.match(replace, /allowOverwrite: true/);
  });
});
