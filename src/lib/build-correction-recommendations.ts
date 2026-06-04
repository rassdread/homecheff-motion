import { scoreToCorrectionSeverity, severityPriority } from "@/lib/studio-correction-severity";
import type {
  CorrectionRecommendation,
  CorrectionRecommendationType,
  CorrectionSeverity,
} from "@/types/studio-correction";
import type { SceneConsistencyReport } from "@/types/studio-consistency";

function makeId(prefix: string, index: number): string {
  return `${prefix}-${index}`;
}

function inferPatchFromText(text: string): string {
  const trimmed = text.trim();
  if (/reinforce/i.test(trimmed)) {
    const afterColon = trimmed.split(":").slice(1).join(":").trim();
    return afterColon || trimmed;
  }
  return trimmed;
}

function addRecommendation(
  list: CorrectionRecommendation[],
  params: {
    type: CorrectionRecommendationType;
    severity: CorrectionSeverity;
    message: string;
    promptPatch: string;
    source: string;
  }
): void {
  const promptPatch = params.promptPatch.trim();
  if (!promptPatch) {
    return;
  }
  list.push({
    id: makeId(params.type, list.length),
    type: params.type,
    severity: params.severity,
    message: params.message,
    promptPatch,
    source: params.source,
  });
}

export function buildCorrectionRecommendations(
  report: SceneConsistencyReport
): CorrectionRecommendation[] {
  const recommendations: CorrectionRecommendation[] = [];

  for (const character of report.characterResults) {
    const severity = scoreToCorrectionSeverity(character.score);
    for (const warning of character.warnings) {
      const patch =
        character.recommendations.find((r) =>
          warning.toLowerCase().includes(character.name.toLowerCase())
        ) ?? character.recommendations[0];
      addRecommendation(recommendations, {
        type: "MissingCharacterTrait",
        severity: mergeCharacterSeverity(severity, warning),
        message: warning,
        promptPatch: patch ? inferPatchFromText(patch) : `Maintain ${character.name} identity clearly visible`,
        source: `character:${character.characterId}`,
      });
    }
    if (character.score < 80 && character.warnings.length === 0) {
      addRecommendation(recommendations, {
        type: "MissingCharacterTrait",
        severity: scoreToCorrectionSeverity(character.score),
        message: `${character.name} consistency below target (${character.score})`,
        promptPatch: `Reinforce ${character.name} visual identity with strong consistency`,
        source: `character:${character.characterId}`,
      });
    }
  }

  if (report.locationResult) {
    const loc = report.locationResult;
    const severity = scoreToCorrectionSeverity(loc.score);
    for (const warning of loc.warnings) {
      const patch = loc.recommendations[0];
      addRecommendation(recommendations, {
        type: "WeakLocationIdentity",
        severity,
        message: warning,
        promptPatch: patch ? inferPatchFromText(patch) : "Maintain consistent location environment",
        source: "location",
      });
    }
  }

  for (const prop of report.propResults) {
    const severity = scoreToCorrectionSeverity(prop.score);
    for (const warning of prop.warnings) {
      const patch = prop.recommendations[0];
      const isBranding = /logo|brand|globe/i.test(warning);
      addRecommendation(recommendations, {
        type: isBranding ? "MissingPropBranding" : "GeneralContinuity",
        severity: isBranding ? mergeSeverityForBranding(severity) : severity,
        message: warning,
        promptPatch: patch ? inferPatchFromText(patch) : `Keep ${prop.name} visually consistent`,
        source: `prop:${prop.propId}`,
      });
    }
  }

  if (report.worldResult) {
    const world = report.worldResult;
    const severity = scoreToCorrectionSeverity(world.score);
    for (const warning of world.warnings) {
      const patch = world.recommendations[0];
      addRecommendation(recommendations, {
        type: "WorldStyleMismatch",
        severity,
        message: warning,
        promptPatch: patch ? inferPatchFromText(patch) : "Match established world visual style",
        source: "world",
      });
    }
  }

  if (report.overallScore < 75) {
    addRecommendation(recommendations, {
      type: "LowConsistencyScore",
      severity: scoreToCorrectionSeverity(report.overallScore),
      message: `Overall consistency score ${report.overallScore} needs improvement`,
      promptPatch:
        "Strengthen visual continuity across characters, location, props and world identity",
      source: "consistency:overall",
    });
  }

  for (const rec of report.recommendations) {
    if (recommendations.some((r) => r.message === rec)) {
      continue;
    }
    addRecommendation(recommendations, {
      type: "GeneralContinuity",
      severity: "medium",
      message: rec,
      promptPatch: inferPatchFromText(rec),
      source: "consistency:recommendation",
    });
  }

  return recommendations.sort(
    (a, b) => severityPriority(b.severity) - severityPriority(a.severity)
  );
}

function mergeCharacterSeverity(
  base: CorrectionSeverity,
  warning: string
): CorrectionSeverity {
  if (/mascot|identity|wrong/i.test(warning)) {
    return "critical";
  }
  if (/hat|apron|clothing/i.test(warning)) {
    return mergeSeverityForBranding(base);
  }
  return base;
}

function mergeSeverityForBranding(severity: CorrectionSeverity): CorrectionSeverity {
  if (severity === "low") {
    return "medium";
  }
  return severity;
}
