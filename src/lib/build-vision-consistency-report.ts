import { analyzeBrandingConsistency } from "@/lib/analyze-branding-vision-consistency";
import { analyzeCharacterVisionConsistency } from "@/lib/analyze-character-vision-consistency";
import { analyzeLocationVisionConsistency } from "@/lib/analyze-location-vision-consistency";
import { analyzePropVisionConsistency } from "@/lib/analyze-prop-vision-consistency";
import { analyzeWorldVisionConsistency } from "@/lib/analyze-world-vision-consistency";
import { scoreToConsistencyStatus } from "@/lib/studio-consistency-status";
import type { SceneConsistencyMemoryInput } from "@/types/studio-consistency";
import type { VisionConsistencyReport } from "@/types/studio-vision-consistency";
import type { StudioVisionRawAnalysis } from "@/server/studio-vision-providers/types";

function averageScores(scores: number[]): number {
  if (scores.length === 0) {
    return 100;
  }
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function buildVisionConsistencyReport(params: {
  raw: StudioVisionRawAnalysis;
  memory: SceneConsistencyMemoryInput;
}): VisionConsistencyReport {
  const { raw, memory } = params;
  const analyzedAt = new Date().toISOString();

  const characterResults = memory.characters.map((character) => {
    const signal =
      raw.characters.find((c) => c.characterId === character.id) ??
      raw.characters.find((c) => c.name === character.name) ?? {
        characterId: character.id,
        name: character.name,
        present: false,
        clothingVisible: false,
        accessoriesVisible: false,
        mascotProportionsOk: false,
        detectedTraits: [],
        missingTraits: [],
        notes: "",
      };
    const ref = Boolean(character.referenceImageUrl?.trim());
    return analyzeCharacterVisionConsistency({
      character,
      signal,
      referenceCompared: ref && raw.referenceComparisonUsed,
    });
  });

  const locationResult = memory.location
    ? analyzeLocationVisionConsistency({
        location: memory.location,
        signal: raw.location ?? {
          environmentElements: [],
          visualIdentityMatch: false,
          worldCharacteristicsMatch: false,
          missingElements: [],
          notes: "",
        },
        referenceCompared:
          Boolean(memory.location.referenceImageUrl?.trim()) &&
          raw.referenceComparisonUsed,
      })
    : null;

  const propResults = memory.props.map((prop) => {
    const signal =
      raw.props.find((p) => p.propId === prop.id) ??
      raw.props.find((p) => p.name === prop.name) ?? {
        propId: prop.id,
        name: prop.name,
        visible: false,
        brandingVisible: false,
        detectedTraits: [],
        missingTraits: [],
        notes: "",
      };
    return analyzePropVisionConsistency({
      prop,
      signal,
      referenceCompared:
        Boolean(prop.referenceImageUrl?.trim()) && raw.referenceComparisonUsed,
    });
  });

  const brandingResult = analyzeBrandingConsistency(raw.branding);

  const worldResult = memory.world
    ? analyzeWorldVisionConsistency({
        world: memory.world,
        signal: raw.world ?? {
          styleMatch: false,
          toneMatch: false,
          colorLanguageMatch: false,
          detectedElements: [],
          missingElements: [],
          notes: "",
        },
      })
    : null;

  const characterVisionScore = averageScores(characterResults.map((c) => c.score));
  const locationVisionScore = locationResult?.score ?? 100;
  const propVisionScore = averageScores(propResults.map((p) => p.score));
  const brandingVisionScore = brandingResult.score;
  const worldVisionScore = worldResult?.score ?? 100;

  const categoryScores = [
    characterVisionScore,
    locationVisionScore,
    propVisionScore,
    brandingVisionScore,
    worldVisionScore,
  ].filter((s) => Number.isFinite(s));

  const overallVisionScore = averageScores(categoryScores);

  const visionWarnings = [
    ...characterResults.flatMap((c) => c.warnings),
    ...(locationResult?.warnings ?? []),
    ...propResults.flatMap((p) => p.warnings),
    ...brandingResult.warnings,
    ...(worldResult?.warnings ?? []),
  ];
  const visionRecommendations = [
    ...characterResults.flatMap((c) => c.recommendations),
    ...(locationResult?.recommendations ?? []),
    ...propResults.flatMap((p) => p.recommendations),
    ...brandingResult.recommendations,
    ...(worldResult?.recommendations ?? []),
    ...(raw.summary ? [raw.summary] : []),
  ];

  const detectedElements = [
    ...new Set([...raw.detectedElements, ...characterResults.flatMap((c) => c.detectedElements)]),
  ];

  return {
    analyzedAt,
    overallVisionScore,
    visionStatus: scoreToConsistencyStatus(overallVisionScore),
    characterVisionScore,
    locationVisionScore,
    propVisionScore,
    brandingVisionScore,
    worldVisionScore,
    visionWarnings: [...new Set(visionWarnings)],
    visionRecommendations: [...new Set(visionRecommendations)],
    detectedElements,
    characterResults,
    locationResult,
    propResults,
    brandingResult,
    worldResult,
    providerId: raw.providerId,
    analysisMethod: raw.analysisMethod,
    referenceComparisonUsed: raw.referenceComparisonUsed,
  };
}
