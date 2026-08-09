/**
 * S.6E — Safe Matrix inspection for development/admin diagnostics.
 * Does not expose full private prompts, secrets, or sensitive identity text.
 */

import type { CreativeSpecification } from "@/lib/studio-prompt-matrix/creative-specification";
import {
  inspectContinuityModulePresence,
  type ContinuityBundle,
} from "@/lib/studio-prompt-matrix/continuity-bundle";
import { getExperienceRegistryEntry } from "@/lib/studio-prompt-matrix/experience-registry";

export type StudioMatrixDebugInspection = {
  experience: CreativeSpecification["experience"];
  compliance: string;
  detailLevel: CreativeSpecification["detailLevel"];
  matrixVersion: string;
  providerTransformVersion: string;
  resolvedSelections: {
    shotType: string | null;
    cameraMovement: string | null;
    energy: string | null;
    action: string | null;
    emotion: string | null;
    styleProfile: string | null;
    directorProfile: string | null;
    platform: string | null;
    durationSeconds: number | null;
    durationProvenance: string;
    aspectRatio: string | null;
    aspectProvenance: string;
    aspectWhy: string;
  };
  continuityModulePresence: ReturnType<typeof inspectContinuityModulePresence>;
  identityRuleCount: number;
  characterCount: number;
  propCount: number;
  hasLocation: boolean;
  hasWorld: boolean;
  brandAvailable: boolean;
  promptPresetApplied: boolean;
  modulesIncluded: string[];
  preferredRuntimeProvider: string | null;
  providerTransform: string | null;
};

export function inspectMatrixAssembly(input: {
  specification: CreativeSpecification;
  continuity: ContinuityBundle;
  providerTransform?: string | null;
}): StudioMatrixDebugInspection {
  const registry = getExperienceRegistryEntry(input.specification.experience);
  return {
    experience: input.specification.experience,
    compliance: registry.compliance,
    detailLevel: input.specification.detailLevel,
    matrixVersion: input.specification.matrixVersion,
    providerTransformVersion: input.specification.providerTransformVersion,
    resolvedSelections: {
      shotType: input.specification.composition.shotType,
      cameraMovement: input.specification.camera.movement,
      energy: input.specification.movement.energy,
      action: input.specification.performance.action,
      emotion: input.specification.performance.emotion,
      styleProfile: input.specification.style.styleProfile,
      directorProfile: input.specification.style.directorProfile,
      platform: input.specification.platform,
      durationSeconds: input.specification.duration.resolvedSeconds,
      durationProvenance: input.specification.duration.provenance,
      aspectRatio: input.specification.aspectRatio.resolved,
      aspectProvenance: input.specification.aspectRatio.provenance,
      aspectWhy: input.specification.aspectRatio.why,
    },
    continuityModulePresence: inspectContinuityModulePresence(input.continuity),
    identityRuleCount: input.specification.continuity.identityRules.length,
    characterCount: input.specification.continuity.characterIds.length,
    propCount: input.specification.continuity.propIds.length,
    hasLocation: Boolean(input.specification.continuity.locationId),
    hasWorld: Boolean(input.specification.continuity.worldId),
    brandAvailable: input.specification.brand.available,
    promptPresetApplied: input.specification.overlays.promptPresetApplied,
    modulesIncluded: [...input.specification.modulesIncluded],
    preferredRuntimeProvider: input.specification.providerHints.preferredRuntimeProvider,
    providerTransform: input.providerTransform ?? null,
  };
}
