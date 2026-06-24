/**
 * Character → Film automation — auto-attach cast, style DNA, identity lock to orchestrator.
 */

import { createHcAssetReference, upsertHcAssetReference } from "@/lib/hc-asset-references";
import { linkCharacterToOrchestrator } from "@/lib/studio-production-orchestrator";
import { buildStudioStartHref } from "@/lib/studio-video-intents";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

export type CharacterFilmBridgeInput = {
  characterId: string;
  characterName: string;
  motionReady?: boolean;
  styleDnaCached?: boolean;
  identityLockCached?: boolean;
  hcProjectId?: string;
};

export function buildCreateVideoFromCharacterHref(input: CharacterFilmBridgeInput): string {
  return buildStudioStartHref({
    hcProject: input.hcProjectId,
    intent: "brand_story",
    idea: `Video featuring ${input.characterName}`,
    characterId: input.characterId,
  });
}

export function attachCharacterToProduction(
  project: HomeCheffProjectPackage,
  input: CharacterFilmBridgeInput
): HomeCheffProjectPackage {
  let next = linkCharacterToOrchestrator(project, input.characterId);
  const ref = createHcAssetReference({
    id: input.characterId,
    kind: "character",
    role: "hero",
    sourceService: "studio",
  });
  next = upsertHcAssetReference(next, ref);
  next = {
    ...next,
    metadata: {
      ...next.metadata,
      primaryCharacterId: input.characterId,
      motionReady: input.motionReady ?? false,
      styleDnaCached: input.styleDnaCached ?? false,
      identityLockCached: input.identityLockCached ?? false,
    },
    updatedAt: new Date().toISOString(),
  };
  return next;
}
