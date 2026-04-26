/** Client + server safe advanced animation overrides (enforced server-side). */

export type AnimationUserRole = "admin" | "power" | "user";

export type AnimationAdvancedResolution = "540p" | "720p" | "1080p";

/** Client/server payload for optional advanced overrides (enforced server-side). */
export type AnimationAdvancedSettings = {
  enabled: boolean;
  model?: string;
  resolution?: AnimationAdvancedResolution;
  durationSeconds?: number;
};

export type AdvancedAnimationLimits = {
  advancedControls: boolean;
  maxDurationSeconds: number;
  maxImages: number;
  maxTransitions: number;
  allowedResolutions: readonly AnimationAdvancedResolution[];
  /** Vidu job model ids (normalized). */
  allowedModels: readonly string[];
};

const RESOLUTIONS = ["540p", "720p", "1080p"] as const;

const MODEL_ALIASES: Record<string, string> = {
  "vidu-q3-turbo": "viduq3-turbo",
  "vidu-q3-pro": "viduq3-pro",
};

export function normalizeViduModelIdForAdvanced(raw: string): string {
  const t = raw.trim();
  return MODEL_ALIASES[t.toLowerCase()] ?? t;
}

function isResolution(s: string): s is AnimationAdvancedResolution {
  return (RESOLUTIONS as readonly string[]).includes(s);
}

/** Credits per second of video per transition segment (Vidu pricing assumptions). */
const CREDITS_PER_SECOND: Record<
  string,
  Record<AnimationAdvancedResolution, number>
> = {
  "viduq3-turbo": { "540p": 8, "720p": 12, "1080p": 14 },
  "viduq3-pro": { "540p": 10, "720p": 25, "1080p": 30 },
};

export function getAdvancedAnimationLimitsForRole(role: AnimationUserRole): AdvancedAnimationLimits {
  if (role === "admin") {
    return {
      advancedControls: true,
      maxDurationSeconds: 16,
      maxImages: 9,
      maxTransitions: 8,
      allowedResolutions: ["540p", "720p", "1080p"],
      allowedModels: ["viduq3-turbo", "viduq3-pro"],
    };
  }
  if (role === "power") {
    return {
      advancedControls: false,
      maxDurationSeconds: 8,
      maxImages: 7,
      maxTransitions: 6,
      allowedResolutions: ["540p", "720p"],
      allowedModels: ["viduq3-turbo"],
    };
  }
  return {
    advancedControls: false,
    maxDurationSeconds: 8,
    maxImages: 7,
    maxTransitions: 6,
    allowedResolutions: ["540p", "720p"],
    allowedModels: ["viduq3-turbo"],
  };
}

export function estimateAdvancedCredits(
  model: string,
  resolution: AnimationAdvancedResolution,
  durationSecondsPerTransition: number,
  transitionCount: number
): number {
  const m = normalizeViduModelIdForAdvanced(model);
  const table = CREDITS_PER_SECOND[m] ?? CREDITS_PER_SECOND["viduq3-turbo"];
  const rate = table[resolution] ?? table["720p"];
  const per = Math.max(0, Math.ceil(durationSecondsPerTransition));
  const n = Math.max(0, transitionCount);
  return per * rate * n;
}

export type AdvancedValidationErrorCode =
  | "ADVANCED_MODEL_NOT_ALLOWED"
  | "ADVANCED_RESOLUTION_NOT_ALLOWED"
  | "ADVANCED_DURATION_NOT_ALLOWED"
  | "ADVANCED_IMAGE_LIMIT";

export function validateAdvancedSettingsForUser(
  limits: AdvancedAnimationLimits,
  settings: Partial<AnimationAdvancedSettings> & { enabled: boolean },
  imageCount: number
):
  | { ok: true; model: string; resolution: AnimationAdvancedResolution; durationSeconds: number }
  | { ok: false; code: AdvancedValidationErrorCode } {
  if (imageCount > limits.maxImages) {
    return { ok: false, code: "ADVANCED_IMAGE_LIMIT" };
  }
  const rawModel = settings.model?.trim();
  const rawRes = settings.resolution?.trim().toLowerCase();
  const dur = settings.durationSeconds;
  if (!rawModel) {
    return { ok: false, code: "ADVANCED_MODEL_NOT_ALLOWED" };
  }
  const model = normalizeViduModelIdForAdvanced(rawModel);
  if (!limits.allowedModels.includes(model)) {
    return { ok: false, code: "ADVANCED_MODEL_NOT_ALLOWED" };
  }
  if (!rawRes || !isResolution(rawRes)) {
    return { ok: false, code: "ADVANCED_RESOLUTION_NOT_ALLOWED" };
  }
  if (!limits.allowedResolutions.includes(rawRes)) {
    return { ok: false, code: "ADVANCED_RESOLUTION_NOT_ALLOWED" };
  }
  if (typeof dur !== "number" || !Number.isFinite(dur) || dur < 1 || dur > limits.maxDurationSeconds) {
    return { ok: false, code: "ADVANCED_DURATION_NOT_ALLOWED" };
  }
  return {
    ok: true,
    model,
    resolution: rawRes,
    durationSeconds: Math.floor(dur),
  };
}
