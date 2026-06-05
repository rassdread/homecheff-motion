import type { StudioLocationCategory } from "@/lib/studio-location-categories";
import type { StudioPropCategory } from "@/lib/studio-prop-categories";
import type {
  SoundAmbientId,
  SoundCharacterId,
  SoundEnvironmentId,
  SoundObjectId,
  SoundTransitionId,
} from "@/types/studio-sound-director";

/** Location category → default environment sounds. */
export const LOCATION_ENVIRONMENT_SOUNDS: Record<
  StudioLocationCategory,
  SoundEnvironmentId[]
> = {
  city: ["city", "movement", "conversation"],
  restaurant: ["restaurant", "kitchen_ambience", "plates", "people_talking"],
  garden: ["garden", "birds", "wind", "leaves"],
  market: ["market", "crowd", "conversation", "movement"],
  street: ["street", "movement", "conversation"],
  home: ["movement"],
  office: ["office", "movement"],
  nature: ["nature", "birds", "wind"],
  fantasy: ["wind", "movement"],
  other: ["movement"],
};

/** Prop category → object sounds. */
export const PROP_OBJECT_SOUNDS: Partial<Record<StudioPropCategory, SoundObjectId[]>> = {
  phone: ["phone", "notification", "typing"],
  laptop: ["typing"],
  food: ["cooking", "sizzling"],
  drink: ["paper"],
  vehicle: ["vehicle", "engine", "road_noise", "door"],
  packaging: ["package", "paper", "cardboard", "bag_movement"],
  tool: ["cutting"],
  furniture: ["door"],
  screen: ["typing"],
};

/** Action keyword → character + object sounds. */
export const ACTION_SOUND_HINTS: Record<
  string,
  { character: SoundCharacterId[]; object: SoundObjectId[] }
> = {
  walking: { character: ["footsteps"], object: [] },
  cooking: { character: [], object: ["cooking", "sizzling", "cutting"] },
  typing: { character: [], object: ["typing"] },
  talking: { character: ["crowd_presence"], object: [] },
  shopping: { character: ["footsteps", "clothing_movement"], object: ["bag_movement"] },
  presenting: { character: ["clothing_movement"], object: [] },
  celebrating: { character: ["applause", "laughter"], object: [] },
  working: { character: [], object: ["typing"] },
};

/** Ambient defaults per location category. */
export const LOCATION_AMBIENT_SOUNDS: Partial<
  Record<StudioLocationCategory, SoundAmbientId[]>
> = {
  city: ["distant_traffic"],
  market: ["marketplace_ambience"],
  restaurant: ["subtle_room_tone"],
  garden: ["birds"],
  street: ["distant_traffic"],
  office: ["subtle_room_tone"],
  nature: ["birds"],
  home: ["subtle_room_tone"],
};

export function parseSoundIdList<T extends string>(
  raw: string | null | undefined,
  allowed: readonly T[]
): T[] {
  const ids = (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return ids.filter((id): id is T => (allowed as readonly string[]).includes(id));
}
