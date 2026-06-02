import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  isReadableFinalArtifactProbe,
  resolveFinalArtifactPathnames,
  type FinalArtifactProbe,
} from "./sync-final-video-artifacts";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("resolveFinalArtifactPathnames uses standard motion/final paths", () => {
  assert.deepEqual(resolveFinalArtifactPathnames("proj-1", 0), {
    finalPathname: "motion/final/proj-1/final.mp4",
    cleanPathname: "motion/final/proj-1/clean.mp4",
  });
  assert.deepEqual(resolveFinalArtifactPathnames("proj-1", 2), {
    finalPathname: "motion/final/proj-1/final-v2.mp4",
    cleanPathname: "motion/final/proj-1/clean-v2.mp4",
  });
});

function probe(overrides: Partial<FinalArtifactProbe>): FinalArtifactProbe {
  return {
    kind: "final",
    pathname: "motion/final/p/final.mp4",
    url: "https://blob.example/final.mp4",
    blobExists: true,
    contentLength: 1024,
    mimeType: "video/mp4",
    durationSec: 10,
    readable: true,
    probeNotes: [],
    ...overrides,
  };
}

test("isReadableFinalArtifactProbe rejects missing or tiny blobs", () => {
  assert.equal(isReadableFinalArtifactProbe(probe({})), true);
  assert.equal(isReadableFinalArtifactProbe(probe({ blobExists: false })), false);
  assert.equal(isReadableFinalArtifactProbe(probe({ url: null })), false);
  assert.equal(isReadableFinalArtifactProbe(probe({ contentLength: 0 })), false);
  assert.equal(isReadableFinalArtifactProbe(probe({ contentLength: null })), false);
  assert.equal(isReadableFinalArtifactProbe(probe({ mimeType: "text/html" })), false);
});

test("sync module exports syncFinalVideoArtifactsFromBlob", () => {
  const src = readFileSync(join(__dirname, "sync-final-video-artifacts.ts"), "utf8");
  assert.match(src, /export async function syncFinalVideoArtifactsFromBlob/);
  assert.match(src, /instantCleanFinalVideoUrl/);
  assert.match(src, /outputVideoUrl: finalUrl/);
  assert.doesNotMatch(src, /from ["']@\/server\/video-providers\/vidu/);
  assert.doesNotMatch(src, /mergeInstantPremiumProject/);
});
