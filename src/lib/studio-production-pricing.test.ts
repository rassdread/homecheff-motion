import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildStudioAnalysisPlan,
  buildStudioAnalysisPlanLegacy,
} from "@/lib/studio-analysis-planner";
import { TARGET_GROSS_MARGIN } from "@/lib/studio-production-pricing-observed";
import { analyzeAudioBuffer } from "@/lib/studio-audio-analysis";

function audioProfileForSeconds(seconds: number) {
  return {
    durationSeconds: seconds,
    tempoBpm: 120,
    energyProfile: "medium" as const,
    sections: [
      { id: "intro", label: "Intro", startSeconds: 0, endSeconds: Math.max(1, Math.floor(seconds * 0.08)), energy: "low" as const },
      { id: "verse_1", label: "V1", startSeconds: Math.floor(seconds * 0.08), endSeconds: Math.floor(seconds * 0.25), energy: "medium" as const },
      { id: "chorus_1", label: "C1", startSeconds: Math.floor(seconds * 0.25), endSeconds: Math.floor(seconds * 0.38), energy: "peak" as const },
      { id: "verse_2", label: "V2", startSeconds: Math.floor(seconds * 0.38), endSeconds: Math.floor(seconds * 0.52), energy: "medium" as const },
      { id: "chorus_2", label: "C2", startSeconds: Math.floor(seconds * 0.52), endSeconds: Math.floor(seconds * 0.68), energy: "peak" as const },
      { id: "bridge", label: "Bridge", startSeconds: Math.floor(seconds * 0.68), endSeconds: Math.floor(seconds * 0.82), energy: "low" as const },
      { id: "finale", label: "Finale", startSeconds: Math.floor(seconds * 0.82), endSeconds: seconds, energy: "high" as const },
    ],
    silenceRegions: [],
    beatMarkers: [],
  };
}

function assertMinMargin(plan: ReturnType<typeof buildStudioAnalysisPlan>, label: string) {
  const cogs = plan.pricingEstimate?.estimatedCogsUsd ?? 0;
  const margin = plan.pricingEstimate?.grossMarginAtWorstPack ?? 0;
  assert.ok(
    margin >= TARGET_GROSS_MARGIN - 0.001,
    `${label}: margin ${(margin * 100).toFixed(1)}% below ${TARGET_GROSS_MARGIN * 100}% (credits=${plan.totalCredits}, cogs=$${cogs.toFixed(3)})`
  );
}

describe("studio-production-pricing-engine", () => {
  it("scales travel credits with photo count", () => {
    const short = buildStudioAnalysisPlan({ intent: "travel_vlog", photoCount: 4 });
    const long = buildStudioAnalysisPlan({ intent: "travel_vlog", photoCount: 40 });
    assert.ok(long.totalCredits > short.totalCredits);
    assert.ok(long.sceneCount > short.sceneCount);
  });

  it("music credits scale with audio duration", () => {
    const short = buildStudioAnalysisPlan({
      intent: "music_video",
      hasUploadedAudio: true,
      audioProfile: audioProfileForSeconds(30),
    });
    const long = buildStudioAnalysisPlan({
      intent: "music_video",
      hasUploadedAudio: true,
      audioProfile: audioProfileForSeconds(180),
    });
    assert.ok(long.totalCredits > short.totalCredits);
  });

  it("character analysis is free on cache hit", () => {
    const miss = buildStudioAnalysisPlan({
      intent: "product_commercial",
      characterId: "char-1",
      hasCommercialUploads: true,
    });
    const hit = buildStudioAnalysisPlan({
      intent: "product_commercial",
      characterId: "char-1",
      hasCommercialUploads: true,
      cachedAnalysisSources: ["character_studio", "asset_style_dna", "motion_identity_profile"],
      motionReadyCharacterIds: ["char-1"],
    });
    assert.ok(hit.totalCredits <= miss.totalCredits);
    assert.ok(hit.cachedAnalyses.length >= 1);
  });

  const lengths = [
    { label: "15s", seconds: 15, photos: 4 },
    { label: "30s", seconds: 30, photos: 6 },
    { label: "60s", seconds: 60, photos: 12 },
    { label: "90s", seconds: 90, photos: 18 },
    { label: "3min", seconds: 180, photos: 36 },
    { label: "5min", seconds: 300, photos: 60 },
    { label: "10min", seconds: 600, photos: 120 },
  ];

  for (const row of lengths) {
    it(`meets ${TARGET_GROSS_MARGIN * 100}% margin for travel ${row.label}`, () => {
      assertMinMargin(
        buildStudioAnalysisPlan({
          intent: "travel_vlog",
          photoCount: row.photos,
          targetDurationSeconds: row.seconds,
        }),
        `travel ${row.label}`
      );
    });

    it(`meets margin for music ${row.label}`, () => {
      assertMinMargin(
        buildStudioAnalysisPlan({
          intent: "music_video",
          hasUploadedAudio: true,
          audioProfile: audioProfileForSeconds(row.seconds),
        }),
        `music ${row.label}`
      );
    });

    it(`meets margin for commercial ${row.label}`, () => {
      assertMinMargin(
        buildStudioAnalysisPlan({
          intent: "product_commercial",
          targetDurationSeconds: row.seconds,
          hasCommercialUploads: true,
          logoCount: 1,
          productCount: 1,
        }),
        `commercial ${row.label}`
      );
    });

    it(`meets margin for character commercial ${row.label}`, () => {
      assertMinMargin(
        buildStudioAnalysisPlan({
          intent: "product_commercial",
          targetDurationSeconds: row.seconds,
          characterId: "char-1",
          hasCommercialUploads: true,
        }),
        `character ${row.label}`
      );
    });

    it(`meets margin for documentary ${row.label}`, () => {
      assertMinMargin(
        buildStudioAnalysisPlan({
          intent: "documentary",
          targetDurationSeconds: row.seconds,
        }),
        `documentary ${row.label}`
      );
    });

    it(`meets margin for presentation ${row.label}`, () => {
      assertMinMargin(
        buildStudioAnalysisPlan({
          intent: "presentation_video",
          targetDurationSeconds: row.seconds,
        }),
        `presentation ${row.label}`
      );
    });
  }

  it("matches staging music-video-small COGS order of magnitude", () => {
    const plan = buildStudioAnalysisPlan({
      intent: "music_video",
      hasUploadedAudio: true,
      audioProfile: audioProfileForSeconds(12),
    });
    const cogs = plan.pricingEstimate?.estimatedCogsUsd ?? 0;
    assert.ok(cogs >= 1.3 && cogs <= 2.0, `expected ~$1.4–1.9 COGS with finishing buffer, got $${cogs}`);
    assert.ok(plan.totalCredits >= 350, "music 12s should price above legacy 89 credits");
  });

  it("legacy travel pricing was flat across lengths", () => {
    const a = buildStudioAnalysisPlanLegacy({ intent: "travel_vlog", photoCount: 4 });
    const b = buildStudioAnalysisPlanLegacy({ intent: "travel_vlog", photoCount: 40 });
    assert.equal(a.totalCredits, b.totalCredits);
  });

  it("user cost lines hide provider names", () => {
    const plan = buildStudioAnalysisPlan({
      intent: "music_video",
      hasUploadedAudio: true,
      audioProfile: audioProfileForSeconds(30),
    });
    const keys = plan.userCostLines.map((l) => l.labelKey).join(" ");
    assert.ok(!keys.includes("openai"));
    assert.ok(!keys.includes("vidu"));
    assert.ok(keys.includes("studio.orchestrator.cost"));
  });

  it("exposes four user-facing steps max", () => {
    const plan = buildStudioAnalysisPlan({
      intent: "music_video",
      hasUploadedAudio: true,
      audioProfile: analyzeAudioBuffer({ buffer: Buffer.alloc(500_000), extension: "mp3" }),
    });
    assert.ok(plan.userCostLines.length <= 4);
    assert.ok(plan.totalCredits > 0);
  });
});
