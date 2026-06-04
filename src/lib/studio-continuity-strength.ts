export const STUDIO_CONTINUITY_STRENGTHS = ["loose", "normal", "strong", "strict"] as const;

export type StudioContinuityStrength = (typeof STUDIO_CONTINUITY_STRENGTHS)[number];

export const DEFAULT_STUDIO_CONTINUITY_STRENGTH: StudioContinuityStrength = "strong";

export function isStudioContinuityStrength(value: string): value is StudioContinuityStrength {
  return (STUDIO_CONTINUITY_STRENGTHS as readonly string[]).includes(value);
}

export function normalizeStudioContinuityStrength(
  value: string | undefined | null
): StudioContinuityStrength {
  const trimmed = value?.trim().toLowerCase() ?? "";
  return isStudioContinuityStrength(trimmed) ? trimmed : DEFAULT_STUDIO_CONTINUITY_STRENGTH;
}

/** Pick the strictest strength from a list (for aggregated handoff metadata). */
export function strictestContinuityStrength(
  values: (StudioContinuityStrength | string | null | undefined)[]
): StudioContinuityStrength {
  const order: StudioContinuityStrength[] = ["loose", "normal", "strong", "strict"];
  let max = 0;
  for (const raw of values) {
    const normalized = normalizeStudioContinuityStrength(raw ?? undefined);
    const idx = order.indexOf(normalized);
    if (idx > max) {
      max = idx;
    }
  }
  return order[max] ?? DEFAULT_STUDIO_CONTINUITY_STRENGTH;
}

export function continuityStrengthPromptHint(strength: StudioContinuityStrength): string {
  switch (strength) {
    case "loose":
      return "Allow mild visual variation while keeping general identity.";
    case "normal":
      return "Maintain recognizable identity with moderate consistency.";
    case "strict":
      return "Preserve exact identity with minimal deviation.";
    case "strong":
    default:
      return "Maintain strong identity consistency across scenes.";
  }
}
