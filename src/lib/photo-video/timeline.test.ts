import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addPhotos,
  createLocalPhoto,
  createLocalVideo,
  createPhotoVideoComposition,
  migrateComposition,
  setDurationSeconds,
  setTransitionKind,
} from "@/lib/photo-video/composition";
import { sampleLocalMotion } from "@/lib/photo-video/motion";
import { motionKindForPhoto } from "@/lib/photo-video/movement";
import { buildPhotoVideoClips, playheadAt } from "@/lib/photo-video/timeline";

describe("PX.4A.4B timeline + local motion", () => {
  it("builds overlapping clips from distributed hold for fixed duration", () => {
    const c = setDurationSeconds(
      addPhotos(
        createPhotoVideoComposition(),
        [0, 1, 2].map((i) =>
          createLocalPhoto({ id: `p${i}`, previewUrl: `x${i}`, naturalWidth: 10, naturalHeight: 10 })
        )
      ),
      15
    );
    const clips = buildPhotoVideoClips(c);
    assert.equal(clips.length, 3);
    assert.equal(clips[0]?.startSeconds, 0);
    assert.ok(clips[0]!.holdSeconds > 2);
    const head = playheadAt(c, clips[0]!.holdSeconds - 0.2);
    assert.ok(head.from);
    assert.ok(head.to);
    assert.ok(head.mix > 0);
    assert.equal(head.transition, "fade");
  });

  it("gives video clips their trim duration instead of equal photo hold", () => {
    const c = setDurationSeconds(
      addPhotos(createPhotoVideoComposition(), [
        createLocalPhoto({ id: "p0", previewUrl: "x0", naturalWidth: 10, naturalHeight: 10 }),
        createLocalVideo({
          id: "v0",
          previewUrl: "poster",
          objectUrl: "blob:v",
          naturalWidth: 10,
          naturalHeight: 10,
          sourceDurationSeconds: 12,
          trimStartSeconds: 0,
          trimEndSeconds: 5,
        }),
        createLocalPhoto({ id: "p1", previewUrl: "x1", naturalWidth: 10, naturalHeight: 10 }),
      ]),
      15
    );
    const clips = buildPhotoVideoClips(c);
    assert.equal(clips.length, 3);
    assert.equal(clips[1]?.holdSeconds, 5);
    assert.ok(Math.abs((clips[0]?.holdSeconds ?? 0) - (clips[2]?.holdSeconds ?? 1)) < 1e-6);
    assert.ok((clips[0]?.holdSeconds ?? 0) !== 5);
  });

  it("cut transition uses no mix", () => {
    const c = setTransitionKind(
      addPhotos(
        createPhotoVideoComposition(),
        [0, 1].map((i) =>
          createLocalPhoto({ id: `p${i}`, previewUrl: `x${i}`, naturalWidth: 10, naturalHeight: 10 })
        )
      ),
      "cut"
    );
    const head = playheadAt(c, 0.5);
    assert.equal(head.mix, 0);
    assert.equal(head.to, null);
    assert.equal(head.transition, "cut");
  });

  it("motion is deterministic and supports directional pans", () => {
    const a = sampleLocalMotion("zoom-in", 0, 0.08);
    const b = sampleLocalMotion("zoom-in", 1, 0.08);
    assert.equal(a.zoom, 1);
    assert.ok(b.zoom > a.zoom);
    assert.deepEqual(sampleLocalMotion("pan-left", 0.3, 0.1), sampleLocalMotion("pan-left", 0.3, 0.1));
    assert.notDeepEqual(sampleLocalMotion("pan-left", 0.3, 0.1), sampleLocalMotion("pan-right", 0.3, 0.1));
  });

  it("automatic movement varies between photos", () => {
    const c = addPhotos(
      createPhotoVideoComposition(),
      [0, 1, 2, 3].map((i) =>
        createLocalPhoto({ id: `p${i}`, previewUrl: `x${i}`, naturalWidth: 10, naturalHeight: 10 })
      )
    );
    const kinds = c.photos.map((photo, index) => motionKindForPhoto(c, photo, index));
    assert.ok(new Set(kinds).size > 1);
  });
});

describe("PX.4A.4B draft migration", () => {
  it("derives fixed duration from legacy photo-count formula for old drafts", () => {
    const legacy = {
      ...createPhotoVideoComposition(),
      durationMode: undefined as unknown as "fixed",
      durationSeconds: undefined as unknown as number,
      movementMode: undefined as unknown as "auto",
    };
    const c = addPhotos(legacy, [
      createLocalPhoto({ id: "a", previewUrl: "a", naturalWidth: 1, naturalHeight: 1 }),
      createLocalPhoto({ id: "b", previewUrl: "b", naturalWidth: 1, naturalHeight: 1 }),
    ]);
    const migrated = migrateComposition(c, "studio");
    assert.equal(migrated.durationMode, "fixed");
    assert.equal(migrated.durationSeconds, 10);
    assert.equal(migrated.movementMode, "auto");
  });
});
