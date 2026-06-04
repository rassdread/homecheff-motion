import { buildCorrectionRecommendations } from "@/lib/build-correction-recommendations";
import { buildVisionCorrectionRecommendations } from "@/lib/build-vision-correction-recommendations";
import { severityPriority } from "@/lib/studio-correction-severity";
import type { CorrectionRecommendation } from "@/types/studio-correction";
import type { SceneConsistencyReport } from "@/types/studio-consistency";
import type { VisionConsistencyReport } from "@/types/studio-vision-consistency";

function dedupeKey(rec: CorrectionRecommendation): string {
  return `${rec.type}:${rec.message}:${rec.promptPatch}`;
}

/** V12 prompt-memory + V13 vision recommendations for correction engine. */
export function buildCombinedCorrectionRecommendations(params: {
  consistencyReport: SceneConsistencyReport;
  visionReport?: VisionConsistencyReport | null;
  characterDriftRecommendations?: CorrectionRecommendation[];
}): CorrectionRecommendation[] {
  const fromPrompt = buildCorrectionRecommendations(params.consistencyReport);
  const fromVision = params.visionReport
    ? buildVisionCorrectionRecommendations(params.visionReport)
    : [];
  const fromCharacter = params.characterDriftRecommendations ?? [];

  const seen = new Set<string>();
  const merged: CorrectionRecommendation[] = [];

  for (const rec of [...fromCharacter, ...fromVision, ...fromPrompt]) {
    const key = dedupeKey(rec);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(rec);
  }

  return merged.sort(
    (a, b) => severityPriority(b.severity) - severityPriority(a.severity)
  );
}
