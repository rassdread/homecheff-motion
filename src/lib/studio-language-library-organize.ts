/**
 * S.7E — Subtitle & translation library organization (reuse free).
 */

export const STUDIO_SUBTITLE_LIBRARY_BUCKETS = [
  "generated",
  "edited",
  "favorite",
  "brand",
  "project",
  "history",
  "versions",
] as const;

export type StudioSubtitleLibraryBucket = (typeof STUDIO_SUBTITLE_LIBRARY_BUCKETS)[number];

export const STUDIO_TRANSLATION_LIBRARY_BUCKETS = [
  "translations",
  "language_variants",
  "history",
  "quality_review",
  "approved",
  "brand_approved",
] as const;

export type StudioTranslationLibraryBucket =
  (typeof STUDIO_TRANSLATION_LIBRARY_BUCKETS)[number];

export type StudioLanguageLibraryEntry = {
  id: string;
  kind: "subtitle" | "translation";
  bucket: string;
  language: string;
  label: string;
  reuseWithoutCharge: true;
};

export function organizeSubtitleLibraryEntries(
  entries: Array<{
    id: string;
    language: string;
    label: string;
    edited?: boolean;
    favorite?: boolean;
    brand?: boolean;
    project?: boolean;
  }>
): StudioLanguageLibraryEntry[] {
  return entries.map((e) => {
    let bucket: StudioSubtitleLibraryBucket = "generated";
    if (e.brand) bucket = "brand";
    else if (e.favorite) bucket = "favorite";
    else if (e.project) bucket = "project";
    else if (e.edited) bucket = "edited";
    return {
      id: e.id,
      kind: "subtitle",
      bucket,
      language: e.language,
      label: e.label,
      reuseWithoutCharge: true,
    };
  });
}

export function organizeTranslationLibraryEntries(
  entries: Array<{
    id: string;
    language: string;
    label: string;
    approved?: boolean;
    brandApproved?: boolean;
    inReview?: boolean;
  }>
): StudioLanguageLibraryEntry[] {
  return entries.map((e) => {
    let bucket: StudioTranslationLibraryBucket = "translations";
    if (e.brandApproved) bucket = "brand_approved";
    else if (e.approved) bucket = "approved";
    else if (e.inReview) bucket = "quality_review";
    return {
      id: e.id,
      kind: "translation",
      bucket,
      language: e.language,
      label: e.label,
      reuseWithoutCharge: true,
    };
  });
}
