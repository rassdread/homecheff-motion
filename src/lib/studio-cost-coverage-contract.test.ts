import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStudioAnalysisPlan } from "@/lib/studio-analysis-planner";
import { STUDIO_PROVIDER_COST_INVENTORY } from "@/lib/studio-provider-cost-inventory";
import { buildUniqueAssetLearningPlan } from "@/lib/studio-unique-asset-learning";
import { buildVideoPlanContract, buildPostProductionContract } from "@/lib/studio-video-plan-contract";
import { contractCoversAction } from "@/types/studio-video-plan-contract";
import { validateProductionTransactionForAction } from "@/server/studio/production-transaction-validator";

describe("studio-provider-cost-inventory", () => {
  it("lists all major provider categories", () => {
    const providers = new Set(STUDIO_PROVIDER_COST_INVENTORY.map((e) => e.provider));
    assert.ok(providers.has("openai"));
    assert.ok(providers.has("vidu"));
    assert.ok(providers.has("elevenlabs"));
    assert.ok(providers.has("ffmpeg"));
    assert.ok(providers.has("vercel_blob"));
    assert.ok(STUDIO_PROVIDER_COST_INVENTORY.length >= 15);
  });
});

describe("unique-asset-learning", () => {
  it("analyzes all photos but bills one character profile", () => {
    const plan = buildUniqueAssetLearningPlan({ photoCount: 20, characterCount: 1 });
    assert.equal(plan.totalImagesToAnalyze, 20);
    assert.ok(plan.totalUniqueProfilesBillable <= 2);
    assert.ok(plan.totalUniqueProfilesBillable >= 1);
  });

  it("zeroes profile billing on cache hit", () => {
    const plan = buildUniqueAssetLearningPlan({
      photoCount: 20,
      cachedAnalysisSources: ["character_studio", "motion_ready", "asset_style_dna"],
      cached: { styleDna: true, characterProfile: true, motionReady: true },
    });
    assert.equal(plan.totalUniqueProfilesBillable, 0);
  });
});

describe("video-plan-contract", () => {
  it("builds four-phase plan for travel", () => {
    const contract = buildVideoPlanContract({
      intent: "travel_vlog",
      photoCount: 4,
    });
    assert.ok(contract.totalCredits > 0);
    assert.ok(contract.phases.some((p) => p.id === "learning"));
    assert.ok(contract.phases.some((p) => p.id === "rendering"));
    assert.ok(contract.phases.some((p) => p.id === "finishing"));
    assert.ok(contract.grossMarginAtWorstPack >= 0.65);
  });

  it("includes finishing export in initial production", () => {
    const contract = buildVideoPlanContract({ intent: "travel_vlog", photoCount: 4 });
    assert.ok(contract.allowedActions.includes("publish_mp4_export"));
    assert.ok(contract.lineItems.some((i) => i.id === "finish_export"));
  });

  it("builds post-production contracts separately", () => {
    const post = buildPostProductionContract({
      hcProjectId: "proj-1",
      intent: "travel_vlog",
      action: "translation",
    });
    assert.equal(post.kind, "post_production");
    assert.ok(post.totalCredits > 0);
    assert.ok(contractCoversAction(post, "translation_export"));
  });
});

describe("buildStudioAnalysisPlan contract integration", () => {
  it("attaches videoPlanContract to analysis plan", () => {
    const plan = buildStudioAnalysisPlan({ intent: "travel_vlog", photoCount: 4 });
    assert.ok(plan.videoPlanContract);
    assert.equal(plan.videoPlanContract!.totalCredits, plan.totalCredits);
    assert.ok((plan.pricingEstimate?.grossMarginAtWorstPack ?? 0) >= 0.65);
  });
});

describe("production-transaction-validator", () => {
  it("rejects forged transaction without project", async () => {
    const result = await validateProductionTransactionForAction({
      userId: "user-1",
      productionTransactionId: "swf_fake",
      actionType: "motion_render",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "PRODUCTION_TX_REQUIRED");
    }
  });
});
