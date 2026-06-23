/**
 * Sprint CC10 — Character Consistency Score (0–100).
 */

import type {
  CharacterBlueprintAudit,
  CharacterConsistencyScore,
  CharacterConsistencyScoreBreakdown,
  CharacterDriftReport,
  CharacterPayloadCoverageReport,
  CharacterPromptCoverageReport,
} from "@/types/character-consistency-audit";
import type { ReferenceAnalysisProfile } from "@/types/editor-fusion-intelligence";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function computeAttributeCoverage(profiles: ReferenceAnalysisProfile[]): number {
  if (profiles.length === 0) return 0;
  let available = 0;
  let populated = 0;
  for (const profile of profiles) {
    const person = profile.personConsistency;
    if (!person) continue;
    const fields = [
      person.eyes,
      person.eyeColor,
      person.hairColor,
      person.glasses !== undefined,
      person.clothing.shirt,
      person.accessories.hat,
      person.styleDnaSummary,
    ];
    available += fields.length;
    populated += fields.filter(Boolean).length;
  }
  return available > 0 ? clamp((populated / available) * 100) : 0;
}

export function computeMascotCoverage(profiles: ReferenceAnalysisProfile[]): number {
  const mascotProfiles = profiles.filter(
    (p) => p.mascotConsistency && (p.objectType === "mascot" || (p.mascotConsistency.emblems.length ?? 0) > 0)
  );
  if (mascotProfiles.length === 0) return 100;
  const hits = mascotProfiles.filter(
    (p) =>
      p.mascotConsistency?.visualStyle ||
      (p.mascotConsistency?.emblems.length ?? 0) > 0 ||
      (p.mascotConsistency?.colorPalette.length ?? 0) > 0
  ).length;
  return clamp((hits / mascotProfiles.length) * 100);
}

export function computeClothingCoverage(profiles: ReferenceAnalysisProfile[]): number {
  const withClothing = profiles.filter((p) => {
    const c = p.personConsistency?.clothing;
    return c && Object.values(c).some(Boolean);
  });
  if (withClothing.length === 0) return profiles.length > 0 ? 50 : 0;
  return clamp((withClothing.length / profiles.length) * 100);
}

export function computeAccessoryCoverage(profiles: ReferenceAnalysisProfile[]): number {
  const withAccessories = profiles.filter((p) => {
    const a = p.personConsistency?.accessories;
    const items = p.personConsistency ? [...(p.enrichment?.accessoryItems ?? []), ...Object.values(a ?? {}).filter(Boolean)] : [];
    return items.length > 0;
  });
  if (withAccessories.length === 0) return profiles.length > 0 ? 50 : 0;
  return clamp((withAccessories.length / profiles.length) * 100);
}

export function computeCharacterConsistencyScore(input: {
  workflow: EditorFusionIntent;
  profiles: ReferenceAnalysisProfile[];
  promptCoverage: CharacterPromptCoverageReport;
  blueprintAudit: CharacterBlueprintAudit;
  payloadCoverage: CharacterPayloadCoverageReport;
  drift: CharacterDriftReport;
}): CharacterConsistencyScore {
  const breakdown: CharacterConsistencyScoreBreakdown = {
    attributeCoverage: computeAttributeCoverage(input.profiles),
    promptCoverage: clamp(input.promptCoverage.coveragePercent),
    blueprintCoverage: clamp(
      input.blueprintAudit.filledAttributes.length > 0
        ? (input.blueprintAudit.filledAttributes.length /
            Math.max(
              input.blueprintAudit.filledAttributes.length + input.blueprintAudit.missingAttributes.length,
              1
            )) *
            100
        : 0
    ),
    payloadCoverage: clamp(input.payloadCoverage.coveragePercent),
    mascotCoverage: computeMascotCoverage(input.profiles),
    clothingCoverage: computeClothingCoverage(input.profiles),
    accessoryCoverage: computeAccessoryCoverage(input.profiles),
  };

  const driftPenalty = input.drift.driftCount * 3;
  const characterConsistencyScore = clamp(
    breakdown.attributeCoverage * 0.2 +
      breakdown.promptCoverage * 0.25 +
      breakdown.blueprintCoverage * 0.15 +
      breakdown.payloadCoverage * 0.15 +
      breakdown.mascotCoverage * 0.1 +
      breakdown.clothingCoverage * 0.075 +
      breakdown.accessoryCoverage * 0.075 -
      driftPenalty
  );

  return {
    workflow: input.workflow,
    characterConsistencyScore,
    breakdown,
    generatedAt: new Date().toISOString(),
  };
}

export function buildCharacterConsistencyDiagnosticExport(
  score: CharacterConsistencyScore
): {
  workflow: EditorFusionIntent;
  attributeCoverage: number;
  promptCoverage: number;
  blueprintCoverage: number;
  payloadCoverage: number;
  mascotCoverage: number;
  clothingCoverage: number;
  accessoryCoverage: number;
  characterConsistencyScore: number;
  generatedAt: string;
} {
  return {
    workflow: score.workflow,
    attributeCoverage: score.breakdown.attributeCoverage,
    promptCoverage: score.breakdown.promptCoverage,
    blueprintCoverage: score.breakdown.blueprintCoverage,
    payloadCoverage: score.breakdown.payloadCoverage,
    mascotCoverage: score.breakdown.mascotCoverage,
    clothingCoverage: score.breakdown.clothingCoverage,
    accessoryCoverage: score.breakdown.accessoryCoverage,
    characterConsistencyScore: score.characterConsistencyScore,
    generatedAt: score.generatedAt,
  };
}
