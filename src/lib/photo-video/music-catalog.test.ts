import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  PHOTO_VIDEO_CATALOG_TRACKS,
  PHOTO_VIDEO_MUSIC_CATALOG_STATUS,
  photoVideoCatalogTrackById,
} from "@/lib/photo-video/music-catalog";

describe("PX.4A.6.4 music catalog seam", () => {
  it("ships no redistributable tracks this phase", () => {
    assert.equal(PHOTO_VIDEO_MUSIC_CATALOG_STATUS, "empty");
    assert.equal(PHOTO_VIDEO_CATALOG_TRACKS.length, 0);
    assert.equal(photoVideoCatalogTrackById("any"), null);
  });

  it("keeps PhotoVideoAudio on none | ownMusic until a licensed catalog exists", () => {
    const audio = readFileSync(join(process.cwd(), "src/lib/photo-video/audio.ts"), "utf8");
    assert.match(audio, /export type PhotoVideoAudio = \{ kind: "none" \} \| PhotoVideoOwnMusic;/);
    assert.doesNotMatch(audio, /kind: "catalog"/);
    const exportAudio = readFileSync(join(process.cwd(), "src/lib/photo-video/export-audio.ts"), "utf8");
    assert.match(exportAudio, /kind: "catalog"/);
    assert.match(exportAudio, /does not ship catalog tracks/);
  });
});
