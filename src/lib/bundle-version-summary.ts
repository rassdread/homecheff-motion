import type { MotionVersionCatalog } from "@/lib/motion-version-catalog";

export type BundleVersionCountSummary = {
  languageParts: Array<{ code: string; label: string; count: number }>;
  languageLine: string;
  totalVersions: number;
  totalLine: string;
  latestLabel: string | null;
};

export function summarizeBundleVersionCounts(
  catalog: MotionVersionCatalog,
  locale: "en" | "nl" = "nl"
): BundleVersionCountSummary {
  const languageParts = catalog.languages.map((lang) => ({
    code: lang.code,
    label: lang.label,
    count: catalog.slotsByLanguage[lang.code]?.length ?? 0,
  }));
  const totalVersions = languageParts.reduce((sum, row) => sum + row.count, 0);

  const languageLine = languageParts
    .map((row) => `${row.label} (${row.count})`)
    .join(" · ");

  const totalLine =
    totalVersions === 1
      ? locale === "en"
        ? "1 version"
        : "1 versie"
      : locale === "en"
        ? `${totalVersions} versions`
        : `${totalVersions} versies`;

  const defaultLang = catalog.defaultLanguageCode;
  const slots = catalog.slotsByLanguage[defaultLang] ?? [];
  const latestSlot = slots[slots.length - 1] ?? null;
  const latestLabel =
    latestSlot ?
      `${latestSlot.languageLabel} ${latestSlot.displayLabel}`
    : null;

  return {
    languageParts,
    languageLine,
    totalVersions,
    totalLine,
    latestLabel,
  };
}
