/**
 * Language identifiers for the voice catalog.
 * Equivalences are ISO 639-1/639-2 codes and the language names those codes denote.
 * Unknown identifiers stay unchanged so they remain searchable.
 */

const ISO_639_2_TO_1: Record<string, string> = {
  eng: "en",
  nld: "nl",
  dut: "nl",
  deu: "de",
  ger: "de",
  spa: "es",
  fra: "fr",
  fre: "fr",
};

const LANGUAGE_NAME_TO_CODE: Record<string, string> = {
  english: "en",
  dutch: "nl",
  nederlands: "nl",
  german: "de",
  deutsch: "de",
  spanish: "es",
  espanol: "es",
  español: "es",
  french: "fr",
  francais: "fr",
  français: "fr",
  filipino: "fil",
};

/** Dutch labels for codes we can name. Unknown codes are not given a guessed name. */
export const VOICE_LANGUAGE_LABELS_NL: Record<string, string> = {
  nl: "Nederlands",
  en: "Engels",
  de: "Duits",
  es: "Spaans",
  fr: "Frans",
  it: "Italiaans",
  pt: "Portugees",
  pl: "Pools",
  sv: "Zweeds",
  da: "Deens",
  no: "Noors",
  fi: "Fins",
  ar: "Arabisch",
  tr: "Turks",
  ru: "Russisch",
  uk: "Oekraïens",
  ro: "Roemeens",
  hu: "Hongaars",
  cs: "Tsjechisch",
  el: "Grieks",
  ja: "Japans",
  ko: "Koreaans",
  zh: "Chinees",
  hi: "Hindi",
  id: "Indonesisch",
  fil: "Filipijns",
  tl: "Tagalog",
};

const POPULAR_LANGUAGE_CODES = ["nl", "en", "de", "fr", "es"];

export function canonicalVoiceLanguage(raw: string): string {
  const value = raw.trim().toLowerCase();
  if (!value) {
    return "";
  }
  const primary = value.split(/[-_]/)[0]?.trim() || value;
  return LANGUAGE_NAME_TO_CODE[primary] ?? ISO_639_2_TO_1[primary] ?? primary;
}

export function voiceLanguageLabel(raw: string): string {
  const code = canonicalVoiceLanguage(raw);
  if (!code) {
    return "";
  }
  return VOICE_LANGUAGE_LABELS_NL[code] ?? code;
}

export function sortVoiceLanguageOptions<T extends { value: string }>(options: T[]): T[] {
  return [...options].sort((a, b) => {
    const aCode = canonicalVoiceLanguage(a.value);
    const bCode = canonicalVoiceLanguage(b.value);
    const aPopular = POPULAR_LANGUAGE_CODES.indexOf(aCode);
    const bPopular = POPULAR_LANGUAGE_CODES.indexOf(bCode);
    if (aPopular !== -1 || bPopular !== -1) {
      if (aPopular === -1) return 1;
      if (bPopular === -1) return -1;
      if (aPopular !== bPopular) return aPopular - bPopular;
    }
    return voiceLanguageLabel(aCode).localeCompare(voiceLanguageLabel(bCode), "nl");
  });
}

/** ElevenLabs uses both "middle aged" and "middle_aged" for the same age impression. */
export function canonicalVoiceAge(raw: string): string {
  const value = raw.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (value === "middle aged") {
    return "middle_aged";
  }
  return value;
}
