/**
 * World identity read-only hints for Visual/Audio Production, Shot Planner, Consistency.
 */

import { worldIdentityFormFromWorld } from "@/lib/studio-world-identity-fields";
import {
  parseWorldAudioStructured,
  parseWorldContinuitySections,
  parseWorldRenderStrategies,
  parseWorldShotsStructured,
  parseWorldVisualStructured,
  WORLD_SHOTS_MARKER,
} from "@/lib/studio-world-identity-structured";
import { toIdentitySpec } from "@/lib/studio-identity-spec-engine";
import type { StudioShotType } from "@/lib/studio-scene-director";
import type { WorldIdentitySpec } from "@/types/studio-identity-spec";
import type { StudioWorldProfileListItem } from "@/types/studio-api";
import type { WorldMemorySnapshot } from "@/types/studio-memory-snapshots";

export type WorldIdentityShotHint = {
  preferredShotTypes: StudioShotType[];
  pacing: string;
  rationaleKey: string;
};

const WORLD_TYPE_SHOT_HINTS: Record<string, WorldIdentityShotHint> = {
  food_universe: {
    preferredShotTypes: ["close_up", "medium_close_up"],
    pacing: "slow",
    rationaleKey: "studio.worldIdentity.shotHint.food",
  },
  sports_universe: {
    preferredShotTypes: ["medium_wide", "medium"],
    pacing: "fast",
    rationaleKey: "studio.worldIdentity.shotHint.sports",
  },
  community_universe: {
    preferredShotTypes: ["medium", "medium_wide"],
    pacing: "medium",
    rationaleKey: "studio.worldIdentity.shotHint.community",
  },
  cinematic_universe: {
    preferredShotTypes: ["wide", "extreme_wide"],
    pacing: "slow",
    rationaleKey: "studio.worldIdentity.shotHint.cinematic",
  },
};

export function resolveWorldIdentityShotHint(
  world: StudioWorldProfileListItem | null | undefined
): WorldIdentityShotHint | null {
  if (!world) return null;
  const form = worldIdentityFormFromWorld(world);
  if (form.preferredShots.trim()) {
    const shots = form.preferredShots.split(",").map((s) => s.trim()).filter(Boolean);
    const mapped = shots
      .map((s) => {
        if (s === "detail") return "close_up" as StudioShotType;
        if (s === "group") return "medium" as StudioShotType;
        if (s === "tracking") return "medium_wide" as StudioShotType;
        if (s === "establishing") return "wide" as StudioShotType;
        return s as StudioShotType;
      })
      .filter(Boolean);
    if (mapped.length > 0) {
      return {
        preferredShotTypes: mapped,
        pacing: form.pacing || "medium",
        rationaleKey: "studio.worldIdentity.shotHint.custom",
      };
    }
  }
  return WORLD_TYPE_SHOT_HINTS[form.worldType] ?? null;
}

export function buildWorldIdentityVisualProductionLines(
  spec: WorldIdentitySpec
): string[] {
  const visual = parseWorldVisualStructured(spec.memoryMetadata.visualStyle);
  const continuity = parseWorldContinuitySections(spec.memoryMetadata.continuityRules);
  const lines: string[] = [];

  if (visual.worldType) lines.push(`World type: ${visual.worldType.replace(/_/g, " ")}.`);
  if (visual.visualStyle) lines.push(`Visual style: ${visual.visualStyle.replace(/_/g, " ")}.`);
  if (visual.shapeLanguage) lines.push(`Shape language: ${visual.shapeLanguage}.`);
  if (visual.colorTheme) lines.push(`Color rules: ${visual.colorTheme}.`);
  if (visual.lighting) lines.push(`Lighting: ${visual.lighting.replace(/_/g, " ")}.`);
  if (visual.mood) lines.push(`Mood: ${visual.mood}.`);
  if (visual.environmentFeel) lines.push(`Environment feel: ${visual.environmentFeel}.`);
  if (continuity.forbiddenElements) {
    lines.push(`Forbidden visuals: ${continuity.forbiddenElements}.`);
  }
  if (continuity.brandRules) lines.push(`Brand rules: ${continuity.brandRules}.`);

  return lines;
}

export function buildWorldIdentityAudioProductionLines(
  spec: WorldIdentitySpec
): string[] {
  const audio = parseWorldAudioStructured(spec.memoryMetadata.tone);
  const continuity = parseWorldContinuitySections(spec.memoryMetadata.continuityRules);
  const lines: string[] = [];

  if (audio.musicStyle) lines.push(`Music style: ${audio.musicStyle}.`);
  if (audio.ambience) lines.push(`Ambience: ${audio.ambience}.`);
  if (audio.audioEnergy) lines.push(`Energy: ${audio.audioEnergy}.`);
  if (audio.voiceDirection) lines.push(`Voice direction: ${audio.voiceDirection.replace(/_/g, " ")}.`);
  if (audio.soundFeel) lines.push(`Sound feel: ${audio.soundFeel}.`);
  if (continuity.audioForbiddenElements) {
    lines.push(`Forbidden audio: ${continuity.audioForbiddenElements}.`);
  }

  return lines;
}

export function buildWorldIdentityRenderStrategyHints(
  world: StudioWorldProfileListItem
): string[] {
  return parseWorldRenderStrategies(world.continuityRules).map(
    (s) => `Render strategy: ${s.replace(/_/g, " ")}.`
  );
}

export function buildWorldIdentityRulePresence(world: StudioWorldProfileListItem): {
  visual: boolean;
  color: boolean;
  audio: boolean;
  voice: boolean;
  shots: boolean;
  motion: boolean;
  forbidden: boolean;
} {
  const visual = parseWorldVisualStructured(world.visualStyle);
  const audio = parseWorldAudioStructured(world.tone);
  const continuity = parseWorldContinuitySections(world.continuityRules);
  const shotsIdx = world.continuityRules.indexOf(WORLD_SHOTS_MARKER);
  const shots =
    shotsIdx >= 0 ?
      parseWorldShotsStructured(
        world.continuityRules.slice(shotsIdx + WORLD_SHOTS_MARKER.length)
      )
    : parseWorldShotsStructured("");

  return {
    visual: Boolean(visual.visualStyle || visual.shapeLanguage || visual.environmentFeel),
    color: Boolean(visual.colorTheme),
    audio: Boolean(audio.musicStyle || audio.ambience || audio.soundFeel),
    voice: Boolean(audio.voiceDirection),
    shots: Boolean(shots.preferredShots || shots.cameraStyle),
    motion: Boolean(shots.motionStyle || shots.pacing),
    forbidden: Boolean(
      continuity.forbiddenElements || continuity.audioForbiddenElements || continuity.brandRules
    ),
  };
}

export function buildWorldIdentityMemoryPromptExtras(
  world: WorldMemorySnapshot | null
): string[] {
  if (!world) return [];
  return [
    ...buildWorldIdentityVisualProductionLines({
      kind: "world",
      id: world.id,
      name: world.name,
      type: "",
      role: "",
      description: world.description,
      personality: world.tone,
      visualKeywords: "",
      visualRules: world.visualStyle,
      tags: [],
      references: [],
      world: { id: world.id, name: world.name },
      usageContext: world.continuityRules,
      forbiddenElements: "",
      continuityMetadata: {
        notes: world.continuityRules,
        continuityStrength: world.continuityStrength,
      },
      memoryMetadata: {
        visualStyle: world.visualStyle,
        tone: world.tone,
        continuityRules: world.continuityRules,
      },
    }),
    ...buildWorldIdentityAudioProductionLines({
      kind: "world",
      id: world.id,
      name: world.name,
      type: "",
      role: "",
      description: world.description,
      personality: world.tone,
      visualKeywords: "",
      visualRules: "",
      tags: [],
      references: [],
      world: { id: world.id, name: world.name },
      usageContext: "",
      forbiddenElements: "",
      continuityMetadata: {
        notes: "",
        continuityStrength: world.continuityStrength,
      },
      memoryMetadata: {
        visualStyle: world.visualStyle,
        tone: world.tone,
        continuityRules: world.continuityRules,
      },
    }),
  ];
}

export function buildWorldIdentityPromptContext(
  world: StudioWorldProfileListItem | null
): string {
  if (!world) return "";
  return buildWorldIdentityVisualProductionLines(toIdentitySpec(world)).join(" ");
}
