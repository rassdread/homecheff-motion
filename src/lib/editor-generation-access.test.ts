import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateSuccessfulCreditDeduction,
  checkGenerationAccess,
  deductCreditsAfterSuccess,
  resolveEditorUserAccess,
} from "@/lib/editor-generation-gate";
import {
  estimateEditorGenerationCost,
  interpolateTransformationStrengths,
  lifeTimelineGenerationCount,
} from "@/lib/editor-generation-cost";
import {
  buildTransformationMotionHandoffQuery,
  editorTransformationMotionUrl,
} from "@/lib/editor-transformation-handoff";
import {
  buildTransformationStepPrompt,
  createTransformationSession,
  estimateTransformationUpscaleCredits,
  scoreTransformationSequenceConsistency,
} from "@/lib/editor-transformation-session";

describe("Editor generation cost", () => {
  it("single Future Self is ad eligible", () => {
    const cost = estimateEditorGenerationCost("how_will_i_look");
    assert.equal(cost.generationCount, 1);
    assert.equal(cost.adEligible, true);
    assert.equal(cost.premiumRequired, false);
  });

  it("Life Timeline with 6 ages is not ad eligible", () => {
    const cost = estimateEditorGenerationCost("life_timeline", {
      selectedAges: [25, 35, 45, 55, 65, 75],
    });
    assert.equal(cost.generationCount, 6);
    assert.equal(cost.adEligible, false);
    assert.equal(cost.premiumRequired, true);
    assert.equal(cost.creditCost, 50);
  });

  it("selected ages count determines credit cost", () => {
    assert.equal(lifeTimelineGenerationCount([25, 45]), 2);
    assert.equal(lifeTimelineGenerationCount([25]), 1);
  });

  it("Product Family 4 variants costs fusion intelligence render credits", () => {
    const cost = estimateEditorGenerationCost("product_family", {
      selectedVariants: ["premium", "luxury", "eco", "holiday"],
    });
    assert.equal(cost.generationCount, 4);
    assert.equal(cost.creditCost, 25);
    assert.equal(cost.premiumRequired, true);
  });

  it("A0 print upscale requires premium", () => {
    const cost = estimateEditorGenerationCost("export_print", {
      printPreset: "a0",
      upscaleMode: "safe",
    });
    assert.equal(cost.premiumRequired, true);
  });

  it("Maximum Detail upscale requires premium", () => {
    const cost = estimateEditorGenerationCost("export_upscale", {
      upscaleMode: "maximum_detail",
    });
    assert.equal(cost.premiumRequired, true);
  });
});

describe("Editor generation gate", () => {
  it("credits deducted only after success", () => {
    const deducted = calculateSuccessfulCreditDeduction({
      creditCost: 6,
      generationCount: 6,
      successfulOutputs: 6,
      failedOutputs: 0,
    });
    assert.equal(deducted, 6);
  });

  it("partial failure deducts only successful outputs", () => {
    const deducted = calculateSuccessfulCreditDeduction({
      creditCost: 6,
      generationCount: 6,
      successfulOutputs: 4,
      failedOutputs: 2,
    });
    assert.equal(deducted, 4);
  });

  it("free user blocked from premium-only flow", () => {
    const user = resolveEditorUserAccess({ role: "user", credits: 0, tier: "free" });
    const decision = checkGenerationAccess({
      user,
      workflow: "life_timeline",
      options: { selectedAges: [25, 35, 45, 55, 65, 75] },
    });
    assert.equal(decision.allowed, false);
    assert.equal(decision.blockedReason, "premium_required");
  });

  it("premium user allowed through", () => {
    const user = resolveEditorUserAccess({ role: "admin", billingFree: true });
    const decision = checkGenerationAccess({
      user,
      workflow: "life_timeline",
      options: { selectedAges: [25, 35, 45, 55, 65, 75] },
    });
    assert.equal(decision.allowed, true);
  });

  it("deductCreditsAfterSuccess reduces balance", () => {
    const user = resolveEditorUserAccess({ role: "user", credits: 5, tier: "free" });
    const next = deductCreditsAfterSuccess(user, 2);
    assert.equal(next.credits, 3);
  });
});

describe("Editor transformation session", () => {
  it("1-step transformation cost = 1", () => {
    const cost = estimateEditorGenerationCost("transformation_sequence", {
      outputMode: "sequence",
      stepCount: 1,
    });
    assert.equal(cost.generationCount, 1);
  });

  it("3-step transformation cost = 3", () => {
    const cost = estimateEditorGenerationCost("animal_fusion", {
      outputMode: "sequence",
      stepCount: 3,
    });
    assert.equal(cost.generationCount, 3);
  });

  it("6-step transformation premium required", () => {
    const cost = estimateEditorGenerationCost("human_into_mascot", {
      outputMode: "sequence",
      stepCount: 6,
    });
    assert.equal(cost.generationCount, 6);
    assert.equal(cost.premiumRequired, true);
  });

  it("transformation strengths interpolate correctly", () => {
    assert.deepEqual(interpolateTransformationStrengths(3), [0, 50, 100]);
    assert.deepEqual(interpolateTransformationStrengths(6), [0, 20, 40, 60, 80, 100]);
  });

  it("prompt builder includes step index and strength", () => {
    const session = createTransformationSession({
      type: "HUMAN_TO_MASCOT",
      sourceImageUrl: "https://example.com/person.png",
      stepCount: 3,
      targetDescription: "HomeCheff mascot",
    });
    const prompt = buildTransformationStepPrompt({
      session,
      step: session.steps[1]!,
    });
    assert.match(prompt, /Step 2 of 3/);
    assert.match(prompt, /50%/);
  });

  it("preserve rules included in every step", () => {
    const session = createTransformationSession({
      type: "FANTASY_CREATURE",
      sourceImageUrl: "https://example.com/wolf.png",
      stepCount: 4,
      targetDescription: "wolf-eagle hybrid",
    });
    for (const step of session.steps) {
      assert.match(step.instruction, /Preserve:/);
    }
  });

  it("motion handoff receives ordered step images", () => {
    const session = createTransformationSession({
      type: "MASCOT_TO_HUMAN",
      sourceImageUrl: "https://example.com/mascot.png",
      stepCount: 3,
      targetDescription: "realistic human",
    });
    session.steps[0]!.resultUrl = "https://example.com/step0.png";
    session.steps[1]!.resultUrl = "https://example.com/step1.png";
    const query = buildTransformationMotionHandoffQuery({
      session,
      editorSessionId: "sess_1",
    });
    assert.match(query, /stepImage0=/);
    assert.match(query, /stepImage1=/);
    assert.match(query, /transformationType=MASCOT_TO_HUMAN/);
    const url = editorTransformationMotionUrl({ session, editorSessionId: "sess_1" });
    assert.match(url, /\/animate\/instant\?/);
  });

  it("upscale final only costs one upscale unit", () => {
    const session = createTransformationSession({
      type: "OUTFIT_TRANSFORMATION",
      sourceImageUrl: "https://example.com/person.png",
      stepCount: 4,
    });
    session.upscaleMode = "final_only";
    assert.equal(estimateTransformationUpscaleCredits(session), 1);
  });

  it("upscale all steps costs stepCount upscale units", () => {
    const session = createTransformationSession({
      type: "OUTFIT_TRANSFORMATION",
      sourceImageUrl: "https://example.com/person.png",
      stepCount: 4,
    });
    session.upscaleMode = "all_steps";
    assert.equal(estimateTransformationUpscaleCredits(session), 4);
  });

  it("sequence consistency scoring runs", () => {
    const session = createTransformationSession({
      type: "AGE_TIMELINE",
      sourceImageUrl: "https://example.com/current.png",
      stepCount: 3,
    });
    session.steps[0]!.status = "completed";
    session.steps[0]!.resultUrl = "https://example.com/a.png";
    const score = scoreTransformationSequenceConsistency(session);
    assert.ok(score.overall >= 0);
    assert.ok(score.faceConsistency >= 0);
  });
});
