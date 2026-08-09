/**
 * S.7E — Canonical language identity (storyboard / project scoped).
 */

export type StudioLanguageIdentity = {
  version: "7e.1";
  originalLanguage: string;
  primaryLanguage: string;
  secondaryLanguages: string[];
  preferredExportLanguage: string | null;
  subtitleLanguage: string | null;
  voiceLanguage: string | null;
  brandLanguage: string | null;
};

export function buildLanguageIdentity(input: {
  voiceLanguage?: string | null;
  subtitleLanguage?: string | null;
  exportLanguages?: string[] | null;
  brandLanguage?: string | null;
  preferredExportLanguage?: string | null;
}): StudioLanguageIdentity {
  const primary = (input.voiceLanguage ?? input.subtitleLanguage ?? "en")
    .trim()
    .toLowerCase()
    .slice(0, 2) || "en";
  const secondary = (input.exportLanguages ?? [])
    .map((l) => l.trim().toLowerCase().slice(0, 2))
    .filter((l) => l && l !== primary);
  const uniqueSecondary = [...new Set(secondary)];

  return {
    version: "7e.1",
    originalLanguage: primary,
    primaryLanguage: primary,
    secondaryLanguages: uniqueSecondary,
    preferredExportLanguage:
      input.preferredExportLanguage?.trim().toLowerCase().slice(0, 2) ||
      uniqueSecondary[0] ||
      null,
    subtitleLanguage: input.subtitleLanguage?.trim().toLowerCase().slice(0, 2) || primary,
    voiceLanguage: input.voiceLanguage?.trim().toLowerCase().slice(0, 2) || primary,
    brandLanguage: input.brandLanguage?.trim().toLowerCase().slice(0, 2) || null,
  };
}
