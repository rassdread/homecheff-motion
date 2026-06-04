import type { PersistedWizardState, PersistedWizardSceneSlot } from "@/lib/instant-premium-wizard-storage";
import type { MotionStudioIntelligenceSnapshot } from "@/types/motion-studio-intelligence";
import { scoreToCharacterIdentityStatus } from "@/lib/studio-character-identity-status";

/**
 * Resolve V18 intelligence for the Motion wizard (persisted snapshot or slot fallback).
 */
export function resolveMotionStudioIntelligence(
  persisted: PersistedWizardState | null,
  sceneSlots: PersistedWizardSceneSlot[]
): MotionStudioIntelligenceSnapshot | null {
  if (persisted?.studioHandoff?.intelligence) {
    return persisted.studioHandoff.intelligence;
  }

  const studioSlots = sceneSlots.filter((s) => s.studioContext);
  if (studioSlots.length === 0) {
    return null;
  }

  const handoff = persisted?.studioHandoff;
  const storyboardId = handoff?.storyboardId ?? studioSlots[0]?.studioContext?.storyboardId ?? "";
  const storyboardTitle = handoff?.storyboardTitle ?? "Studio storyboard";

  const charactersUsed = [
    ...new Set(
      studioSlots.flatMap((s) => s.studioContext?.characters.map((c) => c.name) ?? [])
    ),
  ];
  const locationsUsed = [
    ...new Set(
      studioSlots.map((s) => s.studioContext?.location?.name ?? "").filter(Boolean)
    ),
  ];
  const propsUsed = [
    ...new Set(studioSlots.flatMap((s) => s.studioContext?.props.map((p) => p.name) ?? [])),
  ];

  const sceneBreakdowns = studioSlots.map((slot, index) => {
    const qa = slot.studioContext?.studioQa;
    const order = qa?.order ?? index;
    return {
      sceneId: slot.sceneId,
      order,
      title: qa?.sceneTitle ?? slot.text.title ?? `Scene ${order + 1}`,
      visionScore: qa?.visionScore ?? null,
      consistencyScore: qa?.consistencyScore ?? null,
      combinedImageScore: qa?.combinedImageScore ?? null,
      hasSelectedImage: Boolean(
        slot.image?.remoteWorkingUrl ||
          qa?.selectedSceneImageUrl ||
          slot.studioContext?.preferredSceneImageUrl
      ),
      characters: (qa?.characterIdentities ?? []).map((c) => ({
        characterId: c.characterId,
        name: c.name,
        score: c.score,
        status: c.status,
        driftFlag: c.score < 65,
      })),
      driftWarnings: qa?.driftWarnings ?? [],
    };
  });

  const characterMap = new Map<string, { name: string; scores: number[] }>();
  for (const scene of sceneBreakdowns) {
    for (const ch of scene.characters) {
      const row = characterMap.get(ch.characterId) ?? { name: ch.name, scores: [] };
      row.scores.push(ch.score);
      characterMap.set(ch.characterId, row);
    }
  }

  const characterOverviews = [...characterMap.entries()].map(([characterId, row]) => {
    const identityScore =
      row.scores.length > 0
        ? Math.round(row.scores.reduce((a, b) => a + b, 0) / row.scores.length)
        : null;
    return {
      characterId,
      name: row.name,
      identityScore,
      status: identityScore !== null ? scoreToCharacterIdentityStatus(identityScore) : null,
    };
  });

  const visionScores = sceneBreakdowns
    .map((s) => s.visionScore)
    .filter((v): v is number => typeof v === "number");
  const consistencyScores = sceneBreakdowns
    .map((s) => s.consistencyScore)
    .filter((v): v is number => typeof v === "number");

  return {
    storyboardId,
    storyboardTitle,
    promptStyleProfile: null,
    handoffVersion: handoff?.handoffVersion ?? 0,
    importedAt: handoff?.importedAt ?? new Date().toISOString(),
    worldName: null,
    charactersUsed,
    locationsUsed,
    propsUsed,
    overallConsistencyScore:
      consistencyScores.length > 0
        ? Math.round(consistencyScores.reduce((a, b) => a + b, 0) / consistencyScores.length)
        : null,
    overallVisionScore:
      visionScores.length > 0
        ? Math.round(visionScores.reduce((a, b) => a + b, 0) / visionScores.length)
        : null,
    overallCharacterIdentityScore:
      characterOverviews.length > 0
        ? Math.round(
            characterOverviews.reduce((sum, c) => sum + (c.identityScore ?? 0), 0) /
              characterOverviews.length
          )
        : null,
    characterOverviews,
    characterTimelines: [],
    driftWarnings: [],
    sceneBreakdowns,
    sceneCount: sceneBreakdowns.length,
    legacyHandoff: (handoff?.handoffVersion ?? 0) < 9,
    partialData: true,
  };
}
