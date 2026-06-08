/**
 * Voice geography — derived from ElevenLabs metadata only (accent, locale, labels, description).
 * No invented country/region data: city regions appear only when tokens exist in voice text.
 */

import { canonicalAccentForVoice } from "@/lib/studio-voice-accent-model";
import type { VoiceLibraryEntry } from "@/lib/studio-voice-library-catalog";

export type VoiceGeography = {
  countryId: string | null;
  countryLabelKey: string | null;
  regionId: string | null;
  regionLabelKey: string | null;
  locale: string | null;
  dialectRaw: string;
  useCase: string | null;
  catalogSource: string | null;
};

/** Canonical accent id → country bucket (accent-implied geography, not separate API field). */
const ACCENT_COUNTRY_MAP: Record<string, { countryId: string; labelKey: string }> = {
  "english.british": { countryId: "united_kingdom", labelKey: "studio.voiceLibrary.country.united_kingdom" },
  "english.american": { countryId: "united_states", labelKey: "studio.voiceLibrary.country.united_states" },
  "english.australian": { countryId: "australia", labelKey: "studio.voiceLibrary.country.australia" },
  "english.irish": { countryId: "ireland", labelKey: "studio.voiceLibrary.country.ireland" },
  "english.scottish": { countryId: "scotland", labelKey: "studio.voiceLibrary.country.scotland" },
  "english.jamaican": { countryId: "jamaica", labelKey: "studio.voiceLibrary.country.jamaica" },
  "english.caribbean": { countryId: "caribbean", labelKey: "studio.voiceLibrary.country.caribbean" },
  "english.south_african": { countryId: "south_africa", labelKey: "studio.voiceLibrary.country.south_africa" },
  "english.nigerian": { countryId: "nigeria", labelKey: "studio.voiceLibrary.country.nigeria" },
  "english.trinidadian": { countryId: "trinidad_tobago", labelKey: "studio.voiceLibrary.country.trinidad_tobago" },
  "english.barbadian": { countryId: "barbados", labelKey: "studio.voiceLibrary.country.barbados" },
  "english.guyanese": { countryId: "guyana", labelKey: "studio.voiceLibrary.country.guyana" },
  "english.ghanaian": { countryId: "ghana", labelKey: "studio.voiceLibrary.country.ghana" },
  "english.kenyan": { countryId: "kenya", labelKey: "studio.voiceLibrary.country.kenya" },
  "english.pakistani": { countryId: "pakistan", labelKey: "studio.voiceLibrary.country.pakistan" },
  "english.welsh": { countryId: "wales", labelKey: "studio.voiceLibrary.country.wales" },
  "english.indian": { countryId: "india", labelKey: "studio.voiceLibrary.country.india" },
  "english.new_zealand": { countryId: "new_zealand", labelKey: "studio.voiceLibrary.country.new_zealand" },
  "english.canadian": { countryId: "canada", labelKey: "studio.voiceLibrary.country.canada" },
  "dutch.nederlands": { countryId: "netherlands", labelKey: "studio.voiceLibrary.country.netherlands" },
  "dutch.vlaams": { countryId: "belgium", labelKey: "studio.voiceLibrary.country.belgium" },
  "dutch.surinaams": { countryId: "suriname", labelKey: "studio.voiceLibrary.country.suriname" },
  "spanish.spain": { countryId: "spain", labelKey: "studio.voiceLibrary.country.spain" },
  "spanish.latin_american": { countryId: "latin_america", labelKey: "studio.voiceLibrary.country.latin_america" },
  "french.france": { countryId: "france", labelKey: "studio.voiceLibrary.country.france" },
  "french.canadian": { countryId: "canada", labelKey: "studio.voiceLibrary.country.canada" },
  "german.standard": { countryId: "germany", labelKey: "studio.voiceLibrary.country.germany" },
  "german.swiss": { countryId: "switzerland", labelKey: "studio.voiceLibrary.country.switzerland" },
  "chinese.cantonese": { countryId: "hong_kong", labelKey: "studio.voiceLibrary.country.hong_kong" },
  "ukrainian.standard": { countryId: "ukraine", labelKey: "studio.voiceLibrary.country.ukraine" },
  "romanian.standard": { countryId: "romania", labelKey: "studio.voiceLibrary.country.romania" },
  "portuguese.brazilian": { countryId: "brazil", labelKey: "studio.voiceLibrary.country.brazil" },
  "portuguese.european": { countryId: "portugal", labelKey: "studio.voiceLibrary.country.portugal" },
  "italian.standard": { countryId: "italy", labelKey: "studio.voiceLibrary.country.italy" },
  "russian.standard": { countryId: "russia", labelKey: "studio.voiceLibrary.country.russia" },
  "arabic.standard": { countryId: "middle_east", labelKey: "studio.voiceLibrary.country.middle_east" },
  "chinese.mandarin": { countryId: "china", labelKey: "studio.voiceLibrary.country.china" },
  "japanese.standard": { countryId: "japan", labelKey: "studio.voiceLibrary.country.japan" },
  "korean.standard": { countryId: "south_korea", labelKey: "studio.voiceLibrary.country.south_korea" },
  "hindi.standard": { countryId: "india", labelKey: "studio.voiceLibrary.country.india" },
  "polish.standard": { countryId: "poland", labelKey: "studio.voiceLibrary.country.poland" },
  "swedish.standard": { countryId: "sweden", labelKey: "studio.voiceLibrary.country.sweden" },
};

/** BCP47 locale prefix → country when accent mapping is absent. */
const LOCALE_COUNTRY_MAP: Array<{ prefix: string; countryId: string; labelKey: string }> = [
  { prefix: "nl-nl", countryId: "netherlands", labelKey: "studio.voiceLibrary.country.netherlands" },
  { prefix: "nl-be", countryId: "belgium", labelKey: "studio.voiceLibrary.country.belgium" },
  { prefix: "en-gb", countryId: "united_kingdom", labelKey: "studio.voiceLibrary.country.united_kingdom" },
  { prefix: "en-us", countryId: "united_states", labelKey: "studio.voiceLibrary.country.united_states" },
  { prefix: "en-au", countryId: "australia", labelKey: "studio.voiceLibrary.country.australia" },
  { prefix: "en-ie", countryId: "ireland", labelKey: "studio.voiceLibrary.country.ireland" },
  { prefix: "en-jm", countryId: "jamaica", labelKey: "studio.voiceLibrary.country.jamaica" },
  { prefix: "en-za", countryId: "south_africa", labelKey: "studio.voiceLibrary.country.south_africa" },
  { prefix: "en-ng", countryId: "nigeria", labelKey: "studio.voiceLibrary.country.nigeria" },
  { prefix: "en-tt", countryId: "trinidad_tobago", labelKey: "studio.voiceLibrary.country.trinidad_tobago" },
  { prefix: "en-bb", countryId: "barbados", labelKey: "studio.voiceLibrary.country.barbados" },
  { prefix: "en-gy", countryId: "guyana", labelKey: "studio.voiceLibrary.country.guyana" },
  { prefix: "en-gh", countryId: "ghana", labelKey: "studio.voiceLibrary.country.ghana" },
  { prefix: "en-ke", countryId: "kenya", labelKey: "studio.voiceLibrary.country.kenya" },
  { prefix: "en-pk", countryId: "pakistan", labelKey: "studio.voiceLibrary.country.pakistan" },
  { prefix: "nl-sr", countryId: "suriname", labelKey: "studio.voiceLibrary.country.suriname" },
  { prefix: "en-in", countryId: "india", labelKey: "studio.voiceLibrary.country.india" },
  { prefix: "de-ch", countryId: "switzerland", labelKey: "studio.voiceLibrary.country.switzerland" },
  { prefix: "zh-hk", countryId: "hong_kong", labelKey: "studio.voiceLibrary.country.hong_kong" },
  { prefix: "uk-ua", countryId: "ukraine", labelKey: "studio.voiceLibrary.country.ukraine" },
  { prefix: "ro-ro", countryId: "romania", labelKey: "studio.voiceLibrary.country.romania" },
  { prefix: "en-nz", countryId: "new_zealand", labelKey: "studio.voiceLibrary.country.new_zealand" },
  { prefix: "fr-ca", countryId: "canada", labelKey: "studio.voiceLibrary.country.canada" },
  { prefix: "fr-fr", countryId: "france", labelKey: "studio.voiceLibrary.country.france" },
  { prefix: "es-es", countryId: "spain", labelKey: "studio.voiceLibrary.country.spain" },
  { prefix: "de-de", countryId: "germany", labelKey: "studio.voiceLibrary.country.germany" },
  { prefix: "pt-br", countryId: "brazil", labelKey: "studio.voiceLibrary.country.brazil" },
  { prefix: "pt-pt", countryId: "portugal", labelKey: "studio.voiceLibrary.country.portugal" },
];

/** City/region tokens — only surfaced when present in voice name, description, or labels. */
const REGION_CITY_RULES: Array<{
  regionId: string;
  countryId: string;
  labelKey: string;
  tokens: string[];
}> = [
  {
    regionId: "paramaribo",
    countryId: "suriname",
    labelKey: "studio.voiceLibrary.region.paramaribo",
    tokens: ["paramaribo"],
  },
  {
    regionId: "rotterdam",
    countryId: "netherlands",
    labelKey: "studio.voiceLibrary.region.rotterdam",
    tokens: ["rotterdam"],
  },
  {
    regionId: "amsterdam",
    countryId: "netherlands",
    labelKey: "studio.voiceLibrary.region.amsterdam",
    tokens: ["amsterdam"],
  },
  {
    regionId: "utrecht",
    countryId: "netherlands",
    labelKey: "studio.voiceLibrary.region.utrecht",
    tokens: ["utrecht"],
  },
  {
    regionId: "kingston",
    countryId: "jamaica",
    labelKey: "studio.voiceLibrary.region.kingston",
    tokens: ["kingston"],
  },
  {
    regionId: "london",
    countryId: "united_kingdom",
    labelKey: "studio.voiceLibrary.region.london",
    tokens: ["london"],
  },
  {
    regionId: "sydney",
    countryId: "australia",
    labelKey: "studio.voiceLibrary.region.sydney",
    tokens: ["sydney"],
  },
  {
    regionId: "antwerp",
    countryId: "belgium",
    labelKey: "studio.voiceLibrary.region.antwerp",
    tokens: ["antwerp", "antwerpen"],
  },
  {
    regionId: "lagos",
    countryId: "nigeria",
    labelKey: "studio.voiceLibrary.region.lagos",
    tokens: ["lagos"],
  },
];

/** Story/character keywords → country ids for compatibility ranking (not accent-gate). */
export const STORY_COUNTRY_KEYWORDS: Record<string, string[]> = {
  suriname: ["suriname", "surinaams", "paramaribo"],
  netherlands: ["nederland", "netherlands", "dutch", "amsterdam", "rotterdam"],
  jamaica: ["jamaica", "jamaican", "kingston", "caribbean"],
  united_kingdom: ["british", "uk", "london", "england"],
  australia: ["australia", "australian", "sydney"],
  belgium: ["belgium", "flemish", "vlaams", "flanders", "antwerp"],
  nigeria: ["nigeria", "nigerian", "lagos", "african market"],
  ghana: ["ghana", "ghanaian", "accra"],
  kenya: ["kenya", "kenyan", "nairobi"],
  united_states: ["american", "usa", "us "],
};

export function voiceTextHaystack(voice: VoiceLibraryEntry): string {
  return [
    voice.name,
    voice.accent,
    voice.description,
    voice.language,
    ...Object.entries(voice.labels).map(([k, v]) => `${k}:${v}`),
  ]
    .join(" ")
    .toLowerCase();
}

function resolveLocale(voice: VoiceLibraryEntry): string {
  const locale =
    voice.labels.verified_locale?.trim() ||
    voice.labels.locale?.trim() ||
    voice.labels.Locale?.trim() ||
    "";
  return locale;
}

function countryFromLocale(locale: string): { countryId: string; labelKey: string } | null {
  const lc = locale.trim().toLowerCase();
  if (!lc) {
    return null;
  }
  for (const rule of LOCALE_COUNTRY_MAP) {
    if (lc === rule.prefix || lc.startsWith(`${rule.prefix}-`)) {
      return { countryId: rule.countryId, labelKey: rule.labelKey };
    }
  }
  return null;
}

function regionFromHaystack(haystack: string, countryId: string | null): {
  regionId: string;
  labelKey: string;
} | null {
  for (const rule of REGION_CITY_RULES) {
    if (countryId && rule.countryId !== countryId) {
      continue;
    }
    if (rule.tokens.some((token) => haystack.includes(token))) {
      return { regionId: rule.regionId, labelKey: rule.labelKey };
    }
  }
  return null;
}

export function resolveVoiceGeography(voice: VoiceLibraryEntry): VoiceGeography {
  const canonical = canonicalAccentForVoice(voice);
  const locale = resolveLocale(voice);
  const haystack = voiceTextHaystack(voice);

  let countryId: string | null = null;
  let countryLabelKey: string | null = null;

  if (canonical?.id && ACCENT_COUNTRY_MAP[canonical.id]) {
    countryId = ACCENT_COUNTRY_MAP[canonical.id].countryId;
    countryLabelKey = ACCENT_COUNTRY_MAP[canonical.id].labelKey;
  } else if (locale) {
    const fromLocale = countryFromLocale(locale);
    if (fromLocale) {
      countryId = fromLocale.countryId;
      countryLabelKey = fromLocale.labelKey;
    }
  }

  const region = regionFromHaystack(haystack, countryId);

  return {
    countryId,
    countryLabelKey,
    regionId: region?.regionId ?? null,
    regionLabelKey: region?.labelKey ?? null,
    locale: locale || null,
    dialectRaw: (voice.accent || voice.labels.accent || "").trim(),
    useCase: voice.labels.use_case?.trim() || voice.labels.useCase?.trim() || null,
    catalogSource: voice.labels.catalog_source?.trim() || null,
  };
}

export type VoiceGeographyFilterOption = {
  value: string;
  labelKey: string;
  voiceCount: number;
};

export function buildFacetedCountryOptions(
  voices: VoiceLibraryEntry[],
  activeRegionId?: string
): VoiceGeographyFilterOption[] {
  const counts = new Map<string, { labelKey: string; count: number }>();
  for (const voice of voices) {
    const geo = resolveVoiceGeography(voice);
    if (!geo.countryId || !geo.countryLabelKey) {
      continue;
    }
    if (activeRegionId && geo.regionId !== activeRegionId) {
      continue;
    }
    const row = counts.get(geo.countryId) ?? { labelKey: geo.countryLabelKey, count: 0 };
    row.count += 1;
    counts.set(geo.countryId, row);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, row]) => ({
      value,
      labelKey: row.labelKey,
      voiceCount: row.count,
    }));
}

export function buildFacetedRegionOptions(
  voices: VoiceLibraryEntry[],
  countryId?: string
): VoiceGeographyFilterOption[] {
  const counts = new Map<string, { labelKey: string; count: number }>();
  for (const voice of voices) {
    const geo = resolveVoiceGeography(voice);
    if (!geo.regionId || !geo.regionLabelKey) {
      continue;
    }
    if (countryId && geo.countryId !== countryId) {
      continue;
    }
    const row = counts.get(geo.regionId) ?? { labelKey: geo.regionLabelKey, count: 0 };
    row.count += 1;
    counts.set(geo.regionId, row);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, row]) => ({
      value,
      labelKey: row.labelKey,
      voiceCount: row.count,
    }));
}

export function voiceMatchesGeographyFilters(
  voice: VoiceLibraryEntry,
  filters: { countryId?: string; regionId?: string }
): boolean {
  const geo = resolveVoiceGeography(voice);
  if (filters.countryId && geo.countryId !== filters.countryId) {
    return false;
  }
  if (filters.regionId && geo.regionId !== filters.regionId) {
    return false;
  }
  return true;
}

export function resolveStoryCountryHints(haystack: string): string[] {
  const lc = haystack.toLowerCase();
  const hints: string[] = [];
  for (const [countryId, keywords] of Object.entries(STORY_COUNTRY_KEYWORDS)) {
    if (keywords.some((kw) => lc.includes(kw))) {
      hints.push(countryId);
    }
  }
  return [...new Set(hints)];
}

/** Access tier from category + catalog source (no hidden voices). */
export type VoiceAccessTier = "included" | "premium" | "marketplace" | "clone";

export function resolveVoiceAccessTier(params: {
  category: string;
  catalogSource?: string | null;
  isClone?: boolean;
}): VoiceAccessTier {
  if (params.isClone) {
    return "clone";
  }
  const category = params.category.trim().toLowerCase();
  if (category === "premade" || category === "default" || params.catalogSource === "account") {
    return "included";
  }
  if (category === "professional" || category === "high_quality") {
    return "premium";
  }
  return "marketplace";
}

export function voiceAccessTierLabelKey(tier: VoiceAccessTier): string {
  return `studio.voiceLibrary.access.${tier}`;
}
