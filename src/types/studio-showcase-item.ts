export const SHOWCASE_PAGE_KEYS = [
  "home",
  "studio",
  "editor",
  "motion",
  "publish",
  "library",
  "projects",
  "usage",
  "global",
] as const;

export type ShowcasePageKey = (typeof SHOWCASE_PAGE_KEYS)[number];

export const SHOWCASE_SERVICE_KEYS = ["studio", "editor", "motion", "publish", "library"] as const;

export type ShowcaseServiceKey = (typeof SHOWCASE_SERVICE_KEYS)[number];

export const SHOWCASE_MEDIA_TYPES = ["image", "video"] as const;

export type ShowcaseMediaType = (typeof SHOWCASE_MEDIA_TYPES)[number];

export type StudioShowcaseItemRecord = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string;
  mediaType: ShowcaseMediaType;
  mediaUrl: string;
  thumbnailUrl: string | null;
  posterUrl: string | null;
  pageKey: ShowcasePageKey;
  serviceKey: ShowcaseServiceKey | null;
  category: string | null;
  assistantPrompt: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  locale: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StudioShowcaseItemInput = {
  title: string;
  subtitle?: string | null;
  description: string;
  mediaType: ShowcaseMediaType;
  mediaUrl: string;
  thumbnailUrl?: string | null;
  posterUrl?: string | null;
  pageKey: ShowcasePageKey;
  serviceKey?: ShowcaseServiceKey | null;
  category?: string | null;
  assistantPrompt?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  locale?: string | null;
};

export type StudioShowcaseAdminFilters = {
  pageKey?: string | null;
  serviceKey?: string | null;
  active?: boolean | null;
  locale?: string | null;
};
