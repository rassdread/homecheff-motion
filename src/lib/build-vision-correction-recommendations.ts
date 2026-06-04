import { scoreToCorrectionSeverity } from "@/lib/studio-correction-severity";
import type {
  CorrectionRecommendation,
  CorrectionRecommendationType,
} from "@/types/studio-correction";
import type { VisionConsistencyReport } from "@/types/studio-vision-consistency";

function makeId(prefix: string, index: number): string {
  return `vision-${prefix}-${index}`;
}

function add(
  list: CorrectionRecommendation[],
  params: {
    type: CorrectionRecommendationType;
    severity: ReturnType<typeof scoreToCorrectionSeverity>;
    message: string;
    promptPatch: string;
    source: string;
  }
): void {
  const patch = params.promptPatch.trim();
  if (!patch) {
    return;
  }
  list.push({
    id: makeId(params.type, list.length),
    type: params.type,
    severity: params.severity,
    message: params.message,
    promptPatch: patch,
    source: params.source,
  });
}

/** Maps V13 vision findings into V12 correction recommendation shape. */
export function buildVisionCorrectionRecommendations(
  report: VisionConsistencyReport
): CorrectionRecommendation[] {
  const recommendations: CorrectionRecommendation[] = [];

  for (const character of report.characterResults) {
    for (const warning of character.warnings) {
      const rec = character.recommendations[0];
      add(recommendations, {
        type: "MissingCharacterTrait",
        severity: scoreToCorrectionSeverity(character.score),
        message: `[Vision] ${warning}`,
        promptPatch: rec ?? `Reinforce ${character.name} visual identity`,
        source: `vision:character:${character.characterId}`,
      });
    }
  }

  if (report.locationResult) {
    for (const warning of report.locationResult.warnings) {
      add(recommendations, {
        type: "WeakLocationIdentity",
        severity: scoreToCorrectionSeverity(report.locationResult.score),
        message: `[Vision] ${warning}`,
        promptPatch:
          report.locationResult.recommendations[0] ??
          "Maintain consistent location environment",
        source: "vision:location",
      });
    }
  }

  for (const prop of report.propResults) {
    for (const warning of prop.warnings) {
      const isBranding = /logo|brand|homecheff/i.test(warning);
      add(recommendations, {
        type: isBranding ? "MissingPropBranding" : "GeneralContinuity",
        severity: scoreToCorrectionSeverity(prop.score),
        message: `[Vision] ${warning}`,
        promptPatch: prop.recommendations[0] ?? `Keep ${prop.name} clearly visible`,
        source: `vision:prop:${prop.propId}`,
      });
    }
  }

  for (const warning of report.brandingResult.warnings) {
    add(recommendations, {
      type: "MissingPropBranding",
      severity: scoreToCorrectionSeverity(report.brandingResult.score),
      message: `[Vision] ${warning}`,
      promptPatch:
        report.brandingResult.recommendations[0] ??
        "Reinforce HomeCheff globe logo placement",
      source: "vision:branding",
    });
  }

  if (report.worldResult) {
    for (const warning of report.worldResult.warnings) {
      add(recommendations, {
        type: "WorldStyleMismatch",
        severity: scoreToCorrectionSeverity(report.worldResult.score),
        message: `[Vision] ${warning}`,
        promptPatch:
          report.worldResult.recommendations[0] ?? "Match established world visual style",
        source: "vision:world",
      });
    }
  }

  if (report.overallVisionScore < 75) {
    add(recommendations, {
      type: "LowConsistencyScore",
      severity: scoreToCorrectionSeverity(report.overallVisionScore),
      message: `[Vision] Overall visual score ${report.overallVisionScore} needs improvement`,
      promptPatch:
        "Strengthen visual continuity: character identity, location, props, branding and world style",
      source: "vision:overall",
    });
  }

  return recommendations;
}
