#!/usr/bin/env npx tsx
/**
 * Before/after pricing rebalance report — observed COGS vs customer credits.
 * Usage: npx tsx scripts/studio-pricing-rebalance-report.ts
 */
import {
  buildStudioAnalysisPlan,
  buildStudioAnalysisPlanLegacy,
} from "../src/lib/studio-analysis-planner";
import { grossMarginAtWorstPack } from "../src/lib/studio-production-pricing-engine";
import { WORST_CASE_EUR_PER_CREDIT } from "../src/lib/studio-production-pricing-observed";

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

type Row = {
  length: string;
  type: string;
  scenes: number;
  batches: number;
  beforeCredits: number;
  afterCredits: number;
  cogsUsd: number;
  beforeRevenueEur: number;
  afterRevenueEur: number;
  beforeMarginPct: number;
  afterMarginPct: number;
};

const lengths = [
  { label: "15s", seconds: 15, photos: 4 },
  { label: "30s", seconds: 30, photos: 6 },
  { label: "60s", seconds: 60, photos: 12 },
  { label: "90s", seconds: 90, photos: 18 },
  { label: "3min", seconds: 180, photos: 36 },
  { label: "5min", seconds: 300, photos: 60 },
  { label: "10min", seconds: 600, photos: 120 },
];

function planPair(type: string, seconds: number, photos: number) {
  switch (type) {
    case "travel":
      return {
        legacy: buildStudioAnalysisPlanLegacy({ intent: "travel_vlog", photoCount: photos }),
        next: buildStudioAnalysisPlan({
          intent: "travel_vlog",
          photoCount: photos,
          targetDurationSeconds: seconds,
        }),
      };
    case "music":
      return {
        legacy: buildStudioAnalysisPlanLegacy({
          intent: "music_video",
          hasUploadedAudio: true,
          audioProfile: audioProfileForSeconds(seconds),
        }),
        next: buildStudioAnalysisPlan({
          intent: "music_video",
          hasUploadedAudio: true,
          audioProfile: audioProfileForSeconds(seconds),
        }),
      };
    case "commercial":
      return {
        legacy: buildStudioAnalysisPlanLegacy({
          intent: "product_commercial",
          targetDurationSeconds: seconds,
          hasCommercialUploads: true,
          logoCount: 1,
        }),
        next: buildStudioAnalysisPlan({
          intent: "product_commercial",
          targetDurationSeconds: seconds,
          hasCommercialUploads: true,
          logoCount: 1,
          productCount: 1,
        }),
      };
    case "character":
      return {
        legacy: buildStudioAnalysisPlanLegacy({
          intent: "product_commercial",
          targetDurationSeconds: seconds,
          characterId: "char-1",
          hasCommercialUploads: true,
        }),
        next: buildStudioAnalysisPlan({
          intent: "product_commercial",
          targetDurationSeconds: seconds,
          characterId: "char-1",
          hasCommercialUploads: true,
        }),
      };
    case "documentary":
      return {
        legacy: buildStudioAnalysisPlanLegacy({
          intent: "documentary",
          targetDurationSeconds: seconds,
        }),
        next: buildStudioAnalysisPlan({
          intent: "documentary",
          targetDurationSeconds: seconds,
        }),
      };
    case "presentation":
      return {
        legacy: buildStudioAnalysisPlanLegacy({
          intent: "presentation_video",
          targetDurationSeconds: seconds,
        }),
        next: buildStudioAnalysisPlan({
          intent: "presentation_video",
          targetDurationSeconds: seconds,
        }),
      };
    default:
      throw new Error(type);
  }
}

const rows: Row[] = [];
for (const len of lengths) {
  for (const type of ["travel", "music", "commercial", "character", "documentary", "presentation"]) {
    const { legacy, next } = planPair(type, len.seconds, len.photos);
    const cogs = next.pricingEstimate?.estimatedCogsUsd ?? 0;
    rows.push({
      length: len.label,
      type,
      scenes: next.sceneCount,
      batches: next.batchCount,
      beforeCredits: legacy.totalCredits,
      afterCredits: next.totalCredits,
      cogsUsd: cogs,
      beforeRevenueEur: legacy.totalCredits * WORST_CASE_EUR_PER_CREDIT,
      afterRevenueEur: next.totalCredits * WORST_CASE_EUR_PER_CREDIT,
      beforeMarginPct: grossMarginAtWorstPack(legacy.totalCredits, cogs) * 100,
      afterMarginPct: (next.pricingEstimate?.grossMarginAtWorstPack ?? 0) * 100,
    });
  }
}

console.log("\n=== HOMECHEFF STUDIO PRICING REBALANCE REPORT ===\n");
console.log(`Worst-case €/credit: €${WORST_CASE_EUR_PER_CREDIT.toFixed(5)}`);
console.log("Target gross margin: 65%\n");

console.log(
  "| Length | Type | Scenes | Batches | COGS USD | Before Cr | After Cr | Before Rev € | After Rev € | Before Margin | After Margin |"
);
console.log("|--------|------|--------|---------|----------|-----------|----------|--------------|-------------|---------------|--------------|");
for (const r of rows) {
  console.log(
    `| ${r.length} | ${r.type} | ${r.scenes} | ${r.batches} | $${r.cogsUsd.toFixed(2)} | ${r.beforeCredits} | ${r.afterCredits} | €${r.beforeRevenueEur.toFixed(2)} | €${r.afterRevenueEur.toFixed(2)} | ${r.beforeMarginPct.toFixed(0)}% | ${r.afterMarginPct.toFixed(0)}% |`
  );
}

const staging = {
  music12s: buildStudioAnalysisPlan({
    intent: "music_video",
    hasUploadedAudio: true,
    audioProfile: audioProfileForSeconds(12),
  }),
  travel4: buildStudioAnalysisPlan({ intent: "travel_vlog", photoCount: 4 }),
  commercial4: buildStudioAnalysisPlan({
    intent: "product_commercial",
    hasCommercialUploads: true,
    logoCount: 1,
    productCount: 1,
    targetDurationSeconds: 30,
  }),
};

console.log("\n=== STAGING PROOF PARITY ===\n");
for (const [name, plan] of Object.entries(staging)) {
  const cogs = plan.pricingEstimate?.estimatedCogsUsd ?? 0;
  console.log(
    `${name}: ${plan.totalCredits} credits, $${cogs.toFixed(2)} COGS, ${((plan.pricingEstimate?.grossMarginAtWorstPack ?? 0) * 100).toFixed(1)}% margin, ${plan.sceneCount} scenes`
  );
}

console.log("\n=== MIGRATION IMPACT ===");
console.log("- Existing users: next production quote uses scene/batch-based credits.");
console.log("- In-flight reservations: unchanged until new analyze/plan step.");
console.log("- Wallet balances: unchanged; per-production debit increases where COGS was underpriced.");
console.log("- Subscriptions: plan discounts still apply to new credit totals at checkout.\n");
