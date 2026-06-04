import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type {
  StudioIntelligenceStalenessResult,
  StudioStalenessReason,
  StudioStalenessSeverity,
  StudioScoreChange,
  StudioSelectedImageChange,
} from "@/types/studio-project-persistence";

type HandoffSceneRow = {
  sceneId: string;
  order: number;
  title: string;
  selectedSceneImageId: string | null;
  selectedSceneImagePromptVersion: number | null;
  selectedSceneImageGenerationVersion: number | null;
  sceneVisionScore: number | null;
  sceneConsistencyScore: number | null;
  selectedImageVisionScore: number | null;
  selectedImageConsistencyScore: number | null;
};

function parseHandoffScenes(raw: unknown): HandoffSceneRow[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return [];
  }
  const scenes = (raw as { scenes?: unknown }).scenes;
  if (!Array.isArray(scenes)) {
    return [];
  }
  const rows: HandoffSceneRow[] = [];
  for (const entry of scenes) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const s = entry as Record<string, unknown>;
    const sceneId = typeof s.sceneId === "string" ? s.sceneId : "";
    if (!sceneId) {
      continue;
    }
    rows.push({
      sceneId,
      order: typeof s.order === "number" ? s.order : rows.length,
      title: typeof s.title === "string" ? s.title : "",
      selectedSceneImageId:
        typeof s.selectedSceneImageId === "string" ? s.selectedSceneImageId : null,
      selectedSceneImagePromptVersion:
        typeof s.selectedSceneImagePromptVersion === "number"
          ? s.selectedSceneImagePromptVersion
          : null,
      selectedSceneImageGenerationVersion:
        typeof s.selectedSceneImageGenerationVersion === "number"
          ? s.selectedSceneImageGenerationVersion
          : null,
      sceneVisionScore: typeof s.sceneVisionScore === "number" ? s.sceneVisionScore : null,
      sceneConsistencyScore:
        typeof s.sceneConsistencyScore === "number" ? s.sceneConsistencyScore : null,
      selectedImageVisionScore:
        typeof s.selectedImageVisionScore === "number" ? s.selectedImageVisionScore : null,
      selectedImageConsistencyScore:
        typeof s.selectedImageConsistencyScore === "number"
          ? s.selectedImageConsistencyScore
          : null,
    });
  }
  return rows.sort((a, b) => a.order - b.order);
}

/** Lightweight sync fingerprint — no prompts or large blobs. */
export function buildStudioHandoffSyncFingerprint(handoff: unknown): string {
  const scenes = parseHandoffScenes(handoff);
  const driftCount =
    handoff && typeof handoff === "object" && !Array.isArray(handoff)
      ? [
          ...(((handoff as { driftWarnings?: unknown }).driftWarnings as unknown[]) ?? []),
          ...(((handoff as { characterDriftWarnings?: unknown }).characterDriftWarnings as unknown[]) ??
            []),
          ...(((handoff as { visionWarnings?: unknown }).visionWarnings as unknown[]) ?? []),
        ].length
      : 0;
  const overall =
    handoff && typeof handoff === "object" && !Array.isArray(handoff)
      ? [
          (handoff as { overallConsistencyScore?: number }).overallConsistencyScore ?? 0,
          (handoff as { overallVisionScore?: number }).overallVisionScore ?? 0,
          (handoff as { overallCharacterConsistencyScore?: number }).overallCharacterConsistencyScore ??
            0,
        ].join(",")
      : "";
  const scenePart = scenes
    .map(
      (s) =>
        `${s.sceneId}:${s.selectedSceneImageId ?? ""}:${s.selectedSceneImagePromptVersion ?? ""}:${s.selectedSceneImageGenerationVersion ?? ""}:${s.sceneVisionScore ?? s.selectedImageVisionScore ?? ""}:${s.sceneConsistencyScore ?? s.selectedImageConsistencyScore ?? ""}`
    )
    .join("|");
  return `sc=${scenes.length};d=${driftCount};o=${overall};${scenePart}`;
}

function maxSeverity(reasons: StudioStalenessReason[]): StudioStalenessSeverity | null {
  if (reasons.length === 0) {
    return null;
  }
  if (reasons.some((r) => r.severity === "high")) {
    return "high";
  }
  if (reasons.some((r) => r.severity === "medium")) {
    return "medium";
  }
  return "low";
}

function scoreChanged(before: number | null, after: number | null, threshold = 3): boolean {
  if (before === null && after === null) {
    return false;
  }
  if (before === null || after === null) {
    return true;
  }
  return Math.abs(before - after) >= threshold;
}

function visionScore(scene: HandoffSceneRow): number | null {
  return scene.sceneVisionScore ?? scene.selectedImageVisionScore;
}

function consistencyScore(scene: HandoffSceneRow): number | null {
  return scene.sceneConsistencyScore ?? scene.selectedImageConsistencyScore;
}

export function compareStudioHandoffScenes(
  stored: HandoffSceneRow[],
  latest: HandoffSceneRow[]
): {
  reasons: StudioStalenessReason[];
  scoreChanges: StudioScoreChange[];
  selectedImageChanges: StudioSelectedImageChange[];
} {
  const reasons: StudioStalenessReason[] = [];
  const scoreChanges: StudioScoreChange[] = [];
  const selectedImageChanges: StudioSelectedImageChange[] = [];

  if (stored.length !== latest.length) {
    reasons.push({
      code: "scene_count_changed",
      message: `Scene count changed (${stored.length} → ${latest.length}).`,
      severity: "high",
    });
  }

  const storedById = new Map(stored.map((s) => [s.sceneId, s]));
  const latestById = new Map(latest.map((s) => [s.sceneId, s]));

  for (const id of storedById.keys()) {
    if (!latestById.has(id)) {
      reasons.push({
        code: "scene_removed",
        message: `Scene removed from storyboard.`,
        severity: "high",
        sceneId: id,
      });
    }
  }
  for (const id of latestById.keys()) {
    if (!storedById.has(id)) {
      reasons.push({
        code: "scene_added",
        message: `New scene added in Studio.`,
        severity: "high",
        sceneId: id,
      });
    }
  }

  for (const [sceneId, latestScene] of latestById) {
    const storedScene = storedById.get(sceneId);
    if (!storedScene) {
      continue;
    }
    if (storedScene.selectedSceneImageId !== latestScene.selectedSceneImageId) {
      reasons.push({
        code: "selected_image_changed",
        message: `Selected scene image changed for "${latestScene.title || sceneId}".`,
        severity: "high",
        sceneId,
      });
      selectedImageChanges.push({
        sceneId,
        sceneTitle: latestScene.title,
        beforeImageId: storedScene.selectedSceneImageId,
        afterImageId: latestScene.selectedSceneImageId,
      });
    }
    if (
      storedScene.selectedSceneImagePromptVersion !== latestScene.selectedSceneImagePromptVersion
    ) {
      reasons.push({
        code: "prompt_version_changed",
        message: `Prompt version changed for "${latestScene.title || sceneId}".`,
        severity: "medium",
        sceneId,
      });
    }
    if (
      storedScene.selectedSceneImageGenerationVersion !==
      latestScene.selectedSceneImageGenerationVersion
    ) {
      reasons.push({
        code: "generation_version_changed",
        message: `Generation version changed for "${latestScene.title || sceneId}".`,
        severity: "medium",
        sceneId,
      });
    }
    const beforeVision = visionScore(storedScene);
    const afterVision = visionScore(latestScene);
    if (scoreChanged(beforeVision, afterVision)) {
      reasons.push({
        code: "vision_score_changed",
        message: `Vision score changed for "${latestScene.title || sceneId}".`,
        severity: "medium",
        sceneId,
      });
      scoreChanges.push({
        sceneId,
        field: "vision",
        before: beforeVision,
        after: afterVision,
      });
    }
    const beforeConsistency = consistencyScore(storedScene);
    const afterConsistency = consistencyScore(latestScene);
    if (scoreChanged(beforeConsistency, afterConsistency)) {
      reasons.push({
        code: "consistency_score_changed",
        message: `Consistency score changed for "${latestScene.title || sceneId}".`,
        severity: "medium",
        sceneId,
      });
      scoreChanges.push({
        sceneId,
        field: "consistency",
        before: beforeConsistency,
        after: afterConsistency,
      });
    }
  }

  return { reasons, scoreChanges, selectedImageChanges };
}

function driftWarningFingerprint(raw: unknown): string {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return "";
  }
  const handoff = raw as Record<string, unknown>;
  const lists = [
    handoff.driftWarnings,
    handoff.characterDriftWarnings,
    handoff.visionWarnings,
  ];
  const parts: string[] = [];
  for (const list of lists) {
    if (!Array.isArray(list)) {
      continue;
    }
    parts.push(
      ...list
        .filter((w): w is string => typeof w === "string")
        .map((w) => w.trim())
        .sort()
    );
  }
  return parts.join("\n");
}

export function detectStudioIntelligenceStaleness(params: {
  storedHandoff: unknown;
  latestHandoff: unknown;
  /** When true, also compare top-level drift warning lists on handoff objects. */
  compareDriftLists?: boolean;
}): StudioIntelligenceStalenessResult {
  const storedFingerprint = buildStudioHandoffSyncFingerprint(params.storedHandoff);
  const latestFingerprint = buildStudioHandoffSyncFingerprint(params.latestHandoff);

  if (!params.storedHandoff) {
    return {
      isStale: true,
      severity: "high",
      reasons: [
        {
          code: "no_stored_handoff",
          message: "No stored Studio handoff on this project.",
          severity: "high",
        },
      ],
      storedFingerprint: null,
      latestFingerprint,
    };
  }

  if (storedFingerprint === latestFingerprint) {
    if (params.compareDriftLists) {
      const storedDrift = driftWarningFingerprint(params.storedHandoff);
      const latestDrift = driftWarningFingerprint(params.latestHandoff);
      if (storedDrift !== latestDrift) {
        const reasons: StudioStalenessReason[] = [
          {
            code: "drift_warnings_changed",
            message: "Drift warnings changed in Studio.",
            severity: "low",
          },
        ];
        return {
          isStale: true,
          severity: maxSeverity(reasons),
          reasons,
          storedFingerprint,
          latestFingerprint,
        };
      }
    }
    return {
      isStale: false,
      severity: null,
      reasons: [],
      storedFingerprint,
      latestFingerprint,
    };
  }

  const storedScenes = parseHandoffScenes(params.storedHandoff);
  const latestScenes = parseHandoffScenes(params.latestHandoff);
  const { reasons, scoreChanges: _sc, selectedImageChanges: _i } = compareStudioHandoffScenes(
    storedScenes,
    latestScenes
  );

  if (params.compareDriftLists) {
    const storedDrift = driftWarningFingerprint(params.storedHandoff);
    const latestDrift = driftWarningFingerprint(params.latestHandoff);
    if (storedDrift !== latestDrift && !reasons.some((r) => r.code === "drift_warnings_changed")) {
      reasons.push({
        code: "drift_warnings_changed",
        message: "Drift warnings changed in Studio.",
        severity: "low",
      });
    }
  }

  if (reasons.length === 0) {
    reasons.push({
      code: "handoff_fingerprint_changed",
      message: "Studio storyboard metadata differs from stored snapshot.",
      severity: "medium",
    });
  }

  return {
    isStale: true,
    severity: maxSeverity(reasons),
    reasons,
    storedFingerprint,
    latestFingerprint,
  };
}

export function summarizeStalenessReasons(reasons: StudioStalenessReason[]): string {
  if (reasons.length === 0) {
    return "";
  }
  return reasons
    .slice(0, 3)
    .map((r) => r.message)
    .join(" ");
}

export function compareHandoffsForRefreshAudit(
  storedHandoff: unknown,
  latestHandoff: MotionHandoffPayload
): {
  staleReasons: string[];
  scoreChanges: StudioScoreChange[];
  selectedImageChanges: StudioSelectedImageChange[];
} {
  const storedScenes = parseHandoffScenes(storedHandoff);
  const latestScenes = parseHandoffScenes(latestHandoff);
  const compared = compareStudioHandoffScenes(storedScenes, latestScenes);
  const driftStored = driftWarningFingerprint(storedHandoff);
  const driftLatest = driftWarningFingerprint(latestHandoff);
  const reasons = [...compared.reasons];
  if (driftStored !== driftLatest) {
    reasons.push({
      code: "drift_warnings_changed",
      message: "Drift warnings changed in Studio.",
      severity: "low",
    });
  }
  return {
    staleReasons: reasons.map((r) => r.message),
    scoreChanges: compared.scoreChanges,
    selectedImageChanges: compared.selectedImageChanges,
  };
}
