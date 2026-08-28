/**
 * Phase 3 registry ↔ storage reconciliation helpers.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";
import { admitTrack, canSelectCatalogTrack } from "@/lib/free-music/admit-track";
import { loadFreeMusicRegistry } from "@/lib/free-music/registry";
import type { FreeMusicTrackRights } from "@/lib/free-music/types";

export type TrackProvenanceResult = {
  trackId: string;
  trackProvenanceMatch: "PASS" | "FAIL";
  reasons: string[];
  sourceHash?: string;
  localHash?: string;
};

export type CatalogReconciliation = {
  totalRightsApproved: number;
  pilotTracksSelected: number;
  activeReadyTracks: number;
  draftTracks: number;
  suspendedTracks: number;
  retiredTracks: number;
  cc0: number;
  pdRecording: number;
  ccBy: number;
  contentIdLow: number;
  contentIdKnown: number;
  contentIdUnknown: number;
  contentIdHigh: number;
  hashMismatches: number;
  orphanLocalMasters: string[];
  missingLocalMasters: string[];
  duplicateLocalMasterIds: string[];
  provenance: TrackProvenanceResult[];
};

function sha256Hex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function localMasterIndex(mastersDir: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!existsSync(mastersDir)) return map;
  for (const file of readdirSync(mastersDir)) {
    if (file.endsWith(".json")) continue;
    const trackId = file.replace(/\.[^.]+$/, "");
    const prev = map.get(trackId);
    if (prev) map.set(trackId, `${prev},${file}`);
    else map.set(trackId, file);
  }
  return map;
}

export function verifyTrackProvenance(
  track: FreeMusicTrackRights,
  mastersDir: string
): TrackProvenanceResult {
  const reasons: string[] = [];
  const index = localMasterIndex(mastersDir);
  const file = index.get(track.trackId);
  if (!file || file.includes(",")) {
    if (!file) reasons.push("LOCAL_MASTER_MISSING");
    else reasons.push("DUPLICATE_LOCAL_MASTER");
    return { trackId: track.trackId, trackProvenanceMatch: "FAIL", reasons };
  }
  const path = join(mastersDir, file);
  const bytes = readFileSync(path);
  const localHash = sha256Hex(bytes);
  if (!track.sourceFileHash) reasons.push("REGISTRY_SOURCE_HASH_MISSING");
  else if (track.sourceFileHash !== localHash) reasons.push("SOURCE_HASH_MISMATCH");
  if (track.storedMasterHash && track.storedMasterHash !== localHash) reasons.push("STORED_HASH_MISMATCH");
  const admission = admitTrack(track);
  if (admission.decision !== "APPROVED") reasons.push("ADMISSION_NOT_APPROVED");
  const evidencePath = join(process.cwd(), "src/data/free-music/evidence", `${track.trackId}.v1.txt`);
  if (!existsSync(evidencePath)) reasons.push("EVIDENCE_SNAPSHOT_MISSING");
  return {
    trackId: track.trackId,
    trackProvenanceMatch: reasons.length === 0 ? "PASS" : "FAIL",
    reasons,
    sourceHash: track.sourceFileHash ?? undefined,
    localHash,
  };
}

export function reconcileFreeMusicCatalog(input?: { mastersDir?: string }): CatalogReconciliation {
  const mastersDir = input?.mastersDir ?? join(process.cwd(), "tmp/free-music-masters");
  const tracks = loadFreeMusicRegistry(true);
  const index = localMasterIndex(mastersDir);
  const provenance = tracks.map((t) => verifyTrackProvenance(t, mastersDir));

  const orphanLocalMasters: string[] = [];
  const trackIds = new Set(tracks.map((t) => t.trackId));
  for (const trackId of index.keys()) {
    if (!trackIds.has(trackId)) orphanLocalMasters.push(trackId);
  }

  const missingLocalMasters = tracks
    .filter((t) => t.rightsReviewStatus === "APPROVED" && !index.has(t.trackId))
    .map((t) => t.trackId);

  const duplicateLocalMasterIds = [...index.entries()]
    .filter(([, v]) => v.includes(","))
    .map(([k]) => k);

  return {
    totalRightsApproved: tracks.filter((t) => t.rightsReviewStatus === "APPROVED").length,
    pilotTracksSelected: tracks.filter((t) => t.catalogStatus === "ACTIVE").length,
    activeReadyTracks: tracks.filter((t) => canSelectCatalogTrack(t)).length,
    draftTracks: tracks.filter((t) => t.catalogStatus === "DRAFT").length,
    suspendedTracks: tracks.filter((t) => t.catalogStatus === "SUSPENDED").length,
    retiredTracks: tracks.filter((t) => t.catalogStatus === "RETIRED").length,
    cc0: tracks.filter((t) => t.licenseClass === "CC0").length,
    pdRecording: tracks.filter((t) => t.licenseClass === "PD_RECORDING").length,
    ccBy: tracks.filter((t) => t.licenseClass === "CC_BY").length,
    contentIdLow: tracks.filter((t) => t.contentIdRisk === "LOW").length,
    contentIdKnown: tracks.filter((t) => t.contentIdRisk === "KNOWN").length,
    contentIdUnknown: tracks.filter((t) => t.contentIdRisk === "UNKNOWN").length,
    contentIdHigh: tracks.filter((t) => t.contentIdRisk === "HIGH").length,
    hashMismatches: provenance.filter((p) => p.reasons.includes("SOURCE_HASH_MISMATCH")).length,
    orphanLocalMasters,
    missingLocalMasters,
    duplicateLocalMasterIds,
    provenance,
  };
}

export const PILOT_TRACK_IDS = [
  "fm_oga_adventure_time",
  "fm_oga_andys_report_8bit_and_piano_ver",
  "fm_oga_battle_theme_0",
  "fm_oga_besai_crystal_gardens_2_forbidden_pathway",
  "fm_oga_cave_explorer",
] as const;
