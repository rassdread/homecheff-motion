import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PHOTO_VIDEO_DRAFT_TTL_MS,
  canRestorePhotoVideoDraftForUser,
  isPhotoVideoDraftExpired,
  photoVideoDraftReturnTo,
  photoVideoDraftDbName,
  photoVideoDraftMetaKey,
  toDraftCompositionMeta,
} from "@/lib/photo-video/draft-storage";
import {
  addPhotos,
  addTextForPhoto,
  createLocalPhoto,
  createPhotoVideoComposition,
  setAudio,
} from "@/lib/photo-video/composition";
import { PHOTO_VIDEO_DEFAULT_VOLUME } from "@/lib/photo-video/audio";
import { trackPhotoVideoFunnelEvent, listPhotoVideoFunnelEvents } from "@/lib/photo-video/funnel-analytics";
import { isPublicStudioSurface, validateStudioReturnTo } from "@/lib/identity/return-path";

describe("PX.4A.3 photo-video draft + funnel", () => {
  it("serializes composition without object URLs or screen pixels", () => {
    let c = addPhotos(
      createPhotoVideoComposition(),
      [
        createLocalPhoto({ id: "p0", previewUrl: "blob:a", naturalWidth: 10, naturalHeight: 10 }),
        createLocalPhoto({ id: "p1", previewUrl: "blob:b", naturalWidth: 10, naturalHeight: 10 }),
      ]
    );
    c = addTextForPhoto(c, { id: "t0", photoId: "p0", text: "Vers" });
    c = setAudio(c, {
      kind: "ownMusic",
      startSeconds: 2,
      durationSeconds: 15,
      trackDurationSeconds: 40,
      volume: PHOTO_VIDEO_DEFAULT_VOLUME,
      objectUrl: "blob:audio",
      fileName: "secret.mp3",
      peaks: [0.1, 0.2],
    });
    const meta = toDraftCompositionMeta(c);
    assert.equal(meta.photos[0]?.id, "p0");
    assert.equal("previewUrl" in meta.photos[0]!, false);
    assert.equal(meta.photos[0]?.mediaKind, undefined);
    assert.equal(meta.photos[0]?.video, undefined);
    assert.equal(meta.audio.kind, "ownMusic");
    if (meta.audio.kind === "ownMusic") {
      assert.equal(meta.audio.startSeconds, 2);
      assert.equal("objectUrl" in meta.audio, false);
      assert.equal(meta.audio.fileName, "secret.mp3");
    }
    assert.equal(meta.overlays[0]?.text, "Vers");
    assert.equal(meta.durationMode, "fixed");
    assert.equal(meta.durationSeconds, 15);
    assert.equal(meta.movementMode, "auto");
  });

  it("expires drafts after the retention window", () => {
    const now = 1_000_000;
    assert.equal(
      isPhotoVideoDraftExpired({
        version: 1,
        updatedAt: now - PHOTO_VIDEO_DRAFT_TTL_MS - 1,
        expiresAt: now - 1,
        ownerUserId: null,
        saved: false,
        composition: {
          photos: [],
          ratio: "9:16",
          pace: "normaal",
          style: "auto",
          overlays: [],
          audio: { kind: "none" },
          endCardSeconds: 0,
        },
      }, now),
      true
    );
  });

  it("keeps returnTo on the creator for auth handoff", () => {
    assert.equal(photoVideoDraftReturnTo(true), "/studio/photo-video?resume=1");
    assert.equal(validateStudioReturnTo("/studio/photo-video"), "/studio/photo-video");
    assert.equal(validateStudioReturnTo("/studio/photo-video?resume=1"), "/studio/photo-video?resume=1");
    assert.equal(isPublicStudioSurface("/studio/photo-video"), true);
    assert.equal(isPublicStudioSurface("/studio/photo-video?resume=1"), true);
    assert.equal(photoVideoDraftMetaKey("studio"), "hc-px4a-draft:v1");
    assert.equal(photoVideoDraftMetaKey("homecheff-item"), "hc-px4a-draft:v1:item");
    assert.notEqual(photoVideoDraftDbName("studio"), photoVideoDraftDbName("homecheff-item"));
  });

  it("isolates saved drafts across account switch", () => {
    const meta = {
      version: 1,
      updatedAt: 1,
      expiresAt: Date.now() + 1000,
      ownerUserId: "user-a",
      saved: true,
      composition: {
        photos: [],
        ratio: "9:16" as const,
        pace: "normaal" as const,
        style: "auto" as const,
        overlays: [],
        audio: { kind: "none" as const },
        endCardSeconds: 0,
      },
    };
    assert.equal(canRestorePhotoVideoDraftForUser(meta, "user-a"), true);
    assert.equal(canRestorePhotoVideoDraftForUser(meta, "user-b"), false);
    assert.equal(canRestorePhotoVideoDraftForUser({ ...meta, ownerUserId: null }, "user-b"), true);
  });

  it("records privacy-safe funnel events without payloads", () => {
    if (typeof globalThis.localStorage === "undefined") {
      const store = new Map<string, string>();
      // @ts-expect-error test shim
      globalThis.localStorage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
      };
    }
    trackPhotoVideoFunnelEvent("photo_video_opened");
    trackPhotoVideoFunnelEvent("photo_video_save_clicked");
    const events = listPhotoVideoFunnelEvents();
    assert.ok(events.some((event) => event.type === "photo_video_opened"));
    assert.ok(events.every((event) => Object.keys(event).every((key) => key === "at" || key === "type")));
  });
});
