import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateMotionAnalysisReadiness } from "@/lib/motion-analysis-readiness-gate";
import { enrichMotionReferencesWithCharacterAttach } from "@/lib/motion-character-reference-attach";
import { buildMotionQualityUserFeedback } from "@/lib/motion-quality-user-feedback";
import {
  buildMotionTransactionCorrelation,
  stampMotionTransactionProjectId,
} from "@/lib/motion-transaction-correlation";
import {
  motionTransactionIsReconciled,
  reconcileMotionTransaction,
} from "@/lib/motion-transaction-reconciliation";
import { createMotionWizardSession } from "@/lib/motion-wizard-pipeline";
import { buildMotionPresetTransactionPrice } from "@/lib/motion-preset-transaction-runner";
import { evaluateMotionPresetPipeline } from "@/lib/motion-preset-engine-orchestrator";
import { resolveMotionPresetStoryboard } from "@/lib/motion-preset-storyboards";
import { buildInstantStoryModePromptDetailed } from "@/lib/instant-premium-prompt";
import { motionPresetCombinedPromptBlock } from "@/lib/motion-preset-engine-orchestrator";
import { validateMotionPreflightAnalysisGate } from "@/server/instant-premium/motion-preflight-analysis-gate";
import type { MotionComplexityEstimate } from "@/types/motion-preset-engine";

const baseEstimate: MotionComplexityEstimate = {
  referenceCount: 1,
  cachedAnalysisCount: 0,
  uncachedAnalysisCount: 1,
  requiredAnalysisPasses: 1,
  analysisCached: false,
  estimatedAnalysisCredits: 2,
  estimatedRenderCredits: 8,
  estimatedTotalCredits: 10,
  complexityTier: "standard",
  workloadFaceCount: 1,
  workloadMascotCount: 0,
  workloadProductCount: 0,
  averageIdentityConfidence: 72,
};

describe("motion production hardening", () => {
  it("blocks render when premium analysis is pending", () => {
    const result = validateMotionAnalysisReadiness({
      hasActionPreset: true,
      complexityEstimate: baseEstimate,
      premiumAnalysisComplete: false,
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.reason, "premium_pending");
    }
  });

  it("allows render when analysis is cached", () => {
    const result = validateMotionAnalysisReadiness({
      hasActionPreset: true,
      complexityEstimate: { ...baseEstimate, analysisCached: true, requiredAnalysisPasses: 0 },
      premiumAnalysisComplete: false,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.reason, "cached");
    }
  });

  it("server preflight gate rejects incomplete premium analysis", () => {
    const snapshot = evaluateMotionPresetPipeline({
      presetId: "moonwalk",
      references: [{ id: "a", fileName: "selfie.jpg" }],
      imageCount: 1,
      instantMode: "transition",
      transitionSeconds: 5,
      premiumAnalysisComplete: false,
    });
    const gate = validateMotionPreflightAnalysisGate({
      images: [],
      instantMode: "transition",
      instantTransitionSeconds: 5,
      instantSceneTexts: [],
      stylePreset: "cinematic",
      duration: 5,
      aspectRatio: "9:16",
      selectedChips: [],
      continuityStrength: "medium",
      lockedTextMode: false,
      textRenderMode: "poster_motion_preserve",
      hybridOverlayStyle: "soft_glow",
      posterMotionSettings: {
        version: 1,
        hcActionPreset: {
          actionPresetId: "moonwalk",
          engineSnapshot: snapshot,
        },
      },
    });
    assert.equal(gate.ok, false);
  });

  it("builds and stamps motion transaction correlation", () => {
    const snapshot = evaluateMotionPresetPipeline({
      presetId: "moonwalk",
      references: [{ id: "a", fileName: "selfie.jpg" }],
      imageCount: 1,
      instantMode: "transition",
      transitionSeconds: 5,
      premiumAnalysisComplete: true,
    });
    const price = buildMotionPresetTransactionPrice(snapshot.complexityEstimate);
    const session = createMotionWizardSession({ workflowKind: "action_preset", price });
    const correlation = buildMotionTransactionCorrelation({
      session,
      price,
      snapshot,
      premiumAnalysisComplete: true,
    });
    assert.equal(correlation.premiumAnalysisComplete, true);
    assert.ok(correlation.billingCorrelationId.startsWith("motion_"));
    const stamped = stampMotionTransactionProjectId(correlation, "proj_123");
    assert.equal(stamped.projectId, "proj_123");
    assert.equal(stamped.renderId, "proj_123");
  });

  it("reconciles incomplete analysis before render", () => {
    const issues = reconcileMotionTransaction({
      correlation: {
        version: 1,
        motionWizardSessionId: "txn_1",
        transactionId: "txn_1",
        billingCorrelationId: "motion_txn_1",
        workflowKind: "action_preset",
        analysisIds: [],
        state: "ANALYSIS",
        reservedAt: new Date().toISOString(),
        premiumAnalysisComplete: false,
        cachedAnalysesUsed: 0,
        analysisCredits: 2,
        renderCredits: 8,
        totalCredits: 10,
      },
      renderStarted: true,
    });
    assert.equal(motionTransactionIsReconciled(issues), false);
    assert.ok(issues.some((i) => i.code === "analysis_incomplete"));
  });

  it("auto-attaches motion-ready character metadata to references", () => {
    const enriched = enrichMotionReferencesWithCharacterAttach({
      references: [{ id: "ref1", fileName: "hero.png", imageUrl: "https://cdn.example/hero.png" }],
      attachContext: {
        source: "motion_ready",
        assetId: "char_1",
        assetName: "Brand Hero",
        motionReady: true,
        appearanceMemory: "blue jacket, warm smile",
        visualKeywords: "friendly mascot chef",
        isMascot: false,
      },
    });
    assert.equal(enriched[0]?.motionReady, true);
    assert.ok(enriched[0]?.visionAnalysis);
    assert.ok(enriched[0]?.styleDna);
  });

  it("builds human-friendly quality feedback", () => {
    const feedback = buildMotionQualityUserFeedback({
      qualityScore: {
        overall: 82,
        identityConfidence: 85,
        faceVisibility: 80,
        bodyVisibility: 70,
        mascotConsistency: 0,
        productQuality: 0,
        logoQuality: 0,
        styleDnaStrength: 75,
        renderSuitability: 78,
        environmentMatch: 70,
        presetMatch: 80,
      },
      analysisCached: true,
    });
    assert.equal(feedback.identityMessageKey, "motionEngine.feedback.identity.recognizable");
    assert.ok(feedback.tips.includes("motionEngine.feedback.tip.cachedCharacter"));
  });

  it("priority presets include directed storyboards", () => {
    for (const presetId of ["moonwalk", "penalty_kick", "red_carpet_moment", "podcast_clip"] as const) {
      const board = resolveMotionPresetStoryboard(presetId);
      assert.ok(board, `missing storyboard for ${presetId}`);
      assert.ok(board!.scenes.length >= 4, `${presetId} needs scene progression`);
      assert.ok(board!.structuredPromptBlock.includes("PRESET STORYBOARD"));
    }
  });

  it("story mode and transition mode share identity prompt injection", () => {
    const snapshot = evaluateMotionPresetPipeline({
      presetId: "moonwalk",
      references: [{ id: "a", fileName: "selfie.jpg" }],
      imageCount: 1,
      instantMode: "story",
      transitionSeconds: 5,
      sceneTextCount: 3,
      premiumAnalysisComplete: true,
    });
    const identityBlock = motionPresetCombinedPromptBlock(snapshot);
    const story = buildInstantStoryModePromptDetailed({
      imageCount: 3,
      transitionSeconds: 5,
      sceneTexts: [
        { heroText: "Scene one", title: "", subtitle: "", heroFinaleText: "" },
        { heroText: "Scene two", title: "", subtitle: "", heroFinaleText: "" },
        { heroText: "Scene three", title: "", subtitle: "", heroFinaleText: "" },
      ],
      stylePreset: "cinematic",
      motionIdentityPromptBlock: identityBlock,
    });
    assert.ok(story.prompt.includes("MOTION IDENTITY LOCK") || identityBlock.length > 0);
    assert.ok(story.prompt.includes(identityBlock.split("\n")[0] ?? identityBlock));
  });
});
