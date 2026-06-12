import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

export type StudioProjectInventory = {
  available: string[];
  missing: string[];
  optional: string[];
  suggestions: string[];
};

export function buildStudioProjectInventory(project?: HomeCheffProjectPackage | null): StudioProjectInventory {
  const available: string[] = [];
  const missing: string[] = [];
  const optional: string[] = [];
  const suggestions: string[] = [];

  if (!project) {
    return {
      available: [],
      missing: ["characters", "locations", "world", "voice", "music"],
      optional: ["subtitles", "translations"],
      suggestions: ["Let AI create characters and worlds from your idea."],
    };
  }

  const refs = project.assetReferences ?? [];
  const hasCharacters = refs.some((r) => r.kind === "character" || r.role?.toLowerCase().includes("character"));
  const hasLocations = refs.some((r) => r.kind === "location" || r.role?.toLowerCase().includes("location"));
  const hasMedia = refs.length > 0 || Boolean(project.servicePayload.editor);
  const hasMotion = Boolean(project.servicePayload.motion);
  const hasPublish = Boolean(project.servicePayload.publish);
  const hasStudio = Boolean(project.servicePayload.studio);

  if (hasCharacters) available.push("characters");
  else missing.push("characters");

  if (hasLocations) available.push("locations");
  else missing.push("locations");

  if (hasStudio) available.push("studio_scenes");
  else missing.push("world");

  if (hasMedia) available.push("media");
  if (project.title) available.push("title");
  if (project.description) available.push("brief");

  if (!hasMotion) missing.push("motion");
  if (!hasPublish) optional.push("publish_plan");

  optional.push("subtitles", "translations");

  if (missing.includes("characters")) {
    suggestions.push("Use AI character creation or pick from Library.");
  }
  if (missing.includes("world")) {
    suggestions.push("AI can propose worlds and locations from your storyline.");
  }
  if (!hasMotion) {
    suggestions.push("Plan motion clips after scenes are approved.");
  }

  return { available, missing, optional, suggestions };
}
