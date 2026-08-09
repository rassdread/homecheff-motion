/**
 * S.7D — Creative Director music & sound recommendations (never force).
 */

export type StudioMusicDirectionGuidance = {
  genre: string | null;
  tempo: string | null;
  emotion: string | null;
  instrumentation: string | null;
  energy: "low" | "medium" | "high" | null;
  forced: false;
};

export type StudioSoundDirectionGuidance = {
  ambience: string | null;
  effects: string | null;
  environment: string | null;
  soundDensity: "sparse" | "balanced" | "dense" | null;
  movement: string | null;
  cinematicLevel: "low" | "medium" | "high" | null;
  forced: false;
};

export function recommendMusicDirection(input: {
  musicStyle?: string | null;
  musicIntensity?: string | null;
  narrativeRole?: string | null;
}): StudioMusicDirectionGuidance {
  const style = input.musicStyle?.trim() || null;
  const intensity = (input.musicIntensity ?? "").trim().toLowerCase();
  const energy =
    intensity.includes("high") || intensity.includes("peak") ? "high"
    : intensity.includes("low") || intensity.includes("calm") ? "low"
    : style ? "medium"
    : null;

  return {
    genre: style,
    tempo: energy === "high" ? "upbeat" : energy === "low" ? "slow" : style ? "moderate" : null,
    emotion: style,
    instrumentation: null,
    energy,
    forced: false,
  };
}

export function recommendSoundDirection(input: {
  soundStyle?: string | null;
  soundDensity?: string | null;
  environmentHint?: string | null;
}): StudioSoundDirectionGuidance {
  const densityRaw = (input.soundDensity ?? "").trim().toLowerCase();
  const soundDensity =
    densityRaw.includes("dense") || densityRaw.includes("high") ? "dense"
    : densityRaw.includes("sparse") || densityRaw.includes("low") ? "sparse"
    : input.soundStyle ? "balanced"
    : null;

  return {
    ambience: input.environmentHint?.trim() || input.soundStyle?.trim() || null,
    effects: null,
    environment: input.environmentHint?.trim() || null,
    soundDensity,
    movement: null,
    cinematicLevel: soundDensity === "dense" ? "high" : soundDensity ? "medium" : null,
    forced: false,
  };
}
