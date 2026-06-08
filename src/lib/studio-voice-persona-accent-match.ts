/**
 * Strict accent matching for voice persona presets.
 * Personas never resolve to a voice unless accent/language metadata truly matches.
 */

import {
  CANONICAL_ACCENT_DEFINITIONS,
  canonicalAccentForVoice,
  classifyVoiceAccent,
  type CanonicalAccentDefinition,
} from "@/lib/studio-voice-accent-model";
import type { VoiceLibraryEntry } from "@/lib/studio-voice-library-catalog";

export type PersonaAccentMatchPreset = {
  accentCanonicalId: string;
  language: string;
  matchHints: {
    accentRaw?: string[];
  };
};

export type PersonaAccentMatchEvaluation = {
  matches: boolean;
  matchingReason: string | null;
  matchedAccentId: string | null;
  matchedAccentLabelKey: string | null;
};

type PersonaAccentRule = {
  allowedCanonicalIds: readonly string[];
  forbiddenCanonicalIds?: readonly string[];
  accentRaw?: readonly string[];
  localeFragments?: readonly string[];
  descriptionFragments?: readonly string[];
  requiredLanguage?: string;
};

const PERSONA_ACCENT_RULES: Record<string, PersonaAccentRule> = {
  "english.jamaican": {
    allowedCanonicalIds: ["english.jamaican", "english.caribbean"],
    forbiddenCanonicalIds: ["english.american", "english.british"],
    accentRaw: ["jamaican", "caribbean", "west indian"],
    descriptionFragments: ["jamaican", "caribbean"],
    requiredLanguage: "en",
  },
  "english.british": {
    allowedCanonicalIds: ["english.british"],
    forbiddenCanonicalIds: ["english.american"],
    accentRaw: ["british", "uk english", "english british", "english (uk)"],
    localeFragments: ["en-gb", "en_gb"],
    descriptionFragments: ["british", "uk english"],
    requiredLanguage: "en",
  },
  "english.american": {
    allowedCanonicalIds: ["english.american"],
    accentRaw: ["american", "us english", "usa"],
    localeFragments: ["en-us", "en_us"],
    requiredLanguage: "en",
  },
  "english.caribbean": {
    allowedCanonicalIds: ["english.caribbean", "english.jamaican"],
    forbiddenCanonicalIds: ["english.american"],
    accentRaw: ["caribbean", "jamaican", "west indian"],
    descriptionFragments: ["caribbean", "jamaican"],
    requiredLanguage: "en",
  },
  "english.italian": {
    allowedCanonicalIds: ["english.italian"],
    forbiddenCanonicalIds: ["english.american"],
    accentRaw: ["italian"],
    requiredLanguage: "en",
  },
  "english.south_african": {
    allowedCanonicalIds: ["english.south_african"],
    forbiddenCanonicalIds: ["english.american", "english.british"],
    accentRaw: ["south african"],
    descriptionFragments: ["south african"],
    requiredLanguage: "en",
  },
  "dutch.nederlands": {
    allowedCanonicalIds: ["dutch.nederlands"],
    forbiddenCanonicalIds: ["dutch.vlaams", "dutch.surinaams", "english.american", "english.british"],
    accentRaw: ["dutch", "nederlands", "netherlands"],
    localeFragments: ["nl-nl", "nl_nl"],
    descriptionFragments: ["dutch", "nederlands"],
    requiredLanguage: "nl",
  },
  "dutch.vlaams": {
    allowedCanonicalIds: ["dutch.vlaams"],
    forbiddenCanonicalIds: ["dutch.nederlands", "dutch.surinaams", "english.american"],
    accentRaw: ["flemish", "vlaams", "belgian dutch"],
    localeFragments: ["nl-be", "nl_be"],
    descriptionFragments: ["flemish", "vlaams"],
    requiredLanguage: "nl",
  },
  "dutch.surinaams": {
    allowedCanonicalIds: ["dutch.surinaams"],
    forbiddenCanonicalIds: ["dutch.nederlands", "dutch.vlaams", "english.american"],
    accentRaw: ["surinamese", "surinaams", "suriname", "caribbean dutch"],
    descriptionFragments: ["surinamese", "surinaams", "suriname"],
    requiredLanguage: "nl",
  },
  "spanish.spain": {
    allowedCanonicalIds: ["spanish.spain"],
    accentRaw: ["spanish", "castilian"],
    requiredLanguage: "es",
  },
  "spanish.latin_american": {
    allowedCanonicalIds: ["spanish.latin_american"],
    accentRaw: ["latin american", "latino"],
    requiredLanguage: "es",
  },
  "french.france": {
    allowedCanonicalIds: ["french.france"],
    accentRaw: ["french", "france"],
    requiredLanguage: "fr",
  },
};

function definitionById(accentId: string): CanonicalAccentDefinition | undefined {
  return CANONICAL_ACCENT_DEFINITIONS.find((def) => def.id === accentId);
}

function voiceLanguage(voice: VoiceLibraryEntry): string {
  return (voice.language || voice.labels.language || "").trim().toLowerCase();
}

function buildMetadataHaystack(voice: VoiceLibraryEntry): string {
  return [
    voice.accent,
    voice.language,
    voice.description,
    voice.name,
    ...Object.values(voice.labels),
  ]
    .join(" ")
    .toLowerCase();
}

function fragmentMatches(haystack: string, fragment: string): boolean {
  return haystack.includes(fragment.trim().toLowerCase());
}

function resolveRule(preset: PersonaAccentMatchPreset): PersonaAccentRule {
  const base = PERSONA_ACCENT_RULES[preset.accentCanonicalId];
  if (base) {
    return base;
  }
  return {
    allowedCanonicalIds: [preset.accentCanonicalId],
    accentRaw: preset.matchHints.accentRaw,
    requiredLanguage: preset.language || undefined,
  };
}

function matchResult(reason: string, accentId: string): PersonaAccentMatchEvaluation {
  const def = definitionById(accentId);
  return {
    matches: true,
    matchingReason: reason,
    matchedAccentId: accentId,
    matchedAccentLabelKey: def?.labelKey ?? accentId,
  };
}

const NO_MATCH: PersonaAccentMatchEvaluation = {
  matches: false,
  matchingReason: null,
  matchedAccentId: null,
  matchedAccentLabelKey: null,
};

/** Returns whether a voice strictly matches the persona accent requirements. */
export function evaluatePersonaAccentMatch(
  voice: VoiceLibraryEntry,
  preset: PersonaAccentMatchPreset
): PersonaAccentMatchEvaluation {
  const rule = resolveRule(preset);
  const canonical = canonicalAccentForVoice(voice);
  const haystack = buildMetadataHaystack(voice);
  const lang = voiceLanguage(voice);

  if (rule.requiredLanguage && lang && lang !== rule.requiredLanguage) {
    return NO_MATCH;
  }

  if (canonical && rule.forbiddenCanonicalIds?.includes(canonical.id)) {
    return NO_MATCH;
  }

  if (canonical && rule.allowedCanonicalIds.includes(canonical.id)) {
    return matchResult(`canonical:${canonical.id}`, canonical.id);
  }

  for (const locale of rule.localeFragments ?? []) {
    if (fragmentMatches(haystack, locale)) {
      const inferred = classifyVoiceAccent(locale.replace("_", "-"));
      const accentId =
        inferred && rule.allowedCanonicalIds.includes(inferred.id)
          ? inferred.id
          : preset.accentCanonicalId;
      if (rule.allowedCanonicalIds.includes(accentId)) {
        return matchResult(`locale:${locale}`, accentId);
      }
    }
  }

  const rawAccent = (voice.accent || voice.labels.accent || "").trim().toLowerCase();
  for (const fragment of rule.accentRaw ?? []) {
    if (rawAccent.includes(fragment.toLowerCase()) || fragmentMatches(haystack, fragment)) {
      if (canonical && !rule.allowedCanonicalIds.includes(canonical.id)) {
        continue;
      }
      const inferred = classifyVoiceAccent(fragment);
      const accentId =
        inferred && rule.allowedCanonicalIds.includes(inferred.id)
          ? inferred.id
          : preset.accentCanonicalId;
      return matchResult(`accent:${fragment}`, accentId);
    }
  }

  for (const fragment of rule.descriptionFragments ?? []) {
    const description = voice.description.trim().toLowerCase();
    if (description && description.includes(fragment.toLowerCase())) {
      const inferred = classifyVoiceAccent(fragment);
      const accentId =
        inferred && rule.allowedCanonicalIds.includes(inferred.id)
          ? inferred.id
          : preset.accentCanonicalId;
      return matchResult(`description:${fragment}`, accentId);
    }
  }

  if (canonical && !rule.allowedCanonicalIds.includes(canonical.id)) {
    return NO_MATCH;
  }

  return NO_MATCH;
}

export function voiceMatchesPersonaPreset(
  voice: VoiceLibraryEntry,
  preset: PersonaAccentMatchPreset
): boolean {
  return evaluatePersonaAccentMatch(voice, preset).matches;
}
