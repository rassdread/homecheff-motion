import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPremiumQualityGateSummary,
  DEEVID_ORCHESTRATION_LINE,
  VIDU_NEGATIVE_TEXT_SAFETY_LINE,
} from "@/lib/deevid-premium-polish";
import {
  buildSegmentJoinPlan,
  resolveSegmentJoinMode,
  transitionSecondsForJoinMode,
} from "@/lib/exact-frame-continuity";
import {
  computeExposureCorrectionFromLuminance,
  MAX_BRIGHTNESS_CORRECTION,
  MAX_CONTRAST_CORRECTION,
  MAX_SATURATION_CORRECTION,
} from "@/server/instant-premium/join-exposure-normalize";
import { buildCompactFacialActingLine, FACIAL_ANTI_PATTERN_LINE } from "@/lib/premium-facial-acting";
import { buildCompactViduMotionPrompt, VIDU_PROMPT_MAX_CHARS } from "@/lib/vidu-prompt-budget";
import { resolvePremiumPolishProfile } from "@/lib/premium-polish-settings";
import { buildPremiumRenderValidationReport } from "@/lib/premium-render-validation";
import type { InstantPremiumCreatePayload } from "@/server/instant-premium/create-instant-premium-project";

describe("deevid premium polish", () => {
  it("maps high similarity to direct_micro_stitch", () => {
    assert.equal(resolveSegmentJoinMode(0.999), "direct_micro_stitch");
    const plan = buildSegmentJoinPlan({
      segmentA: 0,
      segmentB: 1,
      score: { similarity: 0.999, mode: "continuation", reason: "test" },
      baseTransitionSec: 0.27,
    });
    assert.equal(plan.joinMode, "direct_micro_stitch");
    assert.ok(plan.transitionSec <= 1 / 30 + 0.001);
  });

  it("maps 0.996 similarity to optical_micro_blend", () => {
    assert.equal(resolveSegmentJoinMode(0.996), "optical_micro_blend");
    const sec = transitionSecondsForJoinMode(0.27, "optical_micro_blend");
    assert.ok(sec < 0.27);
  });

  it("clamps exposure correction within limits", () => {
    const c = computeExposureCorrectionFromLuminance(0.9, 0.2);
    assert.ok(c.shouldApply);
    assert.ok(Math.abs(c.brightness) <= MAX_BRIGHTNESS_CORRECTION);
    assert.ok(c.contrast >= 1 - MAX_CONTRAST_CORRECTION && c.contrast <= 1 + MAX_CONTRAST_CORRECTION);
    assert.ok(c.saturation >= 1 - MAX_SATURATION_CORRECTION && c.saturation <= 1 + MAX_SATURATION_CORRECTION);
  });

  it("negative line blocks fake text intent", () => {
    assert.match(VIDU_NEGATIVE_TEXT_SAFETY_LINE, /fake words/i);
    assert.match(VIDU_NEGATIVE_TEXT_SAFETY_LINE, /readable text/i);
  });

  it("micro-acting line stays compact", () => {
    const line = buildCompactFacialActingLine([
      { roleId: "CHEF_HOST", confidence: 0.9, label: "Chef" },
    ]);
    assert.ok(line.length < 420, `len ${line.length}`);
    assert.match(line, /Chef mascot/i);
    assert.ok(line.includes(FACIAL_ANTI_PATTERN_LINE));
  });

  it("orchestration line is compact", () => {
    assert.ok(DEEVID_ORCHESTRATION_LINE.length < 280);
    assert.match(DEEVID_ORCHESTRATION_LINE, /continuous comic world/i);
  });

  it("no-credit report includes joins text lock and roles", () => {
    const payload: InstantPremiumCreatePayload = {
      images: [
        { fileName: "a.jpg", previewUrl: "https://cdn.example.com/a.jpg" },
        { fileName: "a.jpg", previewUrl: "https://cdn.example.com/a.jpg" },
      ],
      stylePreset: "food_promo",
      duration: 8,
      aspectRatio: "9:16",
      textRenderMode: "poster_motion_preserve",
      posterMotionSettings: { version: 1, animationStyleId: "cartoon_animation" },
    };
    const report = buildPremiumRenderValidationReport({
      payload,
      viduPromptChars: 900,
      viduPromptOk: true,
    });
    assert.equal(report.segmentJoins.length, 1);
    assert.equal(report.segmentJoins[0]!.joinMode, "direct_micro_stitch");
    assert.ok(report.detectedRoles.length >= 0);
    assert.ok(report.microActingProfile.length > 0);
    assert.ok(report.qualityGates.promptWithinBudget);
  });

  it("compact motion prompt stays under budget", () => {
    const profile = resolvePremiumPolishProfile({
      version: 1,
      animationStyleId: "cartoon_animation",
    });
    const motion = buildCompactViduMotionPrompt(profile, {
      transitionOrder: 0,
      transitionTotal: 3,
      exactFrameContinuation: true,
      lockedTextRegionCount: 2,
    });
    assert.ok(motion.length <= VIDU_PROMPT_MAX_CHARS, `len ${motion.length}`);
    assert.match(motion, /Do not create new readable text/i);
    assert.match(motion, /continuous comic world/i);
  });

  it("quality gates fail when prompt too long", () => {
    const gates = buildPremiumQualityGateSummary({
      promptChars: 4000,
      promptOk: false,
      textLockBlock: false,
      textLockMode: "prompt_only",
      urlInvalid: false,
      imageCount: 3,
      transitionTotal: 2,
      detectedRoles: ["chef host"],
      segmentJoins: [],
    });
    assert.equal(gates.allPassed, false);
    assert.ok(gates.failedChecks.includes("prompt_length"));
  });
});
