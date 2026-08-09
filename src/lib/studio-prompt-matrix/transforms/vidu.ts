/**
 * S.6E — Vidu transform wrapper.
 * Does NOT rewrite vidu-prompt-budget / Instant / Motion templates.
 * Distinguishes entity-aware Studio handoff vs standalone source-image continuity.
 */

import type { ContinuityBundle } from "@/lib/studio-prompt-matrix/continuity-bundle";
import type { CreativeSpecification } from "@/lib/studio-prompt-matrix/creative-specification";
import {
  STUDIO_PROMPT_MATRIX_VERSION,
  STUDIO_PROVIDER_TRANSFORM_VERSION,
} from "@/lib/studio-prompt-matrix/types";

export type ViduTransformRequest = {
  provider: "vidu_motion";
  matrixVersion: typeof STUDIO_PROMPT_MATRIX_VERSION;
  providerTransformVersion: typeof STUDIO_PROVIDER_TRANSFORM_VERSION;
  experience: CreativeSpecification["experience"];
  continuityCase: ContinuityBundle["continuityMeta"]["continuityCase"];
  durationSeconds: number | null;
  durationProvenance: CreativeSpecification["duration"]["provenance"];
  aspectRatio: string | null;
  aspectProvenance: CreativeSpecification["aspectRatio"]["provenance"];
  motionPresetId: string | null;
  energy: string | null;
  platform: string | null;
  /** Approved continuity subset for Studio handoff. */
  approvedContinuity: {
    characterIds: string[];
    locationId: string | null;
    propIds: string[];
    worldId: string | null;
    identityRules: string[];
  } | null;
  sourceImageUrl: string | null;
  /** Existing Vidu prompt / budget output — wrapped, not rewritten. */
  legacyViduPrompt: string | null;
  negativesPreserveDefaults: boolean;
  matrixNegatives: string[];
};

export function wrapViduTransform(input: {
  specification: CreativeSpecification;
  continuity: ContinuityBundle;
  legacyViduPrompt?: string | null;
}): ViduTransformRequest {
  const caseKind = input.continuity.continuityMeta.continuityCase;
  const sourceImage =
    input.continuity.references.find((r) => r.entityKind === "source_image")?.url ??
    input.continuity.references[0]?.url ??
    null;

  const approvedContinuity =
    caseKind === "entity_aware_studio" || caseKind === "fusion_refs"
      ? {
          characterIds: [...input.specification.continuity.characterIds],
          locationId: input.specification.continuity.locationId,
          propIds: [...input.specification.continuity.propIds],
          worldId: input.specification.continuity.worldId,
          identityRules: [...input.specification.continuity.identityRules],
        }
      : null;

  return {
    provider: "vidu_motion",
    matrixVersion: STUDIO_PROMPT_MATRIX_VERSION,
    providerTransformVersion: STUDIO_PROVIDER_TRANSFORM_VERSION,
    experience: input.specification.experience,
    continuityCase: caseKind,
    durationSeconds: input.specification.duration.resolvedSeconds,
    durationProvenance: input.specification.duration.provenance,
    aspectRatio: input.specification.aspectRatio.resolved,
    aspectProvenance: input.specification.aspectRatio.provenance,
    motionPresetId: input.specification.movement.motionPresetId,
    energy: input.specification.movement.energy,
    platform: input.specification.platform,
    approvedContinuity,
    sourceImageUrl: sourceImage,
    legacyViduPrompt: input.legacyViduPrompt ?? null,
    negativesPreserveDefaults: input.specification.negatives.preserveProviderDefaults,
    matrixNegatives: [...input.specification.negatives.canonical],
  };
}
