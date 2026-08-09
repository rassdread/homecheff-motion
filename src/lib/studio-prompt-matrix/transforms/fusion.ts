/**
 * S.6E — Fusion transform wrapper.
 * Matrix supplies experience intent + continuity context.
 * Existing Fusion archetype/preservation logic remains authoritative for pixel identity.
 */

import type { ContinuityBundle } from "@/lib/studio-prompt-matrix/continuity-bundle";
import type { CreativeSpecification } from "@/lib/studio-prompt-matrix/creative-specification";
import {
  STUDIO_PROMPT_MATRIX_VERSION,
  STUDIO_PROVIDER_TRANSFORM_VERSION,
} from "@/lib/studio-prompt-matrix/types";

export type FusionTransformContext = {
  provider: "openai_image";
  transform: "fusion";
  matrixVersion: typeof STUDIO_PROMPT_MATRIX_VERSION;
  providerTransformVersion: typeof STUDIO_PROVIDER_TRANSFORM_VERSION;
  experience: CreativeSpecification["experience"];
  objective: string | null;
  subject: string | null;
  styleProfile: string | null;
  /** Distinct people — never concatenated anonymous prose. */
  characterRefs: Array<{ characterId: string; name: string; referenceUrl: string | null }>;
  locationId: string | null;
  propIds: string[];
  /** Pixel preservation stays authoritative in existing Fusion builders. */
  pixelPreserveContract: "fusion_references_authoritative";
  /** Existing Fusion prompt/payload — Matrix does not replace. */
  legacyFusionPrompt: string | null;
  legacyFusionPayload: unknown | null;
};

/**
 * Wrap Fusion with Matrix context. Callers pass existing Fusion prompt/payload.
 * Matrix does NOT turn Fusion into text-only generation.
 */
export function wrapFusionTransform(input: {
  specification: CreativeSpecification;
  continuity: ContinuityBundle;
  legacyFusionPrompt?: string | null;
  legacyFusionPayload?: unknown | null;
}): FusionTransformContext {
  const characterRefs = input.continuity.characters.map((c) => ({
    characterId: c.id,
    name: c.name,
    referenceUrl: c.referenceImageUrl || null,
  }));

  return {
    provider: "openai_image",
    transform: "fusion",
    matrixVersion: STUDIO_PROMPT_MATRIX_VERSION,
    providerTransformVersion: STUDIO_PROVIDER_TRANSFORM_VERSION,
    experience: input.specification.experience,
    objective: input.specification.objective,
    subject: input.specification.subject,
    styleProfile: input.specification.style.styleProfile,
    characterRefs,
    locationId: input.specification.continuity.locationId,
    propIds: [...input.specification.continuity.propIds],
    pixelPreserveContract: "fusion_references_authoritative",
    legacyFusionPrompt: input.legacyFusionPrompt ?? null,
    legacyFusionPayload: input.legacyFusionPayload ?? null,
  };
}
