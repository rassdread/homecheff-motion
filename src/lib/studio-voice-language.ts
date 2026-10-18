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

const dutchLanguageNames = new Intl.DisplayNames(["nl"], { type: "language" });
const dutchLocaleNames = new Intl.DisplayNames(["nl"], { type: "language" });

/**
 * ICU labels Filipino and Tagalog both as Filipijns.
 * The codes stay distinct, and Tagalog keeps its own name.
 * Central Kurdish is labeled in Dutch because the ICU name is Soranî.
 */
const LANGUAGE_LABEL_OVERRIDES: Record<string, string> = {
  tl: "Tagalog",
  ckb: "Centraal-Koerdisch",
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
  const override = LANGUAGE_LABEL_OVERRIDES[code];
  if (override) {
    return override;
  }
  try {
    const name = dutchLanguageNames.of(code);
    if (name && name.toLowerCase() !== code.toLowerCase()) {
      return name;
    }
  } catch {
    return code;
  }
  return code;
}

/** Dutch name for a stored locale such as en-GB. Unknown values stay unchanged. */
export function voiceLocaleLabel(locale: string): string {
  const value = locale.trim();
  if (!value) return "";
  try {
    const name = dutchLocaleNames.of(value);
    if (name && name.toLowerCase() !== value.toLowerCase()) {
      return name;
    }
  } catch {
    return value;
  }
  return value;
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

/** Stored catalog genders. Empty means the character has no voice-type preference. */
export function voiceGenderPreference(raw: string | null | undefined): "female" | "male" | "" {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "female" || value === "male") return value;
  return "";
}

export function voiceGenderLabel(raw: string | null | undefined): string {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "female") return "Vrouwelijk";
  if (value === "male") return "Mannelijk";
  if (value === "neutral") return "Neutraal";
  return (raw ?? "").trim();
}

/** ElevenLabs uses both "middle aged" and "middle_aged" for the same age impression. */
export function canonicalVoiceAge(raw: string): string {
  const value = raw.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (value === "middle aged") {
    return "middle_aged";
  }
  return value;
}
