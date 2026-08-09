/**
 * S.6E — Explicit duration precedence (no silent single-source choice).
 *
 * Precedence (highest wins when present):
 * 1. userOverride
 * 2. intentDuration
 * 3. sceneDuration
 * 4. experienceDefault
 * 5. providerConstraint (clamp only — does not invent)
 */

export type DurationProvenance =
  | "user_override"
  | "intent"
  | "scene"
  | "experience_default"
  | "provider_constraint"
  | "unresolved";

export type DurationSources = {
  userOverride?: number | null;
  intentDuration?: number | null;
  sceneDuration?: number | null;
  experienceDefault?: number | null;
  providerMin?: number | null;
  providerMax?: number | null;
};

export type ResolvedDuration = {
  resolvedSeconds: number | null;
  provenance: DurationProvenance;
  sources: DurationSources;
  clampedByProvider?: boolean;
};

function positive(n: number | null | undefined): number | null {
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function resolveDuration(sources: DurationSources): ResolvedDuration {
  const userOverride = positive(sources.userOverride);
  const intentDuration = positive(sources.intentDuration);
  const sceneDuration = positive(sources.sceneDuration);
  const experienceDefault = positive(sources.experienceDefault);
  const providerMin = positive(sources.providerMin);
  const providerMax = positive(sources.providerMax);

  let resolvedSeconds: number | null = null;
  let provenance: DurationProvenance = "unresolved";

  if (userOverride != null) {
    resolvedSeconds = userOverride;
    provenance = "user_override";
  } else if (intentDuration != null) {
    resolvedSeconds = intentDuration;
    provenance = "intent";
  } else if (sceneDuration != null) {
    resolvedSeconds = sceneDuration;
    provenance = "scene";
  } else if (experienceDefault != null) {
    resolvedSeconds = experienceDefault;
    provenance = "experience_default";
  }

  let clampedByProvider = false;
  if (resolvedSeconds != null) {
    let next = resolvedSeconds;
    if (providerMin != null && next < providerMin) {
      next = providerMin;
      clampedByProvider = true;
    }
    if (providerMax != null && next > providerMax) {
      next = providerMax;
      clampedByProvider = true;
    }
    if (clampedByProvider) {
      resolvedSeconds = next;
      provenance = "provider_constraint";
    }
  }

  return {
    resolvedSeconds,
    provenance,
    sources: {
      userOverride,
      intentDuration,
      sceneDuration,
      experienceDefault,
      providerMin,
      providerMax,
    },
    clampedByProvider,
  };
}
