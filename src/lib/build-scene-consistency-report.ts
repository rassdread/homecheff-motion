import { analyzeCharacterConsistency } from "@/lib/analyze-character-consistency";
import { analyzeLocationConsistency } from "@/lib/analyze-location-consistency";
import { analyzePropConsistency } from "@/lib/analyze-prop-consistency";
import { analyzeWorldConsistency } from "@/lib/analyze-world-consistency";
import { scoreToConsistencyStatus } from "@/lib/studio-consistency-status";
import type {
  ConsistencyAnalysis,
  SceneConsistencyMemoryInput,
  SceneConsistencyReport,
  SceneImageConsistencyInput,
} from "@/types/studio-consistency";

function averageScores(scores: number[], fallback = 100): number {
  if (scores.length === 0) {
    return fallback;
  }
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function buildDriftWarnings(
  characterResults: SceneConsistencyReport["characterResults"],
  locationResult: SceneConsistencyReport["locationResult"],
  propResults: SceneConsistencyReport["propResults"],
  worldResult: SceneConsistencyReport["worldResult"]
): string[] {
  const lines: string[] = [];
  for (const c of characterResults) {
    if (c.score < 75) {
      lines.push(`${c.name} appearance changed`);
    }
    for (const w of c.warnings) {
      if (w.includes("apron") || w.includes("hat") || w.includes("clothing")) {
        lines.push(w.replace(/ missing$/i, " changed"));
      }
    }
  }
  if (locationResult && locationResult.score < 75) {
    lines.push("Environment inconsistent with location memory");
  }
  for (const p of propResults) {
    if (p.score < 70) {
      lines.push(`${p.name} branding inconsistent`);
    }
    for (const w of p.warnings) {
      if (w.includes("logo")) {
        lines.push(`${p.name} missing logo`);
      }
    }
  }
  if (worldResult && worldResult.score < 75) {
    lines.push("World visual style drift detected");
  }
  return [...new Set(lines)];
}

export function buildSceneConsistencyReport(params: {
  sceneImage: SceneImageConsistencyInput;
  memory: SceneConsistencyMemoryInput;
}): SceneConsistencyReport {
  const characterResults = params.memory.characters.map((c) =>
    analyzeCharacterConsistency(c, params.sceneImage)
  );
  const locationResult = params.memory.location
    ? analyzeLocationConsistency(params.memory.location, params.sceneImage)
    : null;
  const propResults = params.memory.props.map((p) =>
    analyzePropConsistency(p, params.sceneImage)
  );
  const worldResult = params.memory.world
    ? analyzeWorldConsistency(params.memory.world, params.sceneImage)
    : null;

  const characterScore = averageScores(characterResults.map((r) => r.score), 100);
  const locationScore = locationResult?.score ?? 100;
  const propScore = averageScores(propResults.map((r) => r.score), 100);
  const worldScore = worldResult?.score ?? 100;

  const weights: { score: number; weight: number }[] = [
    { score: characterScore, weight: params.memory.characters.length > 0 ? 0.4 : 0 },
    { score: locationScore, weight: params.memory.location ? 0.25 : 0 },
    { score: propScore, weight: params.memory.props.length > 0 ? 0.2 : 0 },
    { score: worldScore, weight: params.memory.world ? 0.15 : 0 },
  ];
  const active = weights.filter((w) => w.weight > 0);
  const weightSum = active.reduce((s, w) => s + w.weight, 0) || 1;
  const overallScore = Math.round(
    active.reduce((s, w) => s + w.score * w.weight, 0) / weightSum
  );

  const warnings = [
    ...characterResults.flatMap((r) => r.warnings),
    ...(locationResult?.warnings ?? []),
    ...propResults.flatMap((r) => r.warnings),
    ...(worldResult?.warnings ?? []),
  ];

  const recommendations = [
    ...characterResults.flatMap((r) => r.recommendations),
    ...(locationResult?.recommendations ?? []),
    ...propResults.flatMap((r) => r.recommendations),
    ...(worldResult?.recommendations ?? []),
  ];

  const driftWarnings = buildDriftWarnings(
    characterResults,
    locationResult,
    propResults,
    worldResult
  );

  const analysis: ConsistencyAnalysis = {
    characterScore,
    locationScore,
    propScore,
    worldScore,
    overallScore,
    driftWarnings,
  };

  return {
    analyzedAt: new Date().toISOString(),
    overallScore,
    consistencyStatus: scoreToConsistencyStatus(overallScore),
    analysis,
    characterResults,
    locationResult,
    propResults,
    worldResult,
    warnings,
    recommendations: [...new Set(recommendations)],
    memoryReferences: {
      characters: params.memory.characters.map((c) => ({ id: c.id, name: c.name })),
      location: params.memory.location
        ? { id: params.memory.location.id, name: params.memory.location.name }
        : null,
      props: params.memory.props.map((p) => ({ id: p.id, name: p.name })),
      world: params.memory.world
        ? { id: params.memory.world.id, name: params.memory.world.name }
        : null,
    },
    analysisMethod: "prompt_memory_alignment",
  };
}
