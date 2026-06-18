/**
 * Build routes with prefilled tool settings for Assistant V4.
 */

import type { AssistantToolCapability, AssistantToolMatchSettings } from "@/types/assistant-v4";

export function buildAssistantToolRoute(
  tool: AssistantToolCapability,
  settings: AssistantToolMatchSettings
): string {
  const [basePath, existingQuery = ""] = tool.route.split("?");
  const params = new URLSearchParams(existingQuery);

  for (const [key, value] of Object.entries(settings)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    params.set(key, String(value));
  }

  if (tool.morphActionId && !params.has("morph")) {
    params.set("morph", tool.morphActionId);
  }
  if (!params.has("workflow") && tool.category === "morph") {
    params.set("workflow", "edit");
  }

  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function mergeToolSettings(
  tool: AssistantToolCapability,
  recommended: AssistantToolMatchSettings
): AssistantToolMatchSettings {
  return { ...tool.defaultSettings, ...recommended };
}

export function settingsToPreserveLabels(
  settings: AssistantToolMatchSettings,
  locale: "nl" | "en"
): string[] {
  const labels: string[] = [];
  const nl = locale === "nl";
  if (settings.preserveGlobe) {
    labels.push(nl ? "wereldbol" : "globe");
  }
  if (settings.preserveOutfit) {
    labels.push(nl ? "outfit" : "outfit");
  }
  if (settings.preservePose) {
    labels.push(nl ? "pose" : "pose");
  }
  if (settings.preserveIdentity || settings.preserveFace) {
    labels.push(nl ? "identiteit" : "identity");
  }
  if (settings.preserveBreedShape) {
    labels.push(nl ? "rasvorm" : "breed shape");
  }
  if (settings.preserveFurPattern) {
    labels.push(nl ? "vachtpatroon" : "fur pattern");
  }
  if (settings.preserveEyeColor) {
    labels.push(nl ? "oogkleur" : "eye color");
  }
  if (settings.preserveBackground) {
    labels.push(nl ? "achtergrond" : "background");
  }
  if (settings.preserveCharacters) {
    labels.push(nl ? "personages" : "characters");
  }
  return labels;
}
