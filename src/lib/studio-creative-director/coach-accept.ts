/**
 * S.6G — Accept Creative Coach suggestions into Director answers only.
 * Never mutates Continuity or Prompt Matrix modules directly.
 */

import type { CreativeCoachSuggestion } from "@/lib/studio-creative-director/creative-coach";
import type { CreativeIntentAnswers } from "@/lib/studio-creative-director/creative-planner";

export type CoachAcceptResult = {
  applied: true;
  suggestionId: string;
  answers: CreativeIntentAnswers;
  /** Which answer keys changed. */
  changedKeys: (keyof CreativeIntentAnswers)[];
};

/**
 * Map an accepted coach suggestion into CreativeIntentAnswers.
 * Heuristic by suggestion id / label — still goes through Director planner.
 */
export function applyCoachSuggestionToAnswers(
  current: CreativeIntentAnswers,
  suggestion: CreativeCoachSuggestion
): CoachAcceptResult {
  if (suggestion.forced !== false) {
    throw new Error("Coach suggestions must never be forced");
  }

  const next: CreativeIntentAnswers = { ...current };
  const changed: (keyof CreativeIntentAnswers)[] = [];
  const id = suggestion.id.toLowerCase();
  const label = suggestion.label.toLowerCase();

  const set = <K extends keyof CreativeIntentAnswers>(key: K, value: CreativeIntentAnswers[K]) => {
    next[key] = value;
    changed.push(key);
  };

  if (id.includes("smile") || label.includes("smile")) {
    set("smile", "natural");
  }
  if (id.includes("bg") || label.includes("background") || label.includes("cleaner")) {
    set("background", "clean_office");
  }
  if (id.includes("attire") || label.includes("clothing") || label.includes("suit")) {
    set("suit", "business");
    set("attire", "business");
  }
  if (id.includes("posture") || label.includes("posture")) {
    set("styleProfile", "confident_posture");
  }
  if (id.includes("vertical") || label.includes("vertical") || label.includes("reel") || label.includes("tiktok")) {
    set("platform", "instagram");
    set("aspect", "9:16");
  }
  if (id.includes("commercial") || label.includes("commercial")) {
    set("commercialTone", "appetizing");
    set("purpose", "commercial");
  }
  if (id.includes("evening") || label.includes("evening") || label.includes("romantic") || label.includes("sunset")) {
    set("lighting", "warm_evening");
    set("mood", "cinematic_warm");
  }
  if (id.includes("food") || label.includes("food") || label.includes("chef") || label.includes("steam") || label.includes("menu")) {
    set("energy", "appetizing");
    set("styleProfile", "food_closeup");
  }
  if (id.includes("prep") || label.includes("preparation") || label.includes("cooking")) {
    set("story", "preparation_sequence");
  }
  if (id.includes("outdoor") || label.includes("outdoor")) {
    set("background", "outdoor_natural");
    set("lighting", "natural_daylight");
  }
  if (id.includes("casual") || label.includes("casual")) {
    set("suit", "casual");
    set("attire", "casual");
  }
  if (suggestion.category === "brand" || label.includes("brand")) {
    set("logo", true);
    set("brandingGoals", "brand_visible");
  }

  if (changed.length === 0) {
    set("styleProfile", suggestion.id);
    set("mood", suggestion.label.replace(/\s+/g, "_").slice(0, 48));
  }

  return {
    applied: true,
    suggestionId: suggestion.id,
    answers: next,
    changedKeys: changed,
  };
}
