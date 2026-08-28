/**
 * Resolve Free Music audio bytes for preview/export.
 * Prefer Vercel Blob canonical object; optional local-master fallback for pilot cert only.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";
import { resolvePublicBlobUrlByPathname } from "@/lib/vercel-blob-config";
import { admitTrack, canSelectCatalogTrack } from "@/lib/free-music/admit-track";
import { getFreeMusicTrackById } from "@/lib/free-music/registry";
import type { FreeMusicTrackRights } from "@/lib/free-music/types";

export type FreeMusicAssetKind = "master" | "preview";

export type FreeMusicAssetResolve =
  | { ok: true; track: FreeMusicTrackRights; contentType: string; body: Buffer; source: "blob" | "local" }
  | { ok: false; reason: string };

function envBool(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return defaultValue;
  const v = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return defaultValue;
}

export function isFreeMusicLocalMastersAllowed(): boolean {
  return envBool("FREE_MUSIC_ALLOW_LOCAL_MASTERS", false);
}

function mimeForExt(ext: string): string {
  const e = ext.replace(".", "").toLowerCase();
  if (e === "mp3") return "audio/mpeg";
  if (e === "ogg" || e === "oga") return "audio/ogg";
  if (e === "wav") return "audio/wav";
  if (e === "flac") return "audio/flac";
  return "application/octet-stream";
}

function localMasterPath(trackId: string): string | null {
  const dir = join(process.cwd(), "tmp/free-music-masters");
  if (!existsSync(dir)) return null;
  const hit = readdirSync(dir).find((f) => f.startsWith(`${trackId}.`) && !f.endsWith(".json"));
  return hit ? join(dir, hit) : null;
}

export async function resolveFreeMusicAsset(input: {
  trackId: string;
  kind: FreeMusicAssetKind;
  /** When true, skip ACTIVE gate (admin/debug only). Default false. */
  bypassCatalogStatus?: boolean;
}): Promise<FreeMusicAssetResolve> {
  const track = getFreeMusicTrackById(input.trackId);
  if (!track) return { ok: false, reason: "UNKNOWN_TRACK_ID" };
  if (track.catalogStatus === "SUSPENDED") return { ok: false, reason: "TRACK_SUSPENDED" };
  if (track.catalogStatus === "RETIRED") return { ok: false, reason: "TRACK_RETIRED" };
  if (!input.bypassCatalogStatus) {
    if (!canSelectCatalogTrack(track)) return { ok: false, reason: "TRACK_NOT_SELECTABLE" };
  } else {
    const admission = admitTrack(track);
    if (admission.decision !== "APPROVED") return { ok: false, reason: "ADMISSION_FAILED" };
  }

  const storageKey = input.kind === "preview" ? track.previewStorageKey : track.masterStorageKey;
  if (storageKey) {
    const url = await resolvePublicBlobUrlByPathname(storageKey);
    if (url) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const ab = await res.arrayBuffer();
          const body = Buffer.from(ab);
          const ext = storageKey.split(".").pop() || "mp3";
          return { ok: true, track, contentType: mimeForExt(ext), body, source: "blob" };
        }
      } catch {
        /* fall through */
      }
    }
  }

  if (isFreeMusicLocalMastersAllowed()) {
    const local = localMasterPath(track.trackId);
    if (local) {
      const body = readFileSync(local);
      return { ok: true, track, contentType: mimeForExt(extname(local)), body, source: "local" };
    }
  }

  return { ok: false, reason: "MISSING_STORAGE_ASSET" };
}
