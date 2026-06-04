import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import { MOTION_HANDOFF_PAYLOAD_VERSION } from "@/types/motion-handoff-payload";

/** Max serialized bytes for studioHandoffJson on AnimationProject. */
export const STUDIO_HANDOFF_JSON_MAX_BYTES = 200_000;

const STRIP_SCENE_KEYS = new Set([
  "generatedPrompt",
  "stylePrompt",
  "continuityPrompt",
  "description",
]);

const EXECUTION_PROMPT_MAX_STORE = 2400;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stripLargeStrings(value: unknown, depth = 0): unknown {
  if (depth > 12) {
    return null;
  }
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === "string") {
    if (value.startsWith("data:")) {
      return null;
    }
    if (value.length > 4000) {
      return value.slice(0, 4000);
    }
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 200).map((entry) => stripLargeStrings(entry, depth + 1));
  }
  if (!isPlainObject(value)) {
    return null;
  }
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key === "imageData" || key === "base64" || key === "binary") {
      continue;
    }
    out[key] = stripLargeStrings(entry, depth + 1);
  }
  return out;
}

function truncateExecutionString(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  if (trimmed.length <= EXECUTION_PROMPT_MAX_STORE) {
    return trimmed;
  }
  return `${trimmed.slice(0, EXECUTION_PROMPT_MAX_STORE - 3)}...`;
}

function sanitizeScene(scene: Record<string, unknown>): Record<string, unknown> {
  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(scene)) {
    if (STRIP_SCENE_KEYS.has(key)) {
      continue;
    }
    if (key === "executionPrompt") {
      copy[key] = truncateExecutionString(value);
      continue;
    }
    if (key === "sceneExecutionPackage" && isPlainObject(value)) {
      const pkg = { ...value };
      if (typeof pkg.prompt === "string") {
        pkg.prompt = truncateExecutionString(pkg.prompt);
      }
      copy[key] = stripLargeStrings(pkg);
      continue;
    }
    copy[key] = stripLargeStrings(value);
  }
  return copy;
}

/**
 * Store only URLs, IDs, scores, and metadata — no huge prompts or binaries.
 */
export function sanitizeMotionHandoffForStorage(
  payload: MotionHandoffPayload | Record<string, unknown>
): Record<string, unknown> {
  const raw = stripLargeStrings(payload) as Record<string, unknown>;
  const scenes = Array.isArray(raw.scenes) ? raw.scenes : [];
  return {
    version: raw.version ?? MOTION_HANDOFF_PAYLOAD_VERSION,
    storyboardId: raw.storyboardId,
    title: raw.title,
    promptStyleProfile: raw.promptStyleProfile,
    continuityStrength: raw.continuityStrength,
    overallConsistencyScore: raw.overallConsistencyScore,
    overallVisionScore: raw.overallVisionScore,
    overallCharacterConsistencyScore: raw.overallCharacterConsistencyScore,
    driftWarnings: raw.driftWarnings,
    characterDriftWarnings: raw.characterDriftWarnings,
    visionWarnings: raw.visionWarnings,
    consistencyReport: raw.consistencyReport,
    visionReport: raw.visionReport,
    characterConsistencyReport: raw.characterConsistencyReport,
    correctionRecommendations: raw.correctionRecommendations,
    consistencyHistory: raw.consistencyHistory,
    latestImprovementScore: raw.latestImprovementScore,
    perSceneCharacterIdentityScores: raw.perSceneCharacterIdentityScores,
    characterMemory: raw.characterMemory,
    locationMemory: raw.locationMemory,
    propMemory: raw.propMemory,
    worldMemory: raw.worldMemory,
    directorProfile: raw.directorProfile,
    executionPackage: raw.executionPackage,
    executionReadiness: raw.executionReadiness,
    executionWarnings: raw.executionWarnings,
    voiceMetadata: raw.voiceMetadata,
    voiceDuration: raw.voiceDuration,
    subtitleTrack: raw.subtitleTrack,
    subtitleAvailability: raw.subtitleAvailability,
    characterVoiceProfiles: raw.characterVoiceProfiles,
    characterVoiceAssignments: raw.characterVoiceAssignments,
    voiceSegments: raw.voiceSegments,
    motionAudioExport: stripLargeStrings(raw.motionAudioExport),
    scenes: scenes.map((scene) =>
      isPlainObject(scene) ? sanitizeScene(scene) : scene
    ),
  };
}

export function assertStudioJsonWithinSizeLimit(
  label: string,
  value: unknown,
  maxBytes: number
): { ok: true } | { ok: false; error: string } {
  let serialized: string;
  try {
    serialized = JSON.stringify(value ?? null);
  } catch {
    return { ok: false, error: `${label} is not JSON-serializable.` };
  }
  const bytes = new TextEncoder().encode(serialized).length;
  if (bytes > maxBytes) {
    return {
      ok: false,
      error: `${label} exceeds ${maxBytes} bytes (${bytes}).`,
    };
  }
  return { ok: true };
}

export function parseMotionHandoffPayloadForStorage(raw: unknown): MotionHandoffPayload | null {
  if (!isPlainObject(raw)) {
    return null;
  }
  const storyboardId = typeof raw.storyboardId === "string" ? raw.storyboardId.trim() : "";
  if (!storyboardId) {
    return null;
  }
  const version =
    typeof raw.version === "number" && Number.isFinite(raw.version)
      ? raw.version
      : MOTION_HANDOFF_PAYLOAD_VERSION;
  return sanitizeMotionHandoffForStorage({
    ...raw,
    storyboardId,
    version,
  }) as MotionHandoffPayload;
}
