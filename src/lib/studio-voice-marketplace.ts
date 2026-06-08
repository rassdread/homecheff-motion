/**
 * Character Voice Marketplace — compatibility scoring, recommendations, story-aware preview.
 * Heuristic only; reuses existing metadata (no new AI provider).
 */

import {
  CANONICAL_ACCENT_DEFINITIONS,
  canonicalAccentForVoice,
  filterVoiceLibrary,
  type VoiceLibraryFilters,
} from "@/lib/studio-voice-accent-model";
import type { VoiceLibraryCatalog, VoiceLibraryEntry } from "@/lib/studio-voice-library-catalog";
import { buildCharacterVoiceHintFromPrefill } from "@/lib/studio-character-identity-voice-hints";
import type { CharacterIdentityFormValues } from "@/lib/studio-character-identity-fields";
import {
  suggestVoicesForLocation,
  type VoiceDirectorSuggestion,
} from "@/lib/studio-voice-location-suggestions";
import { safeFormatLibraryVoiceProfileRef } from "@/lib/studio-voice-profile-ref";
import {
  scoreVoiceForPreset,
  VOICE_PERSONA_PRESET_DEFINITIONS,
  type VoicePersonaResolvedPreset,
} from "@/lib/studio-voice-persona-presets";
import { voiceMatchesPersonaPreset } from "@/lib/studio-voice-persona-accent-match";
import { normalizeVoiceLanguageCode } from "@/lib/studio-voice-language-labels";
import type { UserVoiceLibraryEntry } from "@/types/studio-user-voice-library";

export type VoiceMarketplaceContext = {
  characterName?: string;
  characterType?: string;
  personality?: string;
  styleId?: string;
  clothing?: string;
  usageContext?: string;
  worldName?: string;
  worldType?: string;
  storyKeywords?: string[];
  locationKeywords?: string[];
  language?: string;
  gender?: string;
  accentHint?: string;
};

export type VoiceMarketplaceEntry = {
  kind: "library" | "clone";
  id: string;
  profileRef: string;
  name: string;
  accent: string;
  accentCanonicalId: string | null;
  accentLabelKey: string | null;
  language: string;
  gender: string;
  age: string;
  category: string;
  description: string;
  previewUrl: string;
  provider: string;
  isMyVoice: boolean;
  libraryVoice?: VoiceLibraryEntry;
};

export type VoiceRecommendation = {
  entry: VoiceMarketplaceEntry;
  compatibilityScore: number;
  starRating: number;
  matchingReasons: string[];
  personaPresetId: string | null;
  personaLabelKey: string | null;
};

const STORY_ACCENT_RULES: Array<{
  keywords: string[];
  accentId: string;
  labelKey: string;
}> = [
  {
    keywords: ["caribbean", "jamaica", "kingston", "market", "street food"],
    accentId: "english.jamaican",
    labelKey: "studio.voiceLibrary.accent.english.jamaican",
  },
  {
    keywords: ["luxury", "restaurant", "fine dining", "french", "paris"],
    accentId: "english.british",
    labelKey: "studio.voiceLibrary.accent.english.british",
  },
  {
    keywords: ["cyberpunk", "futuristic", "neon", "sci-fi", "synthetic"],
    accentId: "english.american",
    labelKey: "studio.voiceLibrary.accent.english.american",
  },
  {
    keywords: ["dutch", "nederland", "amsterdam", "community", "neighborhood"],
    accentId: "dutch.nederlands",
    labelKey: "studio.voiceLibrary.accent.dutch.nederlands",
  },
  {
    keywords: ["suriname", "paramaribo", "surinaams"],
    accentId: "dutch.surinaams",
    labelKey: "studio.voiceLibrary.accent.dutch.surinaams",
  },
  {
    keywords: ["vlaams", "flanders", "antwerp"],
    accentId: "dutch.vlaams",
    labelKey: "studio.voiceLibrary.accent.dutch.vlaams",
  },
];

function definitionById(accentId: string) {
  return CANONICAL_ACCENT_DEFINITIONS.find((d) => d.id === accentId) ?? null;
}

function contextHaystack(ctx: VoiceMarketplaceContext): string {
  return [
    ctx.characterType,
    ctx.personality,
    ctx.styleId,
    ctx.clothing,
    ctx.usageContext,
    ctx.worldName,
    ctx.worldType,
    ...(ctx.storyKeywords ?? []),
    ...(ctx.locationKeywords ?? []),
    ctx.accentHint,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function libraryEntryToMarketplaceEntry(voice: VoiceLibraryEntry): VoiceMarketplaceEntry {
  const canonical = canonicalAccentForVoice(voice);
  const profileRef = safeFormatLibraryVoiceProfileRef(voice.id) ?? `library:${voice.id}`;
  return {
    kind: "library",
    id: voice.id,
    profileRef,
    name: voice.name,
    accent: voice.accent || voice.labels.accent || "",
    accentCanonicalId: canonical?.id ?? null,
    accentLabelKey: canonical?.labelKey ?? null,
    language: voice.language || voice.labels.language || "",
    gender: voice.gender || voice.labels.gender || "",
    age: voice.age || voice.labels.age || "",
    category: voice.category || "shared",
    description: voice.description || "",
    previewUrl: voice.previewUrl || "",
    provider: "elevenlabs",
    isMyVoice: false,
    libraryVoice: voice,
  };
}

export function cloneEntryToMarketplaceEntry(clone: UserVoiceLibraryEntry): VoiceMarketplaceEntry | null {
  if (clone.status !== "completed" || !clone.voiceProfileRef.trim()) {
    return null;
  }
  return {
    kind: "clone",
    id: clone.cloneId,
    profileRef: clone.voiceProfileRef,
    name: clone.name,
    accent: "",
    accentCanonicalId: null,
    accentLabelKey: null,
    language: clone.language,
    gender: "",
    age: "",
    category: "my_clone",
    description: "",
    previewUrl: clone.previewUrl,
    provider: clone.provider || "elevenlabs",
    isMyVoice: true,
  };
}

export function buildMarketplaceEntries(
  catalog: VoiceLibraryCatalog,
  clones: UserVoiceLibraryEntry[] = []
): VoiceMarketplaceEntry[] {
  const library = catalog.voices.map(libraryEntryToMarketplaceEntry);
  const cloneEntries = clones
    .map(cloneEntryToMarketplaceEntry)
    .filter((e): e is VoiceMarketplaceEntry => e !== null);
  return [...cloneEntries, ...library];
}

function filterCloneEntries(
  cloneOnly: VoiceMarketplaceEntry[],
  filters: VoiceLibraryFilters
): VoiceMarketplaceEntry[] {
  return cloneOnly.filter((clone) => {
    if (filters.category && filters.category !== "my_clone") {
      return false;
    }
    if (filters.language) {
      const lang = normalizeVoiceLanguageCode(clone.language);
      if (lang !== normalizeVoiceLanguageCode(filters.language)) {
        return false;
      }
    }
    if (filters.query) {
      const q = filters.query.trim().toLowerCase();
      if (!clone.name.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (filters.accentId || filters.gender || filters.age) {
      return false;
    }
    return true;
  });
}

export function filterMarketplaceEntries(
  entries: VoiceMarketplaceEntry[],
  filters: VoiceLibraryFilters
): VoiceMarketplaceEntry[] {
  const libraryOnly = entries.filter((e) => e.kind === "library" && e.libraryVoice);
  const cloneOnly = entries.filter((e) => e.kind === "clone");
  const filteredClones = filterCloneEntries(cloneOnly, filters);

  if (filters.category === "my_clone") {
    return filteredClones;
  }

  const filteredLibrary = filterVoiceLibrary(
    { version: 1, source: "elevenlabs", fetchedAt: "", voices: libraryOnly.map((e) => e.libraryVoice!) },
    filters
  );
  const filteredLibraryIds = new Set(filteredLibrary.map((v) => v.id));

  return [
    ...filteredClones,
    ...entries.filter((e) => e.kind === "library" && filteredLibraryIds.has(e.id)),
  ];
}

export function resolveStoryAccentHints(ctx: VoiceMarketplaceContext): string[] {
  const haystack = contextHaystack(ctx);
  const hints: string[] = [];
  for (const rule of STORY_ACCENT_RULES) {
    if (rule.keywords.some((kw) => haystack.includes(kw))) {
      hints.push(rule.accentId);
    }
  }
  return [...new Set(hints)];
}

export function computeVoiceCompatibilityScore(
  entry: VoiceMarketplaceEntry,
  ctx: VoiceMarketplaceContext,
  personaPresets: VoicePersonaResolvedPreset[] = []
): { score: number; reasons: string[]; personaPresetId: string | null; personaLabelKey: string | null } {
  let score = 40;
  const reasons: string[] = [];
  let personaPresetId: string | null = null;
  let personaLabelKey: string | null = null;

  const targetLang = ctx.language ? normalizeVoiceLanguageCode(ctx.language) : "";
  const entryLang = normalizeVoiceLanguageCode(entry.language);
  if (targetLang && entryLang && targetLang === entryLang) {
    score += 15;
    reasons.push("language");
  }

  const identityHint = buildCharacterVoiceHintFromPrefill(
    {
      characterType: ctx.characterType,
      personality: ctx.personality,
      clothing: ctx.clothing,
      usageContext: ctx.usageContext,
    } as Partial<CharacterIdentityFormValues>,
    contextHaystack(ctx)
  );

  const storyAccents = resolveStoryAccentHints(ctx);
  const accentTargets = [
    ...storyAccents,
    ...(identityHint.accentFilterHint ? [identityHint.accentFilterHint] : []),
    ...(ctx.accentHint ? [ctx.accentHint] : []),
  ];

  if (entry.accentCanonicalId && accentTargets.some((a) => a === entry.accentCanonicalId)) {
    score += 25;
    reasons.push("story_accent");
  } else if (entry.accentCanonicalId) {
    const def = definitionById(entry.accentCanonicalId);
    const rawHaystack = `${entry.accent} ${entry.description}`.toLowerCase();
    if (def && def.matchers.some((m) => rawHaystack.includes(m) || contextHaystack(ctx).includes(m))) {
      score += 12;
      reasons.push("accent_metadata");
    }
  }

  if (ctx.gender && entry.gender && entry.gender.toLowerCase() === ctx.gender.toLowerCase()) {
    score += 8;
    reasons.push("gender");
  }

  if (entry.isMyVoice) {
    score += 5;
    reasons.push("my_voice");
  }

  if (entry.previewUrl) {
    score += 2;
    reasons.push("preview");
  }

  for (const preset of personaPresets) {
    if (!preset.available || !entry.libraryVoice) {
      continue;
    }
    const def = VOICE_PERSONA_PRESET_DEFINITIONS.find((p) => p.id === preset.id);
    if (!def || !voiceMatchesPersonaPreset(entry.libraryVoice, def)) {
      continue;
    }
    const personaScore = scoreVoiceForPreset(entry.libraryVoice, def);
    if (personaScore >= 8) {
      score = Math.min(100, score + Math.round(personaScore / 2));
      reasons.push(`persona:${preset.id}`);
      personaPresetId = preset.id;
      personaLabelKey = preset.labelKey;
      break;
    }
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    reasons,
    personaPresetId,
    personaLabelKey,
  };
}

export function scoreToStarRating(score: number): number {
  if (score >= 92) return 5;
  if (score >= 82) return 4;
  if (score >= 70) return 3;
  if (score >= 55) return 2;
  return 1;
}

export function buildVoiceRecommendations(params: {
  catalog: VoiceLibraryCatalog;
  clones?: UserVoiceLibraryEntry[];
  context: VoiceMarketplaceContext;
  personaPresets?: VoicePersonaResolvedPreset[];
  limit?: number;
}): VoiceRecommendation[] {
  const entries = buildMarketplaceEntries(params.catalog, params.clones ?? []);
  const ranked = entries
    .map((entry) => {
      const match = computeVoiceCompatibilityScore(entry, params.context, params.personaPresets);
      return {
        entry,
        compatibilityScore: match.score,
        starRating: scoreToStarRating(match.score),
        matchingReasons: match.reasons,
        personaPresetId: match.personaPresetId,
        personaLabelKey: match.personaLabelKey,
      };
    })
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  return ranked.slice(0, params.limit ?? 8);
}

export function buildStoryAwareVoicePreviewText(ctx: VoiceMarketplaceContext): string {
  const name = ctx.characterName?.trim() || "Character";
  const lang = normalizeVoiceLanguageCode(ctx.language ?? "en");
  const haystack = contextHaystack(ctx);

  if (/\bchef\b|\bkok\b|\bkitchen\b|\bkeuken\b|street food|food/.test(haystack)) {
    if (lang === "nl") {
      return `Welkom in onze keuken. Ik ben ${name}, en vandaag delen we iets bijzonders.`;
    }
    return `Welcome to our kitchen. I'm ${name}, and today we're sharing something special.`;
  }
  if (/\bdesigner\b|\bfashion\b|\bcreative\b|luxury|brand/.test(haystack)) {
    if (lang === "nl") {
      return `Elk ontwerp vertelt een verhaal. Ik ben ${name}, en dit is mijn visie.`;
    }
    return `Every design tells a story. I'm ${name}, and this is my vision.`;
  }
  if (/caribbean|jamaica|market|street/.test(haystack)) {
    return `Welcome to the market. I'm ${name} — let me show you around.`;
  }
  if (/garden|community|neighbor/.test(haystack)) {
    if (lang === "nl") {
      return `Hallo, ik ben ${name}. Samen maken we deze plek bijzonder.`;
    }
    return `Hello, I'm ${name}. Together we make this place special.`;
  }
  if (lang === "nl") {
    return `Hallo, ik ben ${name}.`;
  }
  if (lang === "de") {
    return `Hallo, ich bin ${name}.`;
  }
  if (lang === "fr") {
    return `Bonjour, je suis ${name}.`;
  }
  if (lang === "es") {
    return `Hola, soy ${name}.`;
  }
  return `Hello, I am ${name}.`;
}

export function buildStoryDirectorSuggestion(
  catalog: VoiceLibraryCatalog,
  locationText: string
): VoiceDirectorSuggestion | null {
  return suggestVoicesForLocation(locationText, catalog);
}
