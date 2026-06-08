/**
 * BCP47 locale → accent fragment mapping (shared by ingest and metadata repair).
 */

export const LOCALE_ACCENT_RULES: ReadonlyArray<{ prefix: string; accent: string }> = [
  { prefix: "nl-be", accent: "flemish" },
  { prefix: "nl-nl", accent: "dutch" },
  { prefix: "nl-sr", accent: "surinamese" },
  { prefix: "en-gb", accent: "british" },
  { prefix: "en-us", accent: "american" },
  { prefix: "en-au", accent: "australian" },
  { prefix: "en-ie", accent: "irish" },
  { prefix: "en-jm", accent: "jamaican" },
  { prefix: "en-in", accent: "indian" },
  { prefix: "en-ng", accent: "nigerian" },
  { prefix: "en-za", accent: "south african" },
  { prefix: "en-nz", accent: "new zealand" },
  { prefix: "en-tt", accent: "trinidadian" },
  { prefix: "en-bb", accent: "barbadian" },
  { prefix: "en-gy", accent: "guyanese" },
  { prefix: "en-gh", accent: "ghanaian" },
  { prefix: "en-ke", accent: "kenyan" },
  { prefix: "en-pk", accent: "pakistani" },
  { prefix: "cy-gb", accent: "welsh" },
  { prefix: "fr-ca", accent: "canadian french" },
  { prefix: "de-ch", accent: "swiss german" },
  { prefix: "zh-hk", accent: "cantonese" },
  { prefix: "yue", accent: "cantonese" },
  { prefix: "uk", accent: "ukrainian" },
  { prefix: "ro-ro", accent: "romanian" },
  { prefix: "es-es", accent: "spanish" },
  { prefix: "pt-br", accent: "brazilian" },
  { prefix: "pt-pt", accent: "portuguese" },
];

export function inferAccentFromLocale(locale: string): string {
  const lc = locale.trim().toLowerCase();
  if (!lc) {
    return "";
  }
  if (lc.includes("scot")) {
    return "scottish";
  }
  if (lc.startsWith("es-") && (lc.includes("mx") || lc.includes("419") || lc.includes("ar"))) {
    return "latin american";
  }
  for (const rule of LOCALE_ACCENT_RULES) {
    if (lc === rule.prefix || lc.startsWith(`${rule.prefix}-`)) {
      return rule.accent;
    }
  }
  return "";
}
