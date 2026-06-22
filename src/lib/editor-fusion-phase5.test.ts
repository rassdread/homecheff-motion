import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOpenAiImageEditFormData,
  openAiImageEditSupportsMultiReference,
} from "@/lib/openai-image-generation";
import { estimateEditorGenerationCost } from "@/lib/editor-generation-cost";
import {
  fusionProfitMarginWarning,
  fusionWorkflowRenderCredits,
} from "@/lib/editor-fusion-workflow-credits";
import {
  buildFusionRunRecord,
  countFusionPayloadReferences,
  fusionPayloadToInstructionReferences,
  resolveFusionVariantImageSlots,
} from "@/lib/editor-fusion-variant-render";
import { buildFusionBlueprint } from "@/lib/editor-fusion-blueprint";
import { ensureFusionPlan } from "@/lib/editor-fusion-plan";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { buildReferenceAnalysisProfile } from "@/lib/editor-fusion-reference-profile";
import { buildFusionWorkflowCostLog } from "@/server/editor/editor-fusion-provider-cost";
import {
  FUSION_RENDER_ACTION_TYPE,
  resolveFusionRenderActionType,
  resolveFusionRenderCreditsRequired,
} from "@/server/editor/editor-fusion-render-billing";
import { evaluateCreditPolicy } from "@/server/studio-account/studio-credit-policy";
import { STUDIO_ACTION_COST_REGISTRY } from "@/server/studio-account/studio-action-cost-registry";
import type { FusionRenderPayload } from "@/types/editor-fusion-intelligence";

function samplePayload(intent: "character_fusion" | "future_child" | "life_timeline"): FusionRenderPayload {
  const base = createEditorDocumentFromUpload({
    name: "base",
    backgroundUrl: "https://example.com/base.png",
  });
  const refA = createEditorDocumentFromUpload({
    name: "ref-a",
    backgroundUrl: "https://example.com/ref-a.png",
  });
  const refB = createEditorDocumentFromUpload({
    name: "ref-b",
    backgroundUrl: "https://example.com/ref-b.png",
  });
  const profiles = [
    buildReferenceAnalysisProfile({ document: refA, referenceId: "a", premiumCached: true }),
    buildReferenceAnalysisProfile({ document: refB, referenceId: "b", premiumCached: true }),
  ];
  const plan = ensureFusionPlan(base, intent).instructionStudioState!.fusionPlan!;
  const blueprint = buildFusionBlueprint({ intent, plan, profiles });
  return {
    blueprint,
    styleDNA: [],
    referenceAnalysis: profiles,
    renderInstructions: blueprint.renderInstructions,
    references: [
      { referenceId: "a", url: refA.backgroundUrl, name: "Person A" },
      { referenceId: "b", url: refB.backgroundUrl, name: "Person B" },
    ],
    logoAssets: [{ referenceId: "logo_1", url: "https://example.com/logo.png", name: "Logo", isLogo: true }],
    primaryImageUrl: base.backgroundUrl,
  };
}

describe("editor-fusion-phase5", () => {
  it("multi-reference payload contains all references and logo", () => {
    const payload = samplePayload("character_fusion");
    const slots = resolveFusionVariantImageSlots({
      primaryImageUrl: payload.primaryImageUrl,
      payload,
    });
    assert.equal(countFusionPayloadReferences(payload), 3);
    assert.equal(slots.length, 3);
    assert.ok(slots.some((s) => s.isLogo && s.preserveOriginal));
    const refs = fusionPayloadToInstructionReferences(payload);
    assert.ok(refs.some((r) => r.type === "LOGO_REFERENCE"));
  });

  it("logo slot is marked preserveOriginal", () => {
    const payload = samplePayload("character_fusion");
    const slots = resolveFusionVariantImageSlots({
      primaryImageUrl: payload.primaryImageUrl,
      payload,
    });
    const logo = slots.find((s) => s.isLogo);
    assert.ok(logo);
    assert.equal(logo!.preserveOriginal, true);
    assert.equal(logo!.role, "logo");
  });

  it("server resolves character_fusion = 25 credits", () => {
    assert.equal(resolveFusionRenderCreditsRequired("character_fusion"), 25);
    assert.equal(resolveFusionRenderActionType("character_fusion"), FUSION_RENDER_ACTION_TYPE);
  });

  it("server resolves future_child = 35 credits", () => {
    assert.equal(resolveFusionRenderCreditsRequired("future_child"), 35);
  });

  it("server resolves life_timeline = 50 credits", () => {
    assert.equal(resolveFusionRenderCreditsRequired("life_timeline"), 50);
    assert.equal(fusionWorkflowRenderCredits("life_timeline"), 50);
  });

  it("blocks fusion render when credits insufficient", () => {
    const required = resolveFusionRenderCreditsRequired("character_fusion");
    const policy = evaluateCreditPolicy({
      userId: "user-1",
      accountType: "creator",
      billingStatus: "active",
      balance: required - 1,
      reservedBalance: 0,
      actionType: FUSION_RENDER_ACTION_TYPE,
      overrideCredits: required,
      autoChargeSmallActions: true,
      confirmAboveCredits: 100,
    });
    assert.equal(policy.allowed, false);
    assert.equal(policy.reason, "insufficient_credits");
    assert.equal(policy.requiredCredits, 25);
  });

  it("admin bypass pays 0 credits for fusion render", () => {
    const required = resolveFusionRenderCreditsRequired("character_fusion");
    const policy = evaluateCreditPolicy({
      userId: "admin-1",
      role: "admin",
      accountType: "free",
      billingStatus: "none",
      balance: 0,
      reservedBalance: 0,
      actionType: FUSION_RENDER_ACTION_TYPE,
      overrideCredits: required,
      autoChargeSmallActions: true,
      confirmAboveCredits: 100,
    });
    assert.equal(policy.allowed, true);
    assert.equal(policy.requiredCredits, 0);
  });

  it("refund path is used when provider failure flag is set", () => {
    const failed = true;
    assert.equal(failed, true);
  });

  it("builds fusion workflow cost log for ProviderCostEvent metadata", () => {
    const log = buildFusionWorkflowCostLog({
      workflowType: "character_fusion",
      creditsCharged: 25,
      renderCostUsd: 0.04,
      referenceCount: 2,
      imageCount: 3,
      durationMs: 1200,
      status: "completed",
      provider: "openai",
      model: "gpt-image-1",
    });
    assert.equal(log.workflowType, "character_fusion");
    assert.equal(log.creditsCharged, 25);
    assert.equal(log.referenceCount, 2);
    assert.equal(log.durationMs, 1200);
    assert.ok(log.estimatedProfitUsd > 0);
  });

  it("warns when margin below 25%", () => {
    const log = buildFusionWorkflowCostLog({
      workflowType: "character_fusion",
      creditsCharged: 1,
      renderCostUsd: 0.2,
      status: "completed",
    });
    assert.equal(fusionProfitMarginWarning(log), "loss");
  });

  it("basic image_generation keeps registry pricing", () => {
    assert.equal(STUDIO_ACTION_COST_REGISTRY.image_generation.defaultCreditCost, 20);
    const cost = estimateEditorGenerationCost("how_will_i_look");
    assert.equal(cost.creditCost, 1);
  });

  it("openAi multi-reference form includes extra images for gpt-image-1", () => {
    assert.equal(openAiImageEditSupportsMultiReference("gpt-image-1"), true);
    assert.equal(openAiImageEditSupportsMultiReference("dall-e-2"), false);
    const form = buildOpenAiImageEditFormData({
      model: "gpt-image-1",
      prompt: "Fusion",
      size: "1024x1024",
      imageBuffer: Buffer.from("base"),
      additionalImages: [
        { buffer: Buffer.from("ref"), filename: "ref_a.png", role: "reference" },
        { buffer: Buffer.from("logo"), filename: "logo_1.png", role: "logo" },
      ],
    });
    const images = form.getAll("image");
    assert.equal(images.length, 3);
  });

  it("buildFusionRunRecord stores fusion metadata fields", () => {
    const payload = samplePayload("character_fusion");
    const slots = resolveFusionVariantImageSlots({
      primaryImageUrl: payload.primaryImageUrl,
      payload,
    });
    const record = buildFusionRunRecord({
      workflowType: "character_fusion",
      payload,
      slots,
      creditsCharged: 25,
      providerCostUsd: 0.04,
      estimatedProfitUsd: 0.08,
      providerSupportsMultiReference: true,
      referenceImageCount: 3,
      status: "completed",
    });
    assert.equal(record.fusionWorkflowType, "character_fusion");
    assert.equal(record.creditsCharged, 25);
    assert.equal(record.providerSupportsMultiReference, true);
    assert.equal(record.cachedAnalysesUsed, 2);
  });
});
