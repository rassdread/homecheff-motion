import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildProductionProviderReport,
  validateElevenLabsProductionEnv,
  validateOpenAiProductionEnv,
} from "@/lib/studio-production-providers";
import {
  buildProductionCostBreakdown,
  estimateImageCount,
  formatCostEur,
} from "@/lib/studio-production-costs";
import {
  buildAssetReadiness,
  buildProductionWarnings,
} from "@/lib/studio-production-readiness";
import {
  buildProductionCenterReport,
  buildProductionChecklist,
  formatProductionSummaryText,
} from "@/lib/studio-production-center";
import {
  buildProductionScoreReport,
  computeOverallProductionScore,
  resolveProductionQualityLabel,
} from "@/lib/studio-production-score";
import type { StudioSceneDetail, StudioStoryboardDetail } from "@/types/studio-api";

function scene(order: number): StudioSceneDetail {
  return {
    id: `scene-${order}`,
    storyboardId: "sb-1",
    order,
    title: `Scene ${order + 1}`,
    description: "Team works in a modern office with natural light.",
    action: "Presenter explains the product vision.",
    emotion: "optimistic",
    camera: "medium_shot",
    shotType: "medium",
    cameraMovement: "static",
    sceneEnergy: "neutral",
    transitionToNext: "",
    durationSeconds: 5,
    locationId: "loc-1",
    location: {
      id: "loc-1",
      ownerId: "u1",
      name: "Rotterdam Office",
      slug: "rotterdam",
      category: "office",
      description: "",
      referenceImageUrl: "",
      worldMemory: "",
      visualIdentity: "",
      environmentKeywords: "daylight",
      continuityNotes: "",
      continuityStrength: "strong",
      worldProfileId: null,
      worldProfile: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    characters: [
      {
        id: "c1",
        ownerId: "u1",
        name: "Sergio",
        slug: "sergio",
        role: "lead",
        description: "",
        personality: "",
        referenceImageUrl: "",
        isMascot: false,
        appearanceMemory: "",
        personalityMemory: "",
        continuityNotes: "",
        defaultClothing: "business casual",
        defaultAccessories: "",
        visualKeywords: "",
        primaryReferenceImageId: null,
        referenceNotes: "",
        identityStrength: "strong",
        continuityStrength: "strong",
        worldProfileId: null,
        worldProfile: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    props: [],
    selectedSceneImageId: null,
    sceneImages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function storyboard(scenes: StudioSceneDetail[], extra?: Partial<StudioStoryboardDetail>): StudioStoryboardDetail {
  return {
    id: "sb-1",
    ownerId: "u1",
    title: "Production Test",
    description: "A short brand story for validation.",
    promptStyleProfile: "commercial",
    directorProfile: "commercial",
    aiDirectorPrompt: "Premium commercial tone",
    aiDirectorStyleStrength: "balanced",
    voiceEnabled: true,
    voiceLanguage: "en",
    voiceStyle: "warm",
    voiceProfile: "warm_narrator",
    narrationMode: "narrator",
    voiceNarrationScript: "",
    autoSelectImprovedImage: true,
    sceneCount: scenes.length,
    scenes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...extra,
  };
}

describe("studio-production-center", () => {
  it("validateOpenAiProductionEnv detects missing API key", () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const status = validateOpenAiProductionEnv();
    assert.equal(status.status, "missing_api_key");
    if (prev !== undefined) {
      process.env.OPENAI_API_KEY = prev;
    }
  });

  it("buildProductionCostBreakdown estimates image, voice, and video costs", () => {
    const sb = storyboard([scene(0), scene(1)]);
    const costs = buildProductionCostBreakdown({
      storyboard: sb,
      voiceDurationSeconds: 42,
      voiceScriptCharacters: 400,
    });
    assert.equal(estimateImageCount(sb), 2);
    assert.ok(costs.totalCostEur > 0);
    assert.ok(formatCostEur(costs.totalCostEur).startsWith("€"));
  });

  it("buildProductionWarnings flags missing narration when voice enabled", () => {
    const warnings = buildProductionWarnings(storyboard([scene(0), scene(1)]));
    assert.ok(warnings.some((w) => w.code === "missing_narration"));
  });

  it("buildAssetReadiness returns eight readiness categories including audio production", () => {
    const assets = buildAssetReadiness(storyboard([scene(0), scene(1)]));
    assert.equal(assets.length, 8);
    assert.ok(assets.some((a) => a.id === "story"));
    assert.ok(assets.some((a) => a.id === "voice"));
    assert.ok(assets.some((a) => a.id === "music"));
    assert.ok(assets.some((a) => a.id === "sound"));
    assert.ok(assets.some((a) => a.id === "audio_production"));
  });

  it("computeOverallProductionScore blends five score dimensions", () => {
    const score = computeOverallProductionScore({
      storyScore: 80,
      directorScore: 75,
      voiceScore: 70,
      visualScore: 85,
      readinessScore: 78,
      voiceEnabled: true,
    });
    assert.ok(score >= 50 && score <= 100);
  });

  it("resolveProductionQualityLabel maps score to production ready", () => {
    const label = resolveProductionQualityLabel(88, 0);
    assert.equal(label.label, "production_ready");
  });

  it("buildProductionChecklist includes nine checklist items including audio mix plan", () => {
    const checklist = buildProductionChecklist(storyboard([scene(0), scene(1)]));
    assert.equal(checklist.length, 9);
    assert.ok(checklist.some((c) => c.id === "shot_plan"));
    assert.ok(checklist.some((c) => c.id === "music_plan"));
    assert.ok(checklist.some((c) => c.id === "sound_plan"));
    assert.ok(checklist.some((c) => c.id === "audio_mix_plan"));
  });

  it("buildProductionCenterReport produces exportable summary", () => {
    const sb = storyboard([scene(0), scene(1)]);
    const report = buildProductionCenterReport({
      storyboard: sb,
      providers: buildProductionProviderReport(),
    });
    assert.ok(report.scores.overallProductionScore >= 0);
    assert.ok(report.summary.lines.length >= 5);
    const text = formatProductionSummaryText(report.summary);
    assert.match(text, /Production Test/);
    assert.match(text, /Estimated cost/);
  });

  it("buildProductionScoreReport includes readinessScore", () => {
    const scores = buildProductionScoreReport(storyboard([scene(0), scene(1)]));
    assert.ok(typeof scores.readinessScore === "number");
    assert.ok(scores.qualityLabelKey.length > 0);
  });

  it("validateElevenLabsProductionEnv without key returns missing_api_key", () => {
    const prev = process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_API_KEY;
    assert.equal(validateElevenLabsProductionEnv().status, "missing_api_key");
    if (prev !== undefined) {
      process.env.ELEVENLABS_API_KEY = prev;
    }
  });
});
