/**
 * Location identity read-only hints for Visual Production, prompts, and Shot Planner.
 * Consumes Identity Spec Engine output — no image generation.
 */

import {
  locationIdentityFormFromLocation,
  parseLocationStructuredKeywords,
} from "@/lib/studio-location-identity-fields";
import { toIdentitySpec } from "@/lib/studio-identity-spec-engine";
import type { StudioShotType } from "@/lib/studio-scene-director";
import type { LocationIdentitySpec } from "@/types/studio-identity-spec";
import type { StudioLocationListItem } from "@/types/studio-api";
import type { SceneMemoryBundle } from "@/types/studio-memory-snapshots";

export type LocationIdentityShotHint = {
  preferredShotTypes: StudioShotType[];
  preferredCameraMovement: "static" | "tracking" | "push_in" | "pull_out";
  rationaleKey: string;
};

const TYPE_SHOT_HINTS: Record<string, LocationIdentityShotHint> = {
  market: {
    preferredShotTypes: ["wide", "extreme_wide"],
    preferredCameraMovement: "tracking",
    rationaleKey: "studio.locationIdentity.shotHint.market",
  },
  kitchen: {
    preferredShotTypes: ["close_up", "medium_close_up"],
    preferredCameraMovement: "push_in",
    rationaleKey: "studio.locationIdentity.shotHint.kitchen",
  },
  restaurant: {
    preferredShotTypes: ["medium", "medium_wide"],
    preferredCameraMovement: "push_in",
    rationaleKey: "studio.locationIdentity.shotHint.restaurant",
  },
  street: {
    preferredShotTypes: ["medium_wide", "wide"],
    preferredCameraMovement: "tracking",
    rationaleKey: "studio.locationIdentity.shotHint.street",
  },
  garden: {
    preferredShotTypes: ["wide", "medium_wide"],
    preferredCameraMovement: "pull_out",
    rationaleKey: "studio.locationIdentity.shotHint.garden",
  },
  living_room: {
    preferredShotTypes: ["medium", "medium_close_up"],
    preferredCameraMovement: "static",
    rationaleKey: "studio.locationIdentity.shotHint.livingRoom",
  },
  shop: {
    preferredShotTypes: ["medium_wide", "medium"],
    preferredCameraMovement: "tracking",
    rationaleKey: "studio.locationIdentity.shotHint.shop",
  },
  office: {
    preferredShotTypes: ["medium", "wide"],
    preferredCameraMovement: "static",
    rationaleKey: "studio.locationIdentity.shotHint.office",
  },
};

export function resolveLocationIdentityShotHint(
  locationType: string
): LocationIdentityShotHint | null {
  if (!locationType.trim()) {
    return null;
  }
  return TYPE_SHOT_HINTS[locationType] ?? null;
}

export function resolveLocationIdentityShotHintFromLocation(
  location: StudioLocationListItem | null | undefined
): LocationIdentityShotHint | null {
  if (!location) {
    return null;
  }
  const form = locationIdentityFormFromLocation(location);
  return resolveLocationIdentityShotHint(form.locationType);
}

export function buildLocationIdentityVisualProductionLines(
  spec: LocationIdentitySpec
): string[] {
  const structured = parseLocationStructuredKeywords(spec.visualKeywords);
  const lines: string[] = [];

  if (structured.locationType) {
    lines.push(`Location type: ${structured.locationType.replace(/_/g, " ")}.`);
  }
  if (structured.visualStyle) {
    lines.push(`Visual style: ${structured.visualStyle.replace(/_/g, " ")}.`);
  }
  if (structured.mood) {
    lines.push(`Mood: ${structured.mood.replace(/_/g, " ")}.`);
  }
  if (structured.architecture) {
    lines.push(`Architecture: ${structured.architecture.replace(/_/g, " ")}.`);
  }
  if (structured.materials) {
    lines.push(`Materials: ${structured.materials.replace(/_/g, " ")}.`);
  }
  if (structured.colorTheme) {
    lines.push(`Color theme: ${structured.colorTheme.replace(/_/g, " ")}.`);
  }
  if (structured.lighting) {
    lines.push(`Lighting: ${structured.lighting.replace(/_/g, " ")}.`);
  }
  if (structured.crowdLevel) {
    lines.push(`Crowd level: ${structured.crowdLevel.replace(/_/g, " ")}.`);
  }
  if (spec.memoryMetadata.visualIdentity.trim()) {
    lines.push(`Atmosphere: ${spec.memoryMetadata.visualIdentity.trim()}.`);
  }
  if (spec.memoryMetadata.worldMemory.trim()) {
    lines.push(`Visual details: ${spec.memoryMetadata.worldMemory.trim()}.`);
  }
  if (spec.world.name) {
    lines.push(`World: ${spec.world.name}.`);
  }

  return lines;
}

export function buildLocationIdentityMemoryPromptExtras(
  location: SceneMemoryBundle["location"]
): string[] {
  if (!location) {
    return [];
  }
  const structured = parseLocationStructuredKeywords(location.environmentKeywords);
  const lines: string[] = [];

  if (structured.locationType) {
    lines.push(`Location type: ${structured.locationType.replace(/_/g, " ")}.`);
  }
  if (structured.visualStyle) {
    lines.push(`Visual style: ${structured.visualStyle.replace(/_/g, " ")}.`);
  }
  if (structured.mood) {
    lines.push(`Mood: ${structured.mood.replace(/_/g, " ")}.`);
  }
  if (structured.architecture) {
    lines.push(`Architecture: ${structured.architecture.replace(/_/g, " ")}.`);
  }
  if (structured.materials) {
    lines.push(`Materials: ${structured.materials.replace(/_/g, " ")}.`);
  }
  if (structured.colorTheme) {
    lines.push(`Color theme: ${structured.colorTheme.replace(/_/g, " ")}.`);
  }
  if (structured.lighting) {
    lines.push(`Lighting: ${structured.lighting.replace(/_/g, " ")}.`);
  }
  if (structured.crowdLevel) {
    lines.push(`Crowd level: ${structured.crowdLevel.replace(/_/g, " ")}.`);
  }
  if (location.visualIdentity.trim()) {
    lines.push(`Atmosphere: ${location.visualIdentity.trim()}.`);
  }
  if (location.worldMemory.trim()) {
    lines.push(`Visual details: ${location.worldMemory.trim()}.`);
  }
  if (location.worldProfileName) {
    lines.push(`World: ${location.worldProfileName}.`);
  }

  return lines;
}

export function buildLocationIdentityPromptContext(
  location: StudioLocationListItem | null
): string {
  if (!location) {
    return "";
  }
  const lines = buildLocationIdentityVisualProductionLines(toIdentitySpec(location));
  return lines.join(" ");
}
