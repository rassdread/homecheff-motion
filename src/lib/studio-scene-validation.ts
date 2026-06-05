import { normalizeSceneDirectorFields } from "@/lib/studio-scene-director";
import {
  isMusicCueType,
  isMusicEndBehavior,
  isMusicEnergyTarget,
  isMusicStartBehavior,
  isMusicTransitionType,
} from "@/lib/studio-music-validation";
import {
  normalizeSoundOverrideList,
} from "@/lib/studio-sound-validation";
import {
  SOUND_AMBIENT_IDS,
  SOUND_CHARACTER_IDS,
  SOUND_ENVIRONMENT_IDS,
  SOUND_OBJECT_IDS,
  SOUND_TRANSITION_IDS,
} from "@/types/studio-sound-director";

export const STUDIO_SCENE_TITLE_MAX = 120;
export const STUDIO_SCENE_TEXT_MAX = 4000;
export const STUDIO_SCENE_DURATION_MIN = 1;
export const STUDIO_SCENE_DURATION_MAX = 120;

export type StudioSceneCreateInput = {
  title?: string;
  description?: string;
  action?: string;
  emotion?: string;
  camera?: string;
  shotType?: string;
  cameraMovement?: string;
  sceneEnergy?: string;
  transitionToNext?: string;
  durationSeconds?: number;
  locationId?: string | null;
  characterIds?: string[];
  propIds?: string[];
  musicCueType?: string;
  musicEnergyTarget?: string;
  musicTransitionType?: string;
  musicStartBehavior?: string;
  musicEndBehavior?: string;
  soundEnvironmentOverride?: string;
  soundCharacterOverride?: string;
  soundPropOverride?: string;
  soundTransitionOverride?: string;
  soundAmbientOverride?: string;
};

export type StudioSceneUpdateInput = StudioSceneCreateInput;

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string };

function trimText(value: string | undefined, max: number): string {
  return (value ?? "").trim().slice(0, max);
}

function trimField(value: string | undefined): string {
  return trimText(value, STUDIO_SCENE_TEXT_MAX);
}

function validateDuration(value: number | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const n = Math.round(value);
  if (n < STUDIO_SCENE_DURATION_MIN || n > STUDIO_SCENE_DURATION_MAX) {
    return undefined;
  }
  return n;
}

function validateIdList(ids: string[] | undefined): string[] | undefined {
  if (ids === undefined) {
    return undefined;
  }
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  return unique;
}

export function validateStudioSceneCreateInput(
  raw: StudioSceneCreateInput
): ValidationResult<{
  title: string;
  description: string;
  action: string;
  emotion: string;
  camera: string;
  shotType: string;
  cameraMovement: string;
  sceneEnergy: string;
  transitionToNext: string;
  durationSeconds: number;
  locationId: string | null;
  characterIds: string[];
  propIds: string[];
}> {
  const duration = validateDuration(raw.durationSeconds);
  if (raw.durationSeconds !== undefined && duration === undefined) {
    return { ok: false, code: "INVALID_DURATION", message: "Invalid scene duration." };
  }

  const director = normalizeSceneDirectorFields({
    shotType: raw.shotType ?? "",
    cameraMovement: raw.cameraMovement ?? "",
    sceneEnergy: raw.sceneEnergy,
    camera: raw.camera,
  });

  return {
    ok: true,
    value: {
      title: trimText(raw.title, STUDIO_SCENE_TITLE_MAX) || "Scene",
      description: trimField(raw.description),
      action: trimField(raw.action),
      emotion: trimField(raw.emotion),
      camera: director.camera,
      shotType: director.shotType,
      cameraMovement: director.cameraMovement,
      sceneEnergy: director.sceneEnergy,
      transitionToNext: trimField(raw.transitionToNext),
      durationSeconds: duration ?? 5,
      locationId: raw.locationId?.trim() || null,
      characterIds: validateIdList(raw.characterIds) ?? [],
      propIds: validateIdList(raw.propIds) ?? [],
    },
  };
}

export function validateStudioSceneUpdateInput(
  raw: StudioSceneUpdateInput
): ValidationResult<{
  title?: string;
  description?: string;
  action?: string;
  emotion?: string;
  camera?: string;
  shotType?: string;
  cameraMovement?: string;
  sceneEnergy?: string;
  transitionToNext?: string;
  durationSeconds?: number;
  locationId?: string | null;
  characterIds?: string[];
  propIds?: string[];
  musicCueType?: string;
  musicEnergyTarget?: string;
  musicTransitionType?: string;
  musicStartBehavior?: string;
  musicEndBehavior?: string;
  soundEnvironmentOverride?: string;
  soundCharacterOverride?: string;
  soundPropOverride?: string;
  soundTransitionOverride?: string;
  soundAmbientOverride?: string;
}> {
  const patch: {
    title?: string;
    description?: string;
    action?: string;
    emotion?: string;
    camera?: string;
    shotType?: string;
    cameraMovement?: string;
    sceneEnergy?: string;
    transitionToNext?: string;
    durationSeconds?: number;
    locationId?: string | null;
    characterIds?: string[];
    propIds?: string[];
    musicCueType?: string;
    musicEnergyTarget?: string;
    musicTransitionType?: string;
    musicStartBehavior?: string;
    musicEndBehavior?: string;
    soundEnvironmentOverride?: string;
    soundCharacterOverride?: string;
    soundPropOverride?: string;
    soundTransitionOverride?: string;
    soundAmbientOverride?: string;
  } = {};

  if (raw.title !== undefined) {
    const title = trimText(raw.title, STUDIO_SCENE_TITLE_MAX);
    if (!title) {
      return { ok: false, code: "TITLE_REQUIRED", message: "Scene title is required." };
    }
    patch.title = title;
  }
  if (raw.description !== undefined) patch.description = trimField(raw.description);
  if (raw.action !== undefined) patch.action = trimField(raw.action);
  if (raw.emotion !== undefined) patch.emotion = trimField(raw.emotion);
  if (
    raw.camera !== undefined ||
    raw.shotType !== undefined ||
    raw.cameraMovement !== undefined ||
    raw.sceneEnergy !== undefined
  ) {
    const director = normalizeSceneDirectorFields({
      shotType: raw.shotType ?? "",
      cameraMovement: raw.cameraMovement ?? "",
      sceneEnergy: raw.sceneEnergy,
      camera: raw.camera,
    });
    if (raw.camera !== undefined || raw.shotType !== undefined) {
      patch.camera = director.camera;
      patch.shotType = director.shotType;
    }
    if (raw.shotType !== undefined) {
      patch.shotType = director.shotType;
    }
    if (raw.cameraMovement !== undefined) {
      patch.cameraMovement = director.cameraMovement;
    }
    if (raw.sceneEnergy !== undefined) {
      patch.sceneEnergy = director.sceneEnergy;
    }
  }
  if (raw.transitionToNext !== undefined) {
    patch.transitionToNext = trimField(raw.transitionToNext);
  }
  if (raw.durationSeconds !== undefined) {
    const duration = validateDuration(raw.durationSeconds);
    if (duration === undefined) {
      return { ok: false, code: "INVALID_DURATION", message: "Invalid scene duration." };
    }
    patch.durationSeconds = duration;
  }
  if (raw.locationId !== undefined) {
    patch.locationId = raw.locationId?.trim() || null;
  }
  if (raw.characterIds !== undefined) {
    patch.characterIds = validateIdList(raw.characterIds) ?? [];
  }
  if (raw.propIds !== undefined) {
    patch.propIds = validateIdList(raw.propIds) ?? [];
  }
  if (raw.musicCueType !== undefined) {
    const v = trimField(raw.musicCueType);
    if (v && !isMusicCueType(v)) {
      return { ok: false, code: "INVALID_MUSIC_CUE", message: "Invalid music cue type." };
    }
    patch.musicCueType = v;
  }
  if (raw.musicEnergyTarget !== undefined) {
    const v = trimField(raw.musicEnergyTarget);
    if (v && !isMusicEnergyTarget(v)) {
      return { ok: false, code: "INVALID_MUSIC_ENERGY", message: "Invalid music energy target." };
    }
    patch.musicEnergyTarget = v;
  }
  if (raw.musicTransitionType !== undefined) {
    const v = trimField(raw.musicTransitionType);
    if (v && !isMusicTransitionType(v)) {
      return { ok: false, code: "INVALID_MUSIC_TRANSITION", message: "Invalid music transition." };
    }
    patch.musicTransitionType = v;
  }
  if (raw.musicStartBehavior !== undefined) {
    const v = trimField(raw.musicStartBehavior);
    if (v && !isMusicStartBehavior(v)) {
      return { ok: false, code: "INVALID_MUSIC_START", message: "Invalid music start behavior." };
    }
    patch.musicStartBehavior = v;
  }
  if (raw.musicEndBehavior !== undefined) {
    const v = trimField(raw.musicEndBehavior);
    if (v && !isMusicEndBehavior(v)) {
      return { ok: false, code: "INVALID_MUSIC_END", message: "Invalid music end behavior." };
    }
    patch.musicEndBehavior = v;
  }
  if (raw.soundEnvironmentOverride !== undefined) {
    patch.soundEnvironmentOverride = normalizeSoundOverrideList(
      trimField(raw.soundEnvironmentOverride),
      SOUND_ENVIRONMENT_IDS
    );
  }
  if (raw.soundCharacterOverride !== undefined) {
    patch.soundCharacterOverride = normalizeSoundOverrideList(
      trimField(raw.soundCharacterOverride),
      SOUND_CHARACTER_IDS
    );
  }
  if (raw.soundPropOverride !== undefined) {
    patch.soundPropOverride = normalizeSoundOverrideList(
      trimField(raw.soundPropOverride),
      SOUND_OBJECT_IDS
    );
  }
  if (raw.soundTransitionOverride !== undefined) {
    patch.soundTransitionOverride = normalizeSoundOverrideList(
      trimField(raw.soundTransitionOverride),
      SOUND_TRANSITION_IDS
    );
  }
  if (raw.soundAmbientOverride !== undefined) {
    patch.soundAmbientOverride = normalizeSoundOverrideList(
      trimField(raw.soundAmbientOverride),
      SOUND_AMBIENT_IDS
    );
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, code: "EMPTY_UPDATE", message: "No fields to update." };
  }

  return { ok: true, value: patch };
}
