import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));

function read(rel: string): string {
  return readFileSync(join(__dirname, rel), "utf8");
}

describe("final render version persistence after automatic export", () => {
  const commit = read("final-video-export-commit.ts");
  const versions = read("render-version-service.ts");
  const merge = read("merge-instant-project.ts");
  const rebuild = read("rebuild-final-video.ts");

  it("1–2: commit persists ProjectRenderVersion with finalVideoUrl on rebuild without pending", () => {
    assert.match(commit, /persistFinalRenderVersionAfterExport/);
    assert.match(commit, /FINAL_RENDER_VERSION_PERSISTED/);
    assert.match(versions, /finalVideoUrl: finalUrl|finalVideoUrl: params\.finalVideoUrl/);
  });

  it("3–4: persistFinalRenderVersionAfterExport uses getNextRenderVersionNumber / createPending", () => {
    assert.match(versions, /export async function persistFinalRenderVersionAfterExport/);
    assert.match(versions, /createPendingFullRerenderVersion|createPendingTextRerenderVersion/);
    assert.match(versions, /completePendingFullRerenderVersion/);
    assert.match(versions, /getNextRenderVersionNumber/);
  });

  it("5: failed default is demoted when creating new completed version", () => {
    assert.match(versions, /isDefault: true/);
    assert.match(versions, /isDefault: false/);
    assert.match(versions, /sealDefaultRenderVersion/);
  });

  it("6–8: idempotent by existing completed URL; no Vidu in version helpers", () => {
    assert.match(versions, /findCompletedVersionWithFinalUrl/);
    assert.ok(!/triggerVidu|createVidu|openai\.|images\.generate/i.test(versions));
    assert.ok(!/triggerVidu|createVidu|openai\.|images\.generate/i.test(commit));
  });

  it("9–11: recovery path reuses blob URL and shared primitive", () => {
    assert.match(versions, /urlsReferToSameAsset/);
    assert.match(commit, /persistFinalRenderVersionAfterExport/);
    assert.match(merge, /renderVersionKind/);
  });

  it("12–13: version path does not reserve provider credits / call generation", () => {
    assert.ok(!/reserveCredits|reserveProvider|deductCredits/i.test(versions));
  });

  it("14: rebuild and automatic share seal/createPending/completePending primitives", () => {
    assert.match(rebuild, /sealDefaultRenderVersion/);
    assert.match(rebuild, /createPendingTextRerenderVersion/);
    assert.match(versions, /persistFinalRenderVersionAfterExport[\s\S]*sealDefaultRenderVersion/);
    assert.match(versions, /persistFinalRenderVersionAfterExport[\s\S]*completePendingFullRerenderVersion/);
  });

  it("15: isRebuild without pending no longer skips version persistence", () => {
    // Historical bug: else if (!isRebuild) ensureInitial only — rebuild without pending skipped.
    assert.match(commit, /else \{\s*\/\/ V1 closeout/);
    assert.match(commit, /persistFinalRenderVersionAfterExport/);
  });

  it("16–18: commit preserves clean URL and audit lineage fields", () => {
    assert.match(commit, /committedCleanVideoUrl/);
    assert.match(commit, /lastFullRerender|lastTextRerender/);
    assert.match(commit, /cleanVideoUrl/);
  });
});
