import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PHOTO_VIDEO_MUSIC_CATALOG_STATUS,
  getPhotoVideoCatalogTracks,
  getPhotoVideoMusicCatalogStatus,
  photoVideoCatalogTrackById,
} from "@/lib/photo-video/music-catalog";

describe("PX.4A.6.4 / Free Music catalog seam", () => {
  it("keeps catalog empty while kill switch is OFF", () => {
    const prev = process.env.STUDIO_FREE_MUSIC_CATALOG_ENABLED;
    delete process.env.STUDIO_FREE_MUSIC_CATALOG_ENABLED;
    assert.equal(PHOTO_VIDEO_MUSIC_CATALOG_STATUS, "empty");
    assert.equal(getPhotoVideoMusicCatalogStatus(), "empty");
    assert.equal(getPhotoVideoCatalogTracks().length, 0);
    assert.equal(photoVideoCatalogTrackById("any"), null);
    if (prev == null) delete process.env.STUDIO_FREE_MUSIC_CATALOG_ENABLED;
    else process.env.STUDIO_FREE_MUSIC_CATALOG_ENABLED = prev;
  });
});
