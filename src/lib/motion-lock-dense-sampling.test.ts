import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MOTION_LOCK_SAMPLE_POINTS,
  aggregateDenseMotionLockValidation,
  resolveSampleTimes,
  segmentVerdictFromSampleCounts,
  summarizeDenseSegmentSampling,
} from "@/lib/motion-lock-dense-sampling";
import type { MotionLockAssetValidation } from "@/types/motion-lock-layer";

function sampleResult(
  percent: number,
  verdict: MotionLockAssetValidation["validationResult"],
  confidence = 0.8
): MotionLockAssetValidation {
  return {
    assetId: "logo",
    validationResult: verdict,
    confidence,
    reason: "test",
    samplePercent: percent,
  };
}

describe("motion lock dense sampling (Sprint H)", () => {
  it("defines 11 sample points from 0% to 100%", () => {
    assert.equal(MOTION_LOCK_SAMPLE_POINTS.length, 11);
    assert.equal(MOTION_LOCK_SAMPLE_POINTS[0], 0);
    assert.equal(MOTION_LOCK_SAMPLE_POINTS[5], 0.5);
    assert.equal(MOTION_LOCK_SAMPLE_POINTS[10], 1);
  });

  it("PASS when all samples pass", () => {
    const results = MOTION_LOCK_SAMPLE_POINTS.map((p) => sampleResult(p, "PASS"));
    const summary = summarizeDenseSegmentSampling(results);
    assert.equal(summary.sampleCount, 11);
    assert.equal(summary.passCount, 11);
    assert.equal(summary.warnCount, 0);
    assert.equal(summary.failCount, 0);
    assert.equal(summary.segmentVerdict, "PASS");

    const aggregated = aggregateDenseMotionLockValidation(results);
    assert.equal(aggregated.passed, true);
    assert.equal(aggregated.enforcementRequired, false);
  });

  it("WARN when at least one warn and no fail", () => {
    const results = [
      ...MOTION_LOCK_SAMPLE_POINTS.slice(0, 10).map((p) => sampleResult(p, "PASS")),
      sampleResult(1, "WARN", 0.5),
    ];
    const summary = summarizeDenseSegmentSampling(results);
    assert.equal(summary.warnCount, 1);
    assert.equal(summary.failCount, 0);
    assert.equal(summary.segmentVerdict, "WARN");

    const aggregated = aggregateDenseMotionLockValidation(results);
    assert.equal(aggregated.passed, false);
    assert.equal(aggregated.enforcementRequired, false);
  });

  it("FAIL and enforcement when one sample fails", () => {
    const results = MOTION_LOCK_SAMPLE_POINTS.map((p) =>
      p === 0.9 ? sampleResult(p, "FAIL", 0.2) : sampleResult(p, "PASS")
    );
    const summary = summarizeDenseSegmentSampling(results);
    assert.equal(summary.passCount, 10);
    assert.equal(summary.failCount, 1);
    assert.equal(summary.segmentVerdict, "FAIL");

    const aggregated = aggregateDenseMotionLockValidation(results);
    assert.equal(aggregated.enforcementRequired, true);
    assert.deepEqual(aggregated.assetsMissing, ["logo"]);
  });

  it("segmentVerdictFromSampleCounts follows sprint H rules", () => {
    assert.equal(
      segmentVerdictFromSampleCounts({ passCount: 11, warnCount: 0, failCount: 0 }),
      "PASS"
    );
    assert.equal(
      segmentVerdictFromSampleCounts({ passCount: 10, warnCount: 1, failCount: 0 }),
      "WARN"
    );
    assert.equal(
      segmentVerdictFromSampleCounts({ passCount: 10, warnCount: 0, failCount: 1 }),
      "FAIL"
    );
  });

  it("resolveSampleTimes maps end sample to last frame", () => {
    const times = resolveSampleTimes(5, 30);
    assert.equal(times.length, 11);
    assert.equal(times[0], 0);
    assert.ok(Math.abs(times[5]! - 2.5) < 0.001);
    assert.ok(times[10]! < 5);
    assert.ok(times[10]! > 4.9);
  });

  it("dashboard sampling summary exposes worst confidence", () => {
    const results = [
      sampleResult(0, "PASS", 0.9),
      sampleResult(0.5, "WARN", 0.55),
      sampleResult(1, "PASS", 0.85),
    ];
    const summary = summarizeDenseSegmentSampling(results);
    assert.equal(summary.worstConfidence, 0.55);
  });
});
