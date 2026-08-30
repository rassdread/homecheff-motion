import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { FreeMusicPublicCatalogTrack, FreeMusicTrackRights } from "@/lib/free-music/types";
import { admitTrack, canSelectCatalogTrack } from "@/lib/free-music/admit-track";
import { isStudioFreeMusicCatalogEnabledForUser } from "@/lib/free-music/flag";

const REGISTRY_PATH = join(process.cwd(), "src/data/free-music/registry.json");

let cached: FreeMusicTrackRights[] | null = null;

export function loadFreeMusicRegistry(force = false): FreeMusicTrackRights[] {
  if (cached && !force) return cached;
  if (!existsSync(REGISTRY_PATH)) {
    cached = [];
    return cached;
  }
  const raw = JSON.parse(readFileSync(REGISTRY_PATH, "utf8")) as { tracks?: FreeMusicTrackRights[] };
  cached = Array.isArray(raw.tracks) ? raw.tracks : [];
  return cached;
}

export function clearFreeMusicRegistryCache(): void {
  cached = null;
}

export function getFreeMusicTrackById(trackId: string): FreeMusicTrackRights | null {
  return loadFreeMusicRegistry().find((t) => t.trackId === trackId || t.id === trackId) ?? null;
}

export function listSelectableFreeMusicTracks(userId?: string | null): FreeMusicTrackRights[] {
  if (!isStudioFreeMusicCatalogEnabledForUser(userId)) return [];
  return loadFreeMusicRegistry().filter((t) => canSelectCatalogTrack(t));
}

export function toPublicCatalogTrack(track: FreeMusicTrackRights): FreeMusicPublicCatalogTrack {
  return {
    id: track.trackId,
    title: track.title,
    artist: track.artist,
    category: track.category ?? null,
    mood: track.mood ?? null,
    durationSeconds: Math.max(1, Math.round((track.durationMs ?? 0) / 1000) || 1),
    previewUrl: `/api/studio/free-music/asset/${encodeURIComponent(track.trackId)}?kind=preview`,
    licenseDisplay:
      track.licenseClass === "CC0"
        ? "CC0 1.0"
        : track.licenseClass === "PD_RECORDING"
          ? "Public domain recording"
          : track.licenseType,
    attributionRequired: track.attributionRequired === true,
    // Locale text is rendered client-side from contentIdNoticeKey (Phase 4 i18n).
    contentIdNotice: null,
    contentIdNoticeKey:
      track.contentIdRisk === "UNKNOWN"
        ? "unknown"
        : track.contentIdRisk === "KNOWN"
          ? "known"
          : null,
  };
}

export function listPublicFreeMusicCatalog(userId?: string | null): FreeMusicPublicCatalogTrack[] {
  return listSelectableFreeMusicTracks(userId).map(toPublicCatalogTrack);
}

export function assertTrackAdmissionOrThrow(track: FreeMusicTrackRights): void {
  const result = admitTrack(track);
  if (result.decision !== "APPROVED") {
    throw new Error(`Free music admission failed: ${result.reasons.join(",")}`);
  }
}
