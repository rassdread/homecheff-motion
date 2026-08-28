/**
 * Fail-closed Free Music track admission engine.
 * Machine may REJECT or MANUAL_REVIEW; APPROVED also requires human review fields.
 */

import { CC_BY_PHASE_2_DECISION, type FreeMusicTrackRights } from "@/lib/free-music/types";

export type AdmissionDecision = "APPROVED" | "MANUAL_REVIEW" | "REJECTED";

export type AdmissionResult = {
  decision: AdmissionDecision;
  reasons: string[];
  checks: Record<string, boolean>;
};

function isTrue(v: boolean | null | undefined): boolean {
  return v === true;
}

function present(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

export function admitTrack(track: FreeMusicTrackRights): AdmissionResult {
  const reasons: string[] = [];
  const checks: Record<string, boolean> = {};

  const sourceLower = `${track.sourceName} ${track.sourceTrackUrl}`.toLowerCase();
  if (sourceLower.includes("pixabay") || sourceLower.includes("mixkit.co") || sourceLower.includes("youtube.com/audiolibrary") || sourceLower.includes("audiolibrary")) {
    reasons.push("BLOCKED_SOURCE");
  }

  if (track.licenseClass === "CC_BY" && CC_BY_PHASE_2_DECISION === "DEFER") {
    reasons.push("CC_BY_DEFERRED_PHASE_2");
  }

  if (track.shareAlikeRequired === true) {
    reasons.push("SHAREALIKE_EXCLUDED");
  }

  const licenseTypeLower = track.licenseType.toLowerCase();
  if (licenseTypeLower.includes("nc") || licenseTypeLower.includes("noncommercial") || licenseTypeLower.includes("non-commercial")) {
    reasons.push("NC_FORBIDDEN");
  }
  if (/(^|[^a-z])nd([^a-z]|$)/i.test(track.licenseType) || licenseTypeLower.includes("noderiv") || licenseTypeLower.includes("no derivatives")) {
    reasons.push("ND_FORBIDDEN");
  }

  checks.LICENCE_VERIFIED =
    (track.licenseClass === "CC0" || track.licenseClass === "PD_RECORDING") &&
    present(track.licenseUrl) &&
    present(track.licenseType) &&
    present(track.licenseVersion);
  if (!checks.LICENCE_VERIFIED) reasons.push("LICENCE_NOT_VERIFIED");

  checks.RECORDING_RIGHTS_VERIFIED = track.recordingRightsStatus === "VERIFIED";
  if (!checks.RECORDING_RIGHTS_VERIFIED) reasons.push("RECORDING_RIGHTS_NOT_VERIFIED");

  if (track.compositionRightsStatus === "UNKNOWN" && track.recordingRightsStatus !== "VERIFIED") {
    reasons.push("COMPOSITION_OR_RECORDING_UNKNOWN");
  }
  if (track.compositionRightsStatus === "VERIFIED" && track.recordingRightsStatus === "UNKNOWN") {
    reasons.push("PD_COMPOSITION_UNKNOWN_RECORDING");
  }

  checks.COMMERCIAL_USE_ALLOWED = isTrue(track.commercialUseAllowed);
  if (!checks.COMMERCIAL_USE_ALLOWED) reasons.push("COMMERCIAL_USE_NOT_ALLOWED");

  checks.MODIFICATION_ALLOWED = isTrue(track.modificationAllowed);
  if (!checks.MODIFICATION_ALLOWED) reasons.push("MODIFICATION_NOT_ALLOWED");

  checks.SYNC_ALLOWED = isTrue(track.syncAllowed);
  if (!checks.SYNC_ALLOWED) reasons.push("SYNC_NOT_ALLOWED");

  checks.FINISHED_OUTPUT_DISTRIBUTION_ALLOWED = isTrue(track.finishedOutputDistributionAllowed);
  if (!checks.FINISHED_OUTPUT_DISTRIBUTION_ALLOWED) reasons.push("FINISHED_OUTPUT_NOT_ALLOWED");

  checks.HOMECHEFF_HOSTING_ALLOWED = isTrue(track.homecheffHostingAllowed);
  if (!checks.HOMECHEFF_HOSTING_ALLOWED) reasons.push("HOSTING_NOT_ALLOWED");

  checks.STUDIO_CATALOG_DISTRIBUTION_ALLOWED = isTrue(track.studioCatalogDistributionAllowed);
  if (!checks.STUDIO_CATALOG_DISTRIBUTION_ALLOWED) reasons.push("CATALOG_DISTRIBUTION_NOT_ALLOWED");

  checks.PROVENANCE_COMPLETE =
    present(track.title) &&
    present(track.artist) &&
    present(track.sourceName) &&
    present(track.sourceTrackUrl) &&
    track.artist.toLowerCase() !== "anonymous" &&
    !track.artist.toLowerCase().includes("not verified");
  if (!checks.PROVENANCE_COMPLETE) reasons.push("PROVENANCE_INCOMPLETE");

  checks.EVIDENCE_SNAPSHOT_PRESENT =
    present(track.licenseTextSnapshot) || present(track.licenseEvidenceStorageKey) || present(track.licenseEvidenceUrl);
  if (!checks.EVIDENCE_SNAPSHOT_PRESENT) reasons.push("EVIDENCE_SNAPSHOT_MISSING");

  checks.SOURCE_FILE_HASH_PRESENT = present(track.sourceFileHash) && /^[a-f0-9]{64}$/i.test(track.sourceFileHash!);
  if (!checks.SOURCE_FILE_HASH_PRESENT) reasons.push("SOURCE_HASH_MISSING");

  checks.STORED_MASTER_HASH_PRESENT = present(track.storedMasterHash) && /^[a-f0-9]{64}$/i.test(track.storedMasterHash!);
  if (!checks.STORED_MASTER_HASH_PRESENT) reasons.push("STORED_MASTER_HASH_MISSING");

  checks.CONTENT_ID_NOT_HIGH = track.contentIdRisk !== "HIGH";
  if (!checks.CONTENT_ID_NOT_HIGH) reasons.push("CONTENT_ID_HIGH");

  checks.HUMAN_REVIEW_PRESENT =
    present(track.reviewedBy) && present(track.reviewedAt) && track.reviewDecision === "APPROVED";
  if (!checks.HUMAN_REVIEW_PRESENT) reasons.push("HUMAN_REVIEW_REQUIRED");

  checks.NOT_REJECTED_STATUS = track.rightsReviewStatus !== "REJECTED" && track.catalogStatus !== "RETIRED";
  if (!checks.NOT_REJECTED_STATUS) reasons.push("REJECTED_OR_RETIRED_STATUS");

  // Deduplicate reasons while keeping order
  const uniqueReasons = [...new Set(reasons)];

  if (uniqueReasons.some((r) =>
    [
      "BLOCKED_SOURCE",
      "NC_FORBIDDEN",
      "ND_FORBIDDEN",
      "SHAREALIKE_EXCLUDED",
      "CC_BY_DEFERRED_PHASE_2",
      "CONTENT_ID_HIGH",
      "LICENCE_NOT_VERIFIED",
      "RECORDING_RIGHTS_NOT_VERIFIED",
      "PD_COMPOSITION_UNKNOWN_RECORDING",
      "COMMERCIAL_USE_NOT_ALLOWED",
      "MODIFICATION_NOT_ALLOWED",
      "SYNC_NOT_ALLOWED",
      "FINISHED_OUTPUT_NOT_ALLOWED",
      "HOSTING_NOT_ALLOWED",
      "CATALOG_DISTRIBUTION_NOT_ALLOWED",
      "SOURCE_HASH_MISSING",
      "STORED_MASTER_HASH_MISSING",
      "EVIDENCE_SNAPSHOT_MISSING",
      "REJECTED_OR_RETIRED_STATUS",
    ].includes(r)
  )) {
    return { decision: "REJECTED", reasons: uniqueReasons, checks };
  }

  if (track.contentIdRisk === "UNKNOWN") {
    if (checks.HUMAN_REVIEW_PRESENT && present(track.contentIdNotes)) {
      // Documented human acceptance of UNKNOWN Content ID risk.
    } else {
      uniqueReasons.push("CONTENT_ID_UNKNOWN_MANUAL");
    }
  }

  if (
    uniqueReasons.includes("PROVENANCE_INCOMPLETE") ||
    uniqueReasons.includes("HUMAN_REVIEW_REQUIRED") ||
    uniqueReasons.includes("COMPOSITION_OR_RECORDING_UNKNOWN") ||
    uniqueReasons.includes("CONTENT_ID_UNKNOWN_MANUAL")
  ) {
    return { decision: "MANUAL_REVIEW", reasons: uniqueReasons, checks };
  }

  if (uniqueReasons.length > 0) {
    return { decision: "MANUAL_REVIEW", reasons: uniqueReasons, checks };
  }

  return { decision: "APPROVED", reasons: [], checks };
}

export function canSelectCatalogTrack(track: FreeMusicTrackRights): boolean {
  if (track.catalogStatus !== "ACTIVE") return false;
  if (track.rightsReviewStatus !== "APPROVED") return false;
  return admitTrack(track).decision === "APPROVED";
}

export function resolveCatalogAudioForRender(input: {
  catalogTrackId: string;
  clientAudioUrl?: string | null;
  registry: FreeMusicTrackRights[];
}): { ok: true; masterStorageKey: string; track: FreeMusicTrackRights } | { ok: false; reason: string } {
  if (input.clientAudioUrl) {
    return { ok: false, reason: "CLIENT_AUDIO_URL_FORBIDDEN_FOR_CATALOG" };
  }
  const track = input.registry.find((t) => t.trackId === input.catalogTrackId || t.id === input.catalogTrackId);
  if (!track) return { ok: false, reason: "UNKNOWN_TRACK_ID" };
  if (track.catalogStatus === "SUSPENDED") return { ok: false, reason: "TRACK_SUSPENDED" };
  if (track.catalogStatus === "RETIRED") return { ok: false, reason: "TRACK_RETIRED" };
  if (track.catalogStatus !== "ACTIVE" || track.rightsReviewStatus !== "APPROVED") {
    return { ok: false, reason: "TRACK_NOT_ACTIVE" };
  }
  const admission = admitTrack(track);
  if (admission.decision !== "APPROVED") return { ok: false, reason: "ADMISSION_FAILED" };
  if (!track.masterStorageKey) return { ok: false, reason: "MISSING_STORAGE_ASSET" };
  return { ok: true, masterStorageKey: track.masterStorageKey, track };
}
