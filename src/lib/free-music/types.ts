/**
 * HomeCheff Free Music — Phase 2 rights model.
 * Fail closed. license = "free" is never a valid class.
 */

export const FREE_MUSIC_LICENSE_CLASSES = ["CC0", "PD_RECORDING", "CC_BY"] as const;
export type FreeMusicLicenseClass = (typeof FREE_MUSIC_LICENSE_CLASSES)[number];

/** Product decision Phase 2: CC BY deferred until attribution UX is certified. */
export const CC_BY_PHASE_2_DECISION = "DEFER" as const;

export const RIGHTS_REVIEW_STATUSES = [
  "DISCOVERED",
  "EVIDENCE_PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
] as const;
export type RightsReviewStatus = (typeof RIGHTS_REVIEW_STATUSES)[number];

export const CATALOG_STATUSES = ["DRAFT", "ACTIVE", "SUSPENDED", "RETIRED"] as const;
export type CatalogStatus = (typeof CATALOG_STATUSES)[number];

export const CONTENT_ID_RISKS = ["LOW", "KNOWN", "UNKNOWN", "HIGH"] as const;
export type ContentIdRisk = (typeof CONTENT_ID_RISKS)[number];

export const RIGHTS_STATUSES = ["VERIFIED", "PARTIAL", "UNKNOWN", "REJECTED"] as const;
export type RightsStatus = (typeof RIGHTS_STATUSES)[number];

export const FREE_MUSIC_CATEGORIES = [
  "UPBEAT",
  "PROMO",
  "FOOD",
  "LIFESTYLE",
  "CORPORATE",
  "CHILL",
  "CINEMATIC",
  "ACOUSTIC",
  "ELECTRONIC",
  "AMBIENT",
  "SOCIAL",
  "INSPIRATIONAL",
] as const;
export type FreeMusicCategory = (typeof FREE_MUSIC_CATEGORIES)[number];

export const BLOCKED_SOURCES = ["pixabay", "mixkit", "youtube_audio_library"] as const;

export type FreeMusicTrackRights = {
  id: string;
  trackId: string;
  title: string;
  artist: string;
  artistUrl?: string | null;

  sourceName: string;
  sourceAssetId?: string | null;
  sourceTrackUrl: string;
  sourceDownloadUrl?: string | null;

  licenseClass: FreeMusicLicenseClass | "UNKNOWN" | "REJECTED_CLASS";
  licenseType: string;
  licenseVersion: string;
  licenseUrl: string;

  licenseTextSnapshot?: string | null;
  licenseEvidenceUrl?: string | null;
  licenseEvidenceStorageKey?: string | null;
  licenseVerifiedAt?: string | null;

  commercialUseAllowed: boolean | null;
  modificationAllowed: boolean | null;
  syncAllowed: boolean | null;
  finishedOutputDistributionAllowed: boolean | null;

  homecheffHostingAllowed: boolean | null;
  studioCatalogDistributionAllowed: boolean | null;
  browserDeliveryAllowed: boolean | null;
  standaloneRedistributionAllowed: boolean | null;

  sublicensingRequired: boolean | null;
  sublicensingAllowed: boolean | null;

  attributionRequired: boolean | null;
  attributionText?: string | null;
  shareAlikeRequired: boolean | null;

  compositionRightsStatus: RightsStatus;
  recordingRightsStatus: RightsStatus;

  territories?: string | null;
  expiry?: string | null;
  revocable: boolean | null;

  contentIdRisk: ContentIdRisk;
  contentIdNotes?: string | null;

  rightsReviewStatus: RightsReviewStatus;
  reviewReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewDecision?: "APPROVED" | "REJECTED" | "MANUAL_REVIEW" | null;
  reviewNotes?: string | null;

  sourceFileHash?: string | null;
  storedMasterHash?: string | null;

  mimeType?: string | null;
  codec?: string | null;
  durationMs?: number | null;
  sampleRate?: number | null;
  fileSize?: number | null;

  masterStorageKey?: string | null;
  previewStorageKey?: string | null;

  catalogStatus: CatalogStatus;
  category?: FreeMusicCategory | null;
  mood?: string | null;

  qualityNotes?: string | null;
  rightsConfidence?: number | null;
  audioQuality?: number | null;
  editUsability?: number | null;
  categoryValue?: number | null;
  contentIdConfidence?: number | null;

  createdAt: string;
  updatedAt: string;
};

/** Client translates via `px4a.freeMusic.contentIdNotice.{key}` — never hardcode locale text in API. */
export type FreeMusicContentIdNoticeKey = "unknown" | "known";

export type FreeMusicPublicCatalogTrack = {
  id: string;
  title: string;
  artist: string;
  category: FreeMusicCategory | null;
  mood: string | null;
  durationSeconds: number;
  previewUrl: string | null;
  licenseDisplay: string;
  attributionRequired: boolean;
  /** @deprecated Prefer contentIdNoticeKey + client i18n. Kept null for Phase 4. */
  contentIdNotice: string | null;
  contentIdNoticeKey: FreeMusicContentIdNoticeKey | null;
};
