/**
 * Region and accent describe different stored fields.
 * A pair is hidden only when one locale is the same regional characteristic as one accent.
 */

export const REGION_ACCENT_EQUIVALENTS: ReadonlyArray<{ locale: string; accentId: string }> = [
  { locale: "en-US", accentId: "english.american" },
  { locale: "en-GB", accentId: "english.british" },
  { locale: "en-AU", accentId: "english.australian" },
  { locale: "en-IN", accentId: "english.indian" },
  { locale: "en-CA", accentId: "english.canadian" },
  { locale: "en-NZ", accentId: "english.new_zealand" },
  { locale: "en-IE", accentId: "english.irish" },
  { locale: "en-ZA", accentId: "english.south_african" },
  { locale: "nl-NL", accentId: "dutch.nederlands" },
  { locale: "nl-BE", accentId: "dutch.vlaams" },
  { locale: "es-ES", accentId: "spanish.spain" },
  { locale: "de-DE", accentId: "german.standard" },
  { locale: "fr-FR", accentId: "french.france" },
  { locale: "pt-BR", accentId: "portuguese.brazilian" },
  { locale: "pt-PT", accentId: "portuguese.european" },
];

export function equivalentAccentForLocale(locale: string): string {
  return REGION_ACCENT_EQUIVALENTS.find((item) => item.locale === locale.trim())?.accentId ?? "";
}

export function suppressedAccentIds(params: {
  selectedLocale?: string;
  pairs: Array<{ accentId: string; locale: string; voiceCount: number }>;
}): string[] {
  const selected = params.selectedLocale?.trim() ?? "";
  const hidden = new Set<string>();
  const selectedEquivalent = equivalentAccentForLocale(selected);
  if (selectedEquivalent) {
    hidden.add(selectedEquivalent);
  }
  if (selected) {
    return [...hidden];
  }
  const byAccent = new Map<string, Set<string>>();
  for (const pair of params.pairs) {
    if (!pair.accentId || pair.voiceCount <= 0) continue;
    const locales = byAccent.get(pair.accentId) ?? new Set<string>();
    locales.add(pair.locale);
    byAccent.set(pair.accentId, locales);
  }
  for (const [accentId, locales] of byAccent) {
    const equivalents = REGION_ACCENT_EQUIVALENTS.filter((item) => item.accentId === accentId);
    if (equivalents.length !== 1) continue;
    const only = equivalents[0]?.locale ?? "";
    if (locales.size === 1 && locales.has(only)) {
      hidden.add(accentId);
    }
  }
  return [...hidden];
}
