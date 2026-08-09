/**
 * S.6E — Provider-neutral CreativeSpecification (intermediate structured representation).
 * Not a giant prompt string. Transforms convert this + ContinuityBundle into provider requests.
 */

import type { StudioCreativeExperienceId } from "@/lib/studio-prompt-matrix/experience-ids";
import type { ContinuityBundle } from "@/lib/studio-prompt-matrix/continuity-bundle";
import type {
  StudioMatrixDetailLevel,
  StudioRuntimeProviderId,
} from "@/lib/studio-prompt-matrix/types";
import {
  STUDIO_PROMPT_MATRIX_VERSION,
  STUDIO_PROVIDER_TRANSFORM_VERSION,
} from "@/lib/studio-prompt-matrix/types";
import type { ResolvedAspect } from "@/lib/studio-prompt-matrix/aspect-resolution";
import type { ResolvedDuration } from "@/lib/studio-prompt-matrix/duration-resolution";

export type CreativeNegatives = {
  canonical: string[];
  /** Provider transforms may append/adapt — never weaken. */
  preserveProviderDefaults: boolean;
};

export type CreativeSpecification = {
  matrixVersion: typeof STUDIO_PROMPT_MATRIX_VERSION;
  providerTransformVersion: typeof STUDIO_PROVIDER_TRANSFORM_VERSION;
  experience: StudioCreativeExperienceId;
  detailLevel: StudioMatrixDetailLevel;
  objective: string | null;
  subject: string | null;
  story: {
    title: string | null;
    description: string | null;
    action: string | null;
    emotion: string | null;
  };
  continuity: {
    characterIds: string[];
    locationId: string | null;
    propIds: string[];
    worldId: string | null;
    continuityCase: ContinuityBundle["continuityMeta"]["continuityCase"];
    identityRules: string[];
    strength: ContinuityBundle["continuityMeta"]["continuityStrength"];
  };
  composition: {
    shotType: string | null;
    framing: string | null;
  };
  camera: {
    movement: string | null;
    legacyCamera: string | null;
  };
  movement: {
    energy: string | null;
    motionPresetId: string | null;
  };
  lighting: string | null;
  style: {
    styleProfile: string | null;
    directorProfile: string | null;
    worldVisualStyle: string | null;
  };
  performance: {
    action: string | null;
    emotion: string | null;
  };
  environment: {
    locationSummary: string | null;
    worldTone: string | null;
  };
  audio: {
    voiceCharacterId: string | null;
    language: string | null;
    mood: string | null;
    energy: string | null;
    script: string | null;
  };
  duration: ResolvedDuration;
  aspectRatio: ResolvedAspect;
  platform: string | null;
  audience: string | null;
  brand: {
    brandKitId: string | null;
    available: boolean;
    overlayApplied: boolean;
  };
  quality: {
    instructions: string[];
  };
  negatives: CreativeNegatives;
  providerHints: {
    preferredRuntimeProvider: StudioRuntimeProviderId | null;
    capabilityNotes: string[];
  };
  overlays: {
    promptPresetId: string | null;
    promptPresetApplied: boolean;
  };
  modulesIncluded: string[];
};

export function emptyCreativeSpecification(
  experience: StudioCreativeExperienceId,
  detailLevel: StudioMatrixDetailLevel = "PROFESSIONAL"
): CreativeSpecification {
  return {
    matrixVersion: STUDIO_PROMPT_MATRIX_VERSION,
    providerTransformVersion: STUDIO_PROVIDER_TRANSFORM_VERSION,
    experience,
    detailLevel,
    objective: null,
    subject: null,
    story: {
      title: null,
      description: null,
      action: null,
      emotion: null,
    },
    continuity: {
      characterIds: [],
      locationId: null,
      propIds: [],
      worldId: null,
      continuityCase: "none",
      identityRules: [],
      strength: null,
    },
    composition: { shotType: null, framing: null },
    camera: { movement: null, legacyCamera: null },
    movement: { energy: null, motionPresetId: null },
    lighting: null,
    style: {
      styleProfile: null,
      directorProfile: null,
      worldVisualStyle: null,
    },
    performance: { action: null, emotion: null },
    environment: { locationSummary: null, worldTone: null },
    audio: {
      voiceCharacterId: null,
      language: null,
      mood: null,
      energy: null,
      script: null,
    },
    duration: {
      resolvedSeconds: null,
      provenance: "unresolved",
      sources: {},
    },
    aspectRatio: {
      resolved: null,
      requested: null,
      provenance: "unresolved",
      sources: {},
      why: "unresolved",
    },
    platform: null,
    audience: null,
    brand: {
      brandKitId: null,
      available: false,
      overlayApplied: false,
    },
    quality: { instructions: [] },
    negatives: { canonical: [], preserveProviderDefaults: true },
    providerHints: {
      preferredRuntimeProvider: null,
      capabilityNotes: [],
    },
    overlays: {
      promptPresetId: null,
      promptPresetApplied: false,
    },
    modulesIncluded: [],
  };
}
