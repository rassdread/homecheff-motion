/**
 * Studio V44 — attention target mapping per character.
 */

import type { AttentionTarget, AttentionTargetPlan } from "@/types/studio-character-blocking";
import type { SceneVisualRole } from "@/types/studio-scene-composition";
import type { StudioSceneDetail } from "@/types/studio-api";

export function buildAttentionTarget(params: {
  scene: StudioSceneDetail;
  characterId: string;
  characterName: string;
  visualRole: SceneVisualRole;
  isActiveSpeaker: boolean;
  isNarratorScene: boolean;
  primarySubjectName: string | null;
  visualFocusKind: string;
  visualFocusName: string | null;
}): AttentionTargetPlan {
  let target: AttentionTarget = "AUDIENCE";
  let targetName: string | null = null;

  if (params.isActiveSpeaker) {
    target = "CAMERA";
  } else if (params.isNarratorScene) {
    target = params.visualRole === "background_character" ? "LOCATION" : "CAMERA";
  } else if (params.visualFocusKind === "product" || params.visualFocusKind === "brand") {
    target = params.visualRole === "primary_subject" ? "PRODUCT" : "PRODUCT";
    targetName = params.visualFocusName;
  } else if (params.visualFocusKind === "prop") {
    target = params.visualRole === "primary_subject" ? "PROP" : "PROP";
    targetName = params.visualFocusName;
  } else if (params.visualRole === "background_character") {
    target = "LOCATION";
    targetName = params.scene.location?.name ?? null;
  } else if (
    params.visualRole === "secondary_subject" ||
    params.visualRole === "supporting_character"
  ) {
    target = "CHARACTER";
    targetName = params.primarySubjectName;
  } else if (params.visualRole === "primary_subject") {
    target = "CAMERA";
  }

  return {
    sceneId: params.scene.id,
    characterId: params.characterId,
    characterName: params.characterName,
    target,
    targetName,
    summaryKey: "studio.blocking.attention.summary",
  };
}

export function buildAttentionTargetsForScene(params: {
  scene: StudioSceneDetail;
  roles: Array<{ characterId: string; characterName: string; visualRole: SceneVisualRole }>;
  activeSpeakerId: string | null;
  isNarratorScene: boolean;
  primarySubjectName: string | null;
  visualFocusKind: string;
  visualFocusName: string | null;
}): AttentionTargetPlan[] {
  return params.roles.map((row) =>
    buildAttentionTarget({
      scene: params.scene,
      characterId: row.characterId,
      characterName: row.characterName,
      visualRole: row.visualRole,
      isActiveSpeaker: row.characterId === params.activeSpeakerId,
      isNarratorScene: params.isNarratorScene,
      primarySubjectName: params.primarySubjectName,
      visualFocusKind: params.visualFocusKind,
      visualFocusName: params.visualFocusName,
    })
  );
}
