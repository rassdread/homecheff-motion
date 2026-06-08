/** Full language display names (i18n keys under studio.voiceLibrary.language.*). */

const LANGUAGE_LABEL_KEYS: Record<string, string> = {
  en: "studio.voiceLibrary.language.en",
  nl: "studio.voiceLibrary.language.nl",
  de: "studio.voiceLibrary.language.de",
  fr: "studio.voiceLibrary.language.fr",
  es: "studio.voiceLibrary.language.es",
  ru: "studio.voiceLibrary.language.ru",
  it: "studio.voiceLibrary.language.it",
  pt: "studio.voiceLibrary.language.pt",
  pl: "studio.voiceLibrary.language.pl",
  sv: "studio.voiceLibrary.language.sv",
  ar: "studio.voiceLibrary.language.ar",
  zh: "studio.voiceLibrary.language.zh",
  ja: "studio.voiceLibrary.language.ja",
  ko: "studio.voiceLibrary.language.ko",
  hi: "studio.voiceLibrary.language.hi",
  tr: "studio.voiceLibrary.language.tr",
  id: "studio.voiceLibrary.language.id",
  uk: "studio.voiceLibrary.language.uk",
  cs: "studio.voiceLibrary.language.cs",
  da: "studio.voiceLibrary.language.da",
  fi: "studio.voiceLibrary.language.fi",
  no: "studio.voiceLibrary.language.no",
  ro: "studio.voiceLibrary.language.ro",
  hu: "studio.voiceLibrary.language.hu",
  el: "studio.voiceLibrary.language.el",
  he: "studio.voiceLibrary.language.he",
  th: "studio.voiceLibrary.language.th",
  vi: "studio.voiceLibrary.language.vi",
};

export function normalizeVoiceLanguageCode(raw: string): string {
  return raw.trim().toLowerCase().slice(0, 2);
}

export function voiceLanguageLabelKey(code: string): string {
  const normalized = normalizeVoiceLanguageCode(code);
  return LANGUAGE_LABEL_KEYS[normalized] ?? "studio.voiceLibrary.language.other";
}
