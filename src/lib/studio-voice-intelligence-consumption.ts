/**
 * Voice intelligence consumption — director context from existing marketplace metadata.
 * No new voice provider; reads voiceNotes, compatibility scores, accent, and persona memory.
 */

import { parseVoiceSelectionMemory } from "@/lib/studio-voice-selection-memory";
import { buildDirectorVoiceSuggestions } from "@/lib/studio-voice-location-suggestions";
import type { StudioCharacterListItem } from "@/types/studio-api";

/** Storytelling direction hints keyed by persona preset (advisory, not auto-accent). */
const PERSONA_DIRECTOR_HINTS: Record<string, string> = {
  jamaican_street_chef: "Caribbean street-food storytelling — warm, rhythmic, community pride.",
  local_storyteller: "Local storyteller tone — conversational, grounded, neighborhood authenticity.",
  british_chef: "Refined British culinary narration — articulate, measured pacing.",
  luxury_brand_voice: "Premium cinematic narration — polished, aspirational, luxury brand cadence.",
  fashion_narrator: "High-end editorial narration — elegant, confident, visual-first language.",
  dutch_grower: "Dutch grower community tone — practical, local, down-to-earth Dutch warmth.",
  community_organizer: "Community organizer voice — inclusive, encouraging, neighborhood-focused.",
  american_food_host: "American food-host energy — upbeat, accessible, demo-friendly pacing.",
  caribbean_farmer: "Caribbean farmer storytelling — earthy pride, market-day warmth.",
  neighborhood_host: "Neighborhood host tone — friendly, familiar, invite-the-viewer-in.",
};

const ACCENT_DIRECTOR_HINTS: Record<string, string> = {
  "english.jamaican": "Jamaican accent context — Caribbean rhythm and street-market warmth.",
  "english.british": "British accent context — premium, articulate, cinematic narration.",
  "english.caribbean": "Caribbean accent context — island community storytelling energy.",
  "dutch.nederlands": "Dutch accent context — local Netherlands community tone.",
  "dutch.surinaams": "Surinamese-Dutch accent context — multicultural neighborhood warmth.",
  "english.american": "American accent context — accessible, demo-friendly host energy.",
};

function uniqueLines(lines: string[], max = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const key = line.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
    if (out.length >= max) break;
  }
  return out;
}

export function buildCharacterVoiceIntelligenceLines(
  character: StudioCharacterListItem
): string[] {
  const lines: string[] = [];
  const memory = parseVoiceSelectionMemory(character.voiceNotes ?? "");
  if (memory) {
    if (memory.voiceName.trim()) {
      const score =
        memory.compatibilityScore >= 50
          ? ` (compatibility ${memory.compatibilityScore}%)`
          : "";
      lines.push(`Voice: ${character.name} — ${memory.voiceName}${score}.`);
    }
    if (memory.matchedAccentLabelKey) {
      const accentHint = memory.matchedAccentId
        ? ACCENT_DIRECTOR_HINTS[memory.matchedAccentId]
        : null;
      if (accentHint) {
        lines.push(accentHint);
      }
    }
    if (memory.personaPresetId) {
      const personaHint = PERSONA_DIRECTOR_HINTS[memory.personaPresetId];
      if (personaHint) {
        lines.push(`Persona direction: ${personaHint}`);
      }
    }
    if (memory.matchingReasons.length > 0) {
      lines.push(`Voice fit: ${memory.matchingReasons.slice(0, 2).join("; ")}.`);
    }
  } else if (character.voiceNotes?.trim()) {
    const freeNotes = character.voiceNotes
      .split("\n")
      .filter((line) => !line.startsWith("[hc:voice-selection]"))
      .join(" ")
      .trim();
    if (freeNotes) {
      lines.push(`Voice notes (${character.name}): ${freeNotes.slice(0, 120)}.`);
    }
  }
  return lines;
}

export function buildVoiceIntelligenceDirectorLines(params: {
  characters: StudioCharacterListItem[];
  locationNames?: string[];
  storyKeywords?: string[];
}): string[] {
  const lines: string[] = [];

  for (const character of params.characters) {
    lines.push(...buildCharacterVoiceIntelligenceLines(character));
  }

  const locationNames = params.locationNames ?? [];
  for (const suggestion of buildDirectorVoiceSuggestions({ locationNames })) {
    const accentHint = ACCENT_DIRECTOR_HINTS[suggestion.accentCanonicalId];
    if (accentHint) {
      lines.push(`Location voice (${suggestion.matchedLocation}): ${accentHint}`);
    }
    for (const preset of suggestion.personaPresets.slice(0, 2)) {
      const hint = PERSONA_DIRECTOR_HINTS[preset.id];
      if (hint) {
        lines.push(`Suggested persona (${preset.id.replace(/_/g, " ")}): ${hint}`);
      }
    }
  }

  return uniqueLines(lines, 10);
}
