/**
 * Language version display — flags, titles, lifecycle badges.
 */

import type { LanguageExportCode } from "@/lib/video-language-export";

export type VersionLifecycleDisplay = "current" | "archived" | "pending" | "failed";

const LANGUAGE_FLAGS: Partial<Record<LanguageExportCode | string, string>> = {
  en: "🇬🇧",
  nl: "🇳🇱",
  de: "🇩🇪",
  fr: "🇫🇷",
  es: "🇪🇸",
  pt: "🇵🇹",
  it: "🇮🇹",
  ar: "🇸🇦",
};

export function languageVersionFlag(languageCode: string): string {
  return LANGUAGE_FLAGS[languageCode] ?? "🌐";
}

export function formatLanguageVersionTitle(
  languageCode: string,
  languageLabel: string,
  version: number
): string {
  const flag = languageVersionFlag(languageCode);
  return `${flag} ${languageLabel} v${version}`;
}

export function formatTextVersionTitle(version: number, locale: "en" | "nl" = "nl"): string {
  const label = locale === "nl" ? "Tekstbewerking" : "Text edit";
  return `${label} v${version}`;
}

export function lifecycleBadgeLabelKey(
  lifecycle: VersionLifecycleDisplay
): string | null {
  if (lifecycle === "current") {
    return "projectDetail.versions.currentBadge";
  }
  if (lifecycle === "archived") {
    return "projectDetail.versions.archivedBadge";
  }
  return null;
}

export function lifecycleBadgeClassName(lifecycle: VersionLifecycleDisplay): string {
  if (lifecycle === "current") {
    return "bg-emerald-600 text-white";
  }
  if (lifecycle === "archived") {
    return "bg-zinc-200 text-zinc-700";
  }
  if (lifecycle === "failed") {
    return "bg-red-100 text-red-800";
  }
  return "bg-amber-100 text-amber-900";
}
