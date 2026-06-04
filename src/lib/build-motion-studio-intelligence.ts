import { scoreToCharacterIdentityStatus } from "@/lib/studio-character-identity-status";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type {
  MotionCharacterOverview,
  MotionDriftWarningDisplay,
  MotionSceneBreakdown,
  MotionSceneStudioQa,
  MotionStudioIntelligenceSnapshot,
} from "@/types/motion-studio-intelligence";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";

function uniqueNames(values: string[]): string[] {
  return [...new Set(values.filter((v) => v.trim()))].sort((a, b) => a.localeCompare(b));
}

function classifyDriftSeverity(message: string): MotionDriftWarningDisplay["severity"] {
  const lower = message.toLowerCase();
  if (/strongly|missing|without|confused|do not transform/i.test(lower)) {
    return "critical";
  }
  if (/hat|apron|outfit|wardrobe|branding|logo/i.test(lower)) {
    return "high";
  }
  if (/uncertain|inconsistent|drift|identity/i.test(lower)) {
    return "medium";
  }
  return "low";
}

function sceneOrdersFromWarning(
  message: string,
  timelines: MotionStudioIntelligenceSnapshot["characterTimelines"]
): number[] {
  const match = message.match(/scene\s*(\d+)/i);
  if (match?.[1]) {
    const oneBased = Number.parseInt(match[1], 10);
    if (Number.isFinite(oneBased) && oneBased > 0) {
      return [oneBased - 1];
    }
  }
  const orders: number[] = [];
  for (const timeline of timelines) {
    for (const entry of timeline.entries) {
      if (entry.driftFlag || entry.warnings.some((w) => message.includes(w))) {
        orders.push(entry.order);
      }
    }
  }
  return [...new Set(orders)];
}

function buildDriftWarningDisplays(
  warnings: string[],
  timelines: MotionStudioIntelligenceSnapshot["characterTimelines"]
): MotionDriftWarningDisplay[] {
  return warnings.map((message, index) => ({
    id: `drift-${index}`,
    message,
    severity: classifyDriftSeverity(message),
    affectedSceneOrders: sceneOrdersFromWarning(message, timelines),
  }));
}

function buildCharacterOverviews(payload: MotionHandoffPayload): MotionCharacterOverview[] {
  const report = payload.characterConsistencyReport;
  if (report?.perCharacterScores.length) {
    return report.perCharacterScores.map((row) => ({
      characterId: row.characterId,
      name: row.name,
      identityScore: row.averageScore,
      status: row.status,
    }));
  }

  const timelines = report?.characterTimelines ?? [];
  return timelines.map((timeline) => ({
    characterId: timeline.characterId,
    name: timeline.name,
    identityScore: timeline.averageScore,
    status:
      timeline.averageScore !== null
        ? scoreToCharacterIdentityStatus(timeline.averageScore)
        : null,
  }));
}

function buildSceneBreakdowns(payload: MotionHandoffPayload): MotionSceneBreakdown[] {
  const perSceneChars = new Map(
    payload.perSceneCharacterIdentityScores.map((row) => [row.sceneId, row.characters])
  );

  return [...payload.scenes]
    .sort((a, b) => a.order - b.order)
    .map((scene) => {
      const identityRows = perSceneChars.get(scene.sceneId) ?? [];
      const avgCharScore =
        identityRows.length > 0
          ? Math.round(
              identityRows.reduce((sum, c) => sum + c.score, 0) / identityRows.length
            )
          : null;
      const timelineByChar = new Map(
        (payload.characterConsistencyReport?.characterTimelines ?? []).map((t) => [
          t.characterId,
          t.entries.find((e) => e.sceneId === scene.sceneId),
        ])
      );

      return {
        sceneId: scene.sceneId,
        order: scene.order,
        title: scene.title.trim() || `Scene ${scene.order + 1}`,
        visionScore: scene.sceneVisionScore ?? scene.selectedImageVisionScore,
        consistencyScore: scene.sceneConsistencyScore ?? scene.selectedImageConsistencyScore,
        combinedImageScore: scene.selectedImageScore,
        hasSelectedImage: Boolean(scene.selectedSceneImageUrl?.trim()),
        characters: identityRows.map((c) => {
          const entry = timelineByChar.get(c.characterId);
          return {
            characterId: c.characterId,
            name: c.name,
            score: c.score,
            status: scoreToCharacterIdentityStatus(c.score),
            driftFlag: entry?.driftFlag ?? (avgCharScore !== null && c.score < avgCharScore - 12),
          };
        }),
        driftWarnings: [
          ...(scene.sceneConsistencyReport?.warnings ?? []),
          ...(scene.sceneVisionReport?.visionWarnings ?? []),
          ...identityRows
            .filter((c) => c.score < 65)
            .map((c) => `${c.name} identity score low (${c.score}) in this scene.`),
        ].slice(0, 6),
      };
    });
}

export function buildMotionSceneStudioQa(
  scene: MotionHandoffPayload["scenes"][number],
  payload: MotionHandoffPayload
): MotionSceneStudioQa {
  const identityRow = payload.perSceneCharacterIdentityScores.find(
    (row) => row.sceneId === scene.sceneId
  );
  const timelineEntries = payload.characterConsistencyReport?.characterTimelines ?? [];

  const driftWarnings = [
    ...(scene.sceneConsistencyReport?.warnings ?? []),
    ...(scene.sceneVisionReport?.visionWarnings ?? []),
    ...payload.characterDriftWarnings.filter((w) => {
      const sceneNum = scene.order + 1;
      return w.includes(`Scene ${sceneNum}`) || w.startsWith(scene.title);
    }),
  ].slice(0, 8);

  return {
    sceneTitle: scene.title.trim() || `Scene ${scene.order + 1}`,
    order: scene.order,
    selectedSceneImageUrl: scene.selectedSceneImageUrl,
    visionScore: scene.sceneVisionScore ?? scene.selectedImageVisionScore,
    consistencyScore: scene.sceneConsistencyScore ?? scene.selectedImageConsistencyScore,
    combinedImageScore: scene.selectedImageScore,
    characterIdentities: (identityRow?.characters ?? []).map((c) => ({
      characterId: c.characterId,
      name: c.name,
      score: c.score,
      status: scoreToCharacterIdentityStatus(c.score),
    })),
    driftWarnings,
    correctionRecommendations: scene.sceneCorrectionRecommendations.slice(0, 8).map((rec) => ({
      message: rec.message,
      severity: rec.severity,
    })),
  };
}

export function buildMotionStudioIntelligenceSnapshot(
  payload: MotionHandoffPayload
): MotionStudioIntelligenceSnapshot {
  const legacyHandoff = payload.version < MOTION_HANDOFF_PAYLOAD_VERSION;
  const hasCharacterReport = Boolean(payload.characterConsistencyReport);
  const partialData =
    legacyHandoff ||
    !hasCharacterReport ||
    payload.scenes.some(
      (s) =>
        s.selectedSceneImageUrl &&
        s.sceneVisionScore === null &&
        s.sceneConsistencyScore === null
    );

  const characterTimelines = payload.characterConsistencyReport?.characterTimelines ?? [];
  const driftRaw = [
    ...payload.characterDriftWarnings,
    ...payload.driftWarnings,
    ...payload.visionWarnings,
  ];
  const driftWarnings = buildDriftWarningDisplays([...new Set(driftRaw)], characterTimelines);

  const charactersUsed = uniqueNames(
    payload.scenes.flatMap((s) => s.characters.map((c) => c.name))
  );
  const locationsUsed = uniqueNames(
    payload.scenes.map((s) => s.location?.name ?? "").filter(Boolean)
  );
  const propsUsed = uniqueNames(payload.scenes.flatMap((s) => s.props.map((p) => p.name)));

  return {
    storyboardId: payload.storyboardId,
    storyboardTitle: payload.title,
    promptStyleProfile: payload.promptStyleProfile,
    handoffVersion: payload.version,
    importedAt: new Date().toISOString(),
    worldName: payload.worldMemory?.name ?? null,
    charactersUsed,
    locationsUsed,
    propsUsed,
    overallConsistencyScore:
      payload.overallConsistencyScore > 0 ? payload.overallConsistencyScore : null,
    overallVisionScore: payload.overallVisionScore > 0 ? payload.overallVisionScore : null,
    overallCharacterIdentityScore:
      payload.overallCharacterConsistencyScore > 0
        ? payload.overallCharacterConsistencyScore
        : null,
    characterOverviews: buildCharacterOverviews(payload),
    characterTimelines,
    driftWarnings,
    sceneBreakdowns: buildSceneBreakdowns(payload),
    sceneCount: payload.scenes.length,
    legacyHandoff,
    partialData,
    executionReadiness: payload.executionReadiness,
    executionWarningCount: payload.executionWarnings?.length ?? 0,
  };
}
