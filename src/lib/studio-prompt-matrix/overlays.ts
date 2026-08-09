/**
 * S.6E — BrandKit + PromptPreset optional overlays.
 * Honest: storage-only until linked; presets cannot overwrite identity.
 *
 * Precedence (conceptual, confirmed against product truth):
 * Product defaults → Experience defaults → Continuity → Brand → PromptPreset
 * → Explicit user choices → Director policy → Provider transform
 *
 * Explicit user choice is not silently overwritten by preset/brand.
 */

import type { ContinuityBundle, ContinuityBrandIdentity } from "@/lib/studio-prompt-matrix/continuity-bundle";
import type { CreativeSpecification } from "@/lib/studio-prompt-matrix/creative-specification";

export type PromptPresetOverlay = {
  presetId: string;
  /** Creative-only fields; identity keys are stripped. */
  creative?: {
    styleProfile?: string | null;
    lighting?: string | null;
    objective?: string | null;
    subject?: string | null;
    platform?: string | null;
    mood?: string | null;
    energy?: string | null;
    negatives?: string[];
  };
};

const IDENTITY_FORBIDDEN_KEYS = new Set([
  "characterIds",
  "locationId",
  "propIds",
  "worldId",
  "characters",
  "location",
  "props",
  "world",
  "memoryBundle",
  "sourceEntities",
  "references",
  "voice",
  "identityRules",
  "continuityCase",
]);

export function sanitizePresetCreative(
  creative: PromptPresetOverlay["creative"]
): PromptPresetOverlay["creative"] {
  if (!creative) return undefined;
  const out: NonNullable<PromptPresetOverlay["creative"]> = {};
  for (const [key, value] of Object.entries(creative)) {
    if (IDENTITY_FORBIDDEN_KEYS.has(key)) continue;
    (out as Record<string, unknown>)[key] = value;
  }
  return out;
}

export function applyBrandOverlay(
  spec: CreativeSpecification,
  brand: ContinuityBrandIdentity | null | undefined
): CreativeSpecification {
  if (!brand?.available || !brand.brandKitId) {
    return {
      ...spec,
      brand: { brandKitId: null, available: false, overlayApplied: false },
    };
  }
  const modules = spec.modulesIncluded.includes("brand.identity")
    ? spec.modulesIncluded
    : [...spec.modulesIncluded, "brand.identity"];
  return {
    ...spec,
    brand: {
      brandKitId: brand.brandKitId,
      available: true,
      overlayApplied: true,
    },
    modulesIncluded: modules,
  };
}

/**
 * Apply PromptPreset overlay.
 * Does not overwrite identity continuity fields.
 * Does not overwrite explicit user fields when `explicitUserLock` is set.
 */
export function applyPromptPresetOverlay(
  spec: CreativeSpecification,
  preset: PromptPresetOverlay | null | undefined,
  options?: {
    /** Fields already set by explicit user choice — preset must not overwrite. */
    explicitUserLock?: Array<
      "styleProfile" | "lighting" | "objective" | "subject" | "platform" | "energy" | "mood"
    >;
  }
): CreativeSpecification {
  if (!preset?.presetId) return spec;
  const creative = sanitizePresetCreative(preset.creative) ?? {};
  const lock = new Set(options?.explicitUserLock ?? []);

  const next: CreativeSpecification = {
    ...spec,
    overlays: {
      promptPresetId: preset.presetId,
      promptPresetApplied: true,
    },
    modulesIncluded: spec.modulesIncluded.includes("overlay.prompt_preset")
      ? spec.modulesIncluded
      : [...spec.modulesIncluded, "overlay.prompt_preset"],
  };

  if (creative.styleProfile && !lock.has("styleProfile") && !spec.style.styleProfile) {
    next.style = { ...next.style, styleProfile: creative.styleProfile };
  }
  if (creative.lighting && !lock.has("lighting") && !spec.lighting) {
    next.lighting = creative.lighting;
  }
  if (creative.objective && !lock.has("objective") && !spec.objective) {
    next.objective = creative.objective;
  }
  if (creative.subject && !lock.has("subject") && !spec.subject) {
    next.subject = creative.subject;
  }
  if (creative.platform && !lock.has("platform") && !spec.platform) {
    next.platform = creative.platform;
  }
  if (creative.mood && !lock.has("mood") && !spec.audio.mood) {
    next.audio = { ...next.audio, mood: creative.mood };
  }
  if (creative.energy && !lock.has("energy") && !spec.movement.energy) {
    next.movement = { ...next.movement, energy: creative.energy };
  }
  if (creative.negatives?.length) {
    next.negatives = {
      ...next.negatives,
      canonical: [...next.negatives.canonical, ...creative.negatives],
    };
  }

  // Hard guarantee: identity continuity unchanged
  next.continuity = { ...spec.continuity };
  return next;
}

export function brandFromBundle(bundle: ContinuityBundle): ContinuityBrandIdentity | null {
  return bundle.brand;
}
