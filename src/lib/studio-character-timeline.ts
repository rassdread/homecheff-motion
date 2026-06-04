import { buildCharacterDriftCorrectionRecommendations } from "@/lib/build-character-drift-corrections";
import { computeCharacterIdentityScore } from "@/lib/compute-character-identity-score";
import { detectCharacterDrift } from "@/lib/detect-character-drift";
import { buildCharacterIdentityDriftPromptLines } from "@/lib/studio-character-identity-prompt";
import { scoreToCharacterIdentityStatus } from "@/lib/studio-character-identity-status";
import { toCharacterMemorySnapshot } from "@/lib/studio-memory-mappers";
import { parseSceneConsistencyReport } from "@/lib/studio-consistency-report-parse";
import { parseVisionConsistencyReport } from "@/lib/studio-vision-report-parse";
import type {
  CharacterIdentityTimeline,
  CharacterIdentityTimelineEntry,
  SceneCharacterIdentityScore,
  StoryboardCharacterConsistencyReport,
} from "@/types/studio-character-consistency";
import type { CorrectionRecommendation } from "@/types/studio-correction";
import type { StudioStoryboardDetail } from "@/types/studio-api";
import type { Prisma } from "@prisma/client";
import type { CharacterMemorySnapshot } from "@/types/studio-memory-snapshots";

export type StoryboardCharacterConsistencySceneInput = {
  sceneId: string;
  sceneTitle: string;
  order: number;
  imageId: string | null;
  characters: Array<{
    id: string;
    name: string;
    role: string;
    description: string;
    personality: string;
    referenceImageUrl: string;
    appearanceMemory: string;
    personalityMemory: string;
    continuityNotes: string;
    defaultClothing: string;
    defaultAccessories: string;
    visualKeywords: string;
    primaryReferenceImageId: string | null;
    referenceNotes: string;
    identityStrength: string;
    continuityStrength: string;
    worldProfileId: string | null;
    worldProfile?: { id: string; name: string } | null;
  }>;
  consistencyReportJson: Prisma.JsonValue | null;
  visionReportJson: Prisma.JsonValue | null;
};

function characterSnapshotFromSceneChar(
  row: StoryboardCharacterConsistencySceneInput["characters"][number]
): CharacterMemorySnapshot {
  return toCharacterMemorySnapshot({
    id: row.id,
    name: row.name,
    role: row.role,
    description: row.description,
    personality: row.personality,
    referenceImageUrl: row.referenceImageUrl,
    appearanceMemory: row.appearanceMemory,
    personalityMemory: row.personalityMemory,
    continuityNotes: row.continuityNotes,
    defaultClothing: row.defaultClothing,
    defaultAccessories: row.defaultAccessories,
    visualKeywords: row.visualKeywords,
    primaryReferenceImageId: row.primaryReferenceImageId,
    referenceNotes: row.referenceNotes,
    identityStrength: row.identityStrength,
    continuityStrength: row.continuityStrength,
    worldProfileId: row.worldProfileId,
    worldProfile: row.worldProfile
      ? {
          id: row.worldProfile.id,
          name: row.worldProfile.name,
          description: "",
          visualStyle: "",
          tone: "",
          continuityRules: "",
          continuityStrength: row.continuityStrength,
        }
      : null,
  });
}

function buildTimelineEntry(
  scene: StoryboardCharacterConsistencySceneInput,
  identity: ReturnType<typeof computeCharacterIdentityScore>,
  avgForCharacter: number | null
): CharacterIdentityTimelineEntry {
  const driftFlag =
    typeof identity.score === "number" &&
    avgForCharacter !== null &&
    identity.score < avgForCharacter - 15;

  return {
    sceneId: scene.sceneId,
    sceneTitle: scene.sceneTitle,
    order: scene.order,
    imageId: scene.imageId,
    score: identity.score,
    status: identity.status,
    warnings: identity.warnings,
    driftFlag,
  };
}

export function storyboardDetailToCharacterConsistencyScenes(
  storyboard: StudioStoryboardDetail
): StoryboardCharacterConsistencySceneInput[] {
  return storyboard.scenes.map((scene) => {
    const pick =
      scene.sceneImages.find((img) => img.id === scene.selectedSceneImageId) ??
      scene.sceneImages.find((img) => img.status === "completed");
    return {
      sceneId: scene.id,
      sceneTitle: scene.title,
      order: scene.order,
      imageId: pick?.id ?? null,
      characters: scene.characters.map((ch) => ({
        id: ch.id,
        name: ch.name,
        role: ch.role,
        description: ch.description,
        personality: ch.personality,
        referenceImageUrl: ch.referenceImageUrl,
        appearanceMemory: ch.appearanceMemory,
        personalityMemory: ch.personalityMemory,
        continuityNotes: ch.continuityNotes,
        defaultClothing: ch.defaultClothing,
        defaultAccessories: ch.defaultAccessories,
        visualKeywords: ch.visualKeywords,
        primaryReferenceImageId: ch.primaryReferenceImageId,
        referenceNotes: ch.referenceNotes,
        identityStrength: ch.identityStrength,
        continuityStrength: ch.continuityStrength,
        worldProfileId: ch.worldProfileId,
        worldProfile: ch.worldProfile,
      })),
      consistencyReportJson: pick?.consistencyReport ?? null,
      visionReportJson: pick?.visionReport ?? null,
    };
  });
}

/** Build V17 report from API storyboard detail (client-safe). */
export function buildCharacterReportFromStoryboardDetail(
  storyboard: StudioStoryboardDetail
): ReturnType<typeof buildStoryboardCharacterConsistencyReport> {
  return buildStoryboardCharacterConsistencyReport({
    storyboardId: storyboard.id,
    scenes: storyboardDetailToCharacterConsistencyScenes(storyboard),
  });
}

/** Prompt Builder / scene image generation: stronger identity when drift detected. */
export function buildCharacterIdentityDriftLinesForStoryboard(
  storyboard: StudioStoryboardDetail
): string[] {
  const report = buildCharacterReportFromStoryboardDetail(storyboard);
  return buildCharacterIdentityDriftPromptLines(report.characterTimelines);
}

/** V12 correction engine: storyboard-level character drift patches. */
export function buildCharacterDriftCorrectionRecommendationsForStoryboard(
  storyboard: StudioStoryboardDetail
): CorrectionRecommendation[] {
  const report = buildCharacterReportFromStoryboardDetail(storyboard);
  const characters = new Map<string, ReturnType<typeof toCharacterMemorySnapshot>>();
  for (const scene of storyboard.scenes) {
    for (const ch of scene.characters) {
      if (!characters.has(ch.id)) {
        characters.set(
          ch.id,
          toCharacterMemorySnapshot({
            id: ch.id,
            name: ch.name,
            role: ch.role,
            description: ch.description,
            personality: ch.personality,
            referenceImageUrl: ch.referenceImageUrl,
            appearanceMemory: ch.appearanceMemory,
            personalityMemory: ch.personalityMemory,
            continuityNotes: ch.continuityNotes,
            defaultClothing: ch.defaultClothing,
            defaultAccessories: ch.defaultAccessories,
            visualKeywords: ch.visualKeywords,
            primaryReferenceImageId: ch.primaryReferenceImageId,
            referenceNotes: ch.referenceNotes,
            identityStrength: ch.identityStrength,
            continuityStrength: ch.continuityStrength,
            worldProfileId: ch.worldProfileId,
            worldProfile: ch.worldProfile
              ? {
                  id: ch.worldProfile.id,
                  name: ch.worldProfile.name,
                  description: "",
                  visualStyle: "",
                  tone: "",
                  continuityRules: "",
                  continuityStrength: ch.continuityStrength,
                }
              : null,
          })
        );
      }
    }
  }
  return buildCharacterDriftCorrectionRecommendations({
    driftWarnings: report.driftWarnings,
    timelines: report.characterTimelines,
    characters: [...characters.values()],
  });
}

export function buildStoryboardCharacterConsistencyReport(params: {
  storyboardId: string;
  scenes: StoryboardCharacterConsistencySceneInput[];
}): StoryboardCharacterConsistencyReport {
  const sorted = [...params.scenes].sort((a, b) => a.order - b.order);
  const characterMap = new Map<string, CharacterMemorySnapshot>();

  for (const scene of sorted) {
    for (const ch of scene.characters) {
      if (!characterMap.has(ch.id)) {
        characterMap.set(ch.id, characterSnapshotFromSceneChar(ch));
      }
    }
  }

  const perSceneCharacterScores: SceneCharacterIdentityScore[] = [];
  const timelineByCharacter = new Map<string, CharacterIdentityTimelineEntry[]>();

  for (const scene of sorted) {
    const consistencyReport = parseSceneConsistencyReport(scene.consistencyReportJson);
    const visionReport = parseVisionConsistencyReport(scene.visionReportJson);
    const sceneCharacters: ReturnType<typeof computeCharacterIdentityScore>[] = [];

    for (const ch of scene.characters) {
      const snapshot = characterMap.get(ch.id)!;
      const consistencyResult =
        consistencyReport?.characterResults.find((r) => r.characterId === ch.id) ?? null;
      const visionResult =
        visionReport?.characterResults.find((r) => r.characterId === ch.id) ?? null;
      const presentInScene = Boolean(
        (consistencyResult && consistencyResult.score > 0) ||
          (visionResult && visionResult.score > 0 && visionResult.detectedElements.length > 0) ||
          (visionResult && !visionResult.warnings.some((w) => /not clearly present/i.test(w)))
      );

      const identity = computeCharacterIdentityScore({
        character: snapshot,
        consistencyResult,
        visionResult,
        expectedInScene: true,
        presentInScene: presentInScene || Boolean(consistencyResult || visionResult),
      });
      sceneCharacters.push(identity);

      const list = timelineByCharacter.get(ch.id) ?? [];
      list.push(
        buildTimelineEntry(scene, identity, null)
      );
      timelineByCharacter.set(ch.id, list);
    }

    perSceneCharacterScores.push({
      sceneId: scene.sceneId,
      sceneTitle: scene.sceneTitle,
      order: scene.order,
      imageId: scene.imageId,
      characters: sceneCharacters,
    });
  }

  const characterTimelines: CharacterIdentityTimeline[] = [];
  const allNames = [...characterMap.values()].map((c) => c.name);
  const driftWarnings: string[] = [];

  for (const [characterId, snapshot] of characterMap) {
    const rawEntries = timelineByCharacter.get(characterId) ?? [];
    const scores = rawEntries
      .map((e) => e.score)
      .filter((s): s is number => typeof s === "number");
    const avg =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;

    const entries = rawEntries.map((entry) => {
      if (typeof entry.score === "number" && avg !== null && entry.score < avg - 15) {
        return { ...entry, driftFlag: true };
      }
      return entry;
    });

    let worstScore: number | null = null;
    let worstSceneOrder: number | null = null;
    for (const e of entries) {
      if (typeof e.score === "number" && (worstScore === null || e.score < worstScore)) {
        worstScore = e.score;
        worstSceneOrder = e.order;
      }
    }

    const charDrift = detectCharacterDrift({
      character: snapshot,
      timeline: entries,
      allCharacterNames: allNames,
    });
    driftWarnings.push(...charDrift);

    const warningCount = entries.reduce((n, e) => n + e.warnings.length, 0) + charDrift.length;

    characterTimelines.push({
      characterId,
      name: snapshot.name,
      role: snapshot.role,
      averageScore: avg,
      worstSceneOrder,
      worstScore,
      warningCount,
      entries,
    });
  }

  const perCharacterScores = characterTimelines
    .filter((t) => t.averageScore !== null)
    .map((t) => ({
      characterId: t.characterId,
      name: t.name,
      averageScore: t.averageScore!,
      status: scoreToCharacterIdentityStatus(t.averageScore!),
      warningCount: t.warningCount,
    }));

  const overallScores = perCharacterScores.map((p) => p.averageScore);
  const overallCharacterConsistencyScore =
    overallScores.length > 0
      ? Math.round(overallScores.reduce((a, b) => a + b, 0) / overallScores.length)
      : 0;

  const uniqueDrift = [...new Set(driftWarnings)];
  const recommendedCorrections = buildCharacterDriftCorrectionRecommendations({
    driftWarnings: uniqueDrift,
    timelines: characterTimelines,
    characters: [...characterMap.values()],
  });

  const scenesNeedingCharacterReview = perSceneCharacterScores.filter((scene) =>
    scene.characters.some((c) => c.status === "poor" || c.status === "needs_review")
  ).length;

  return {
    storyboardId: params.storyboardId,
    analyzedAt: new Date().toISOString(),
    overallCharacterConsistencyScore,
    perCharacterScores,
    perSceneCharacterScores,
    characterTimelines,
    driftWarnings: uniqueDrift,
    recommendedCorrections,
    scenesNeedingCharacterReview,
  };
}
