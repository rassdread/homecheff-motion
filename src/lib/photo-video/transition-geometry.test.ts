import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sampleTransition, type TransitionSample } from "@/lib/photo-video/transition-geometry";
import {
  PHOTO_VIDEO_SIGNATURE_TRANSITIONS,
  PHOTO_VIDEO_STANDARD_TRANSITIONS,
  hashTransitionSeed,
  type PhotoVideoResolvedTransition,
} from "@/lib/photo-video/transition-kind";

const KINDS: PhotoVideoResolvedTransition[] = [
  ...PHOTO_VIDEO_STANDARD_TRANSITIONS,
  ...PHOTO_VIDEO_SIGNATURE_TRANSITIONS,
];
const PROGRESS = [0, 0.25, 0.5, 0.75, 1] as const;

function assertFiniteSample(sample: TransitionSample) {
  assert.equal(Number.isFinite(sample.progress), true);
  assert.equal(Number.isFinite(sample.incomingAlpha), true);
  assert.equal(Number.isFinite(sample.outgoingAlpha), true);
  assert.equal(Number.isFinite(sample.incomingOffsetX), true);
  assert.equal(Number.isFinite(sample.incomingOffsetY), true);
  assert.equal(Number.isFinite(sample.incomingScale), true);
  assert.equal(Number.isFinite(sample.outgoingOffsetX), true);
  assert.equal(Number.isFinite(sample.outgoingScale), true);
  assert.equal(Number.isFinite(sample.outgoingRotate), true);
  assert.ok(sample.incomingAlpha >= 0 && sample.incomingAlpha <= 1);
  assert.ok(sample.outgoingAlpha >= 0 && sample.outgoingAlpha <= 1);
  assert.ok(sample.incomingScale > 0 && sample.outgoingScale > 0);
}

function incomingShown(sample: TransitionSample): boolean {
  if (sample.incomingAlpha > 0.01) return true;
  if (sample.incomingClip.type !== "none") return true;
  return Math.abs(sample.incomingOffsetX) < 1 && sample.progress >= 1;
}

function outgoingShown(sample: TransitionSample): boolean {
  if (sample.outgoingAlpha > 0.01) return true;
  if (sample.outgoingClip.type === "polygons" && sample.outgoingClip.polygons.length > 0) return true;
  return sample.progress <= 0;
}

describe("PX.4A.6.4 transition geometry", () => {
  for (const kind of KINDS) {
    it(`${kind} is deterministic and valid at sampled progress`, () => {
      const seed = hashTransitionSeed("p0", "p1", "0");
      for (const progress of PROGRESS) {
        const a = sampleTransition(kind, progress, 720, 1280, seed);
        const b = sampleTransition(kind, progress, 720, 1280, seed);
        assert.equal(JSON.stringify(a), JSON.stringify(b));
        assert.equal(a.kind, kind);
        assertFiniteSample(a);
        if (progress === 0) {
          assert.ok(a.incomingAlpha < 0.01);
          assert.ok(outgoingShown(a));
        }
        if (progress === 1) {
          assert.ok(a.incomingAlpha > 0.99);
          assert.ok(a.outgoingAlpha < 0.01);
        }
        if (progress === 0.5 && kind !== "cut") {
          assert.ok(incomingShown(a), `${kind} incoming at 0.5`);
          assert.ok(outgoingShown(a) || a.incomingAlpha > 0.2, `${kind} outgoing at 0.5`);
        }
      }
    });
  }

  it("standard and signature kinds stay visually distinct at mid progress", () => {
    const seed = 42;
    const mid = KINDS.map((kind) => JSON.stringify(sampleTransition(kind, 0.5, 1080, 1080, seed)));
    assert.equal(new Set(mid).size, KINDS.length);
  });

  it("signature geometry remains finite for 9:16, 1:1, and 16:9", () => {
    const sizes = [
      [720, 1280],
      [1080, 1080],
      [1920, 1080],
    ] as const;
    for (const kind of PHOTO_VIDEO_SIGNATURE_TRANSITIONS) {
      for (const [w, h] of sizes) {
        const sample = sampleTransition(kind, 0.5, w, h, 7);
        assertFiniteSample(sample);
        assert.ok(incomingShown(sample));
      }
    }
  });
});
