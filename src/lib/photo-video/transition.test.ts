import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addPhotos,
  addTextForPhoto,
  compositionDuration,
  createLocalPhoto,
  createPhotoVideoComposition,
  migrateComposition,
  setAudio,
  setBoundaryTransition,
  setDurationSeconds,
  setMovementMode,
  setTransitionKind,
} from "@/lib/photo-video/composition";
import { PHOTO_VIDEO_DEFAULT_VOLUME } from "@/lib/photo-video/audio";
import { playheadAt } from "@/lib/photo-video/timeline";
import {
  autoTransitionAtIndex,
  mapLegacyStyleToTransition,
  overlapSecondsForTransition,
  PHOTO_VIDEO_SIGNATURE_TRANSITIONS,
  PHOTO_VIDEO_STANDARD_TRANSITIONS,
  PHOTO_VIDEO_TRANSITION_KINDS,
  resolveTransitionKind,
  type PhotoVideoTransitionKind,
} from "@/lib/photo-video/transition-kind";

function photos(count: number) {
  return Array.from({ length: count }, (_, i) =>
    createLocalPhoto({
      id: `p${i}`,
      previewUrl: `blob:t/${i}`,
      naturalWidth: 800,
      naturalHeight: 1200,
    })
  );
}

function fixed(count: number, seconds: number, context: "studio" | "homecheff-item" = "studio") {
  return setDurationSeconds(
    addPhotos(createPhotoVideoComposition(undefined, context), photos(count), context),
    seconds,
    context
  );
}

describe("PX.4A.6.4 transition model", () => {
  it("maps legacy style drafts without breaking stored style", () => {
    assert.equal(mapLegacyStyleToTransition("auto"), "auto");
    assert.equal(mapLegacyStyleToTransition("smooth"), "fade");
    assert.equal(mapLegacyStyleToTransition("calm"), "fade");
    assert.equal(mapLegacyStyleToTransition("energetic"), "slide");
    const energetic = migrateComposition(
      { ...createPhotoVideoComposition(), style: "energetic", transitionKind: undefined },
      "studio"
    );
    assert.equal(energetic.style, "energetic");
    assert.equal(energetic.transitionKind, "slide");
    assert.equal(resolveTransitionKind(undefined, "smooth"), "fade");
    assert.equal(resolveTransitionKind("hc_shards", "energetic"), "hc_shards");
  });

  it("selects Automatisch transitions deterministically", () => {
    assert.deepEqual(
      [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => autoTransitionAtIndex(i)),
      ["fade", "slide", "hc_shards", "wipe", "zoom_blend", "hc_tiles", "slide", "fade", "hc_orbit"]
    );
    for (let i = 0; i < 21; i += 1) {
      const kind = autoTransitionAtIndex(i);
      if (i % 3 === 2) {
        assert.ok(PHOTO_VIDEO_SIGNATURE_TRANSITIONS.includes(kind as (typeof PHOTO_VIDEO_SIGNATURE_TRANSITIONS)[number]));
      } else {
        assert.ok(PHOTO_VIDEO_STANDARD_TRANSITIONS.includes(kind as (typeof PHOTO_VIDEO_STANDARD_TRANSITIONS)[number]));
      }
    }
    const c = setTransitionKind(fixed(6, 15), "auto");
    const first = playheadAt(c, playheadAt(c, 0).from!.holdSeconds - 0.05);
    const again = playheadAt(c, first.timeSeconds);
    assert.equal(first.transition, "fade");
    assert.equal(again.transition, first.transition);
    assert.equal(first.transition, autoTransitionAtIndex(0));
  });

  it("keeps fixed total duration independent of transition kind", () => {
    const cases: Array<{ count: number; seconds: number; context: "studio" | "homecheff-item" }> = [
      { count: 2, seconds: 15, context: "homecheff-item" },
      { count: 4, seconds: 15, context: "homecheff-item" },
      { count: 12, seconds: 15, context: "homecheff-item" },
      { count: 4, seconds: 30, context: "homecheff-item" },
      { count: 12, seconds: 30, context: "homecheff-item" },
      { count: 4, seconds: 45, context: "studio" },
      { count: 4, seconds: 60, context: "studio" },
    ];
    for (const row of cases) {
      const base = fixed(row.count, row.seconds, row.context);
      const kinds: PhotoVideoTransitionKind[] = [...PHOTO_VIDEO_TRANSITION_KINDS];
      for (const kind of kinds) {
        const next = setTransitionKind(base, kind, row.context);
        assert.equal(compositionDuration(next, row.context).totalSeconds, row.seconds, `${row.count}/${row.seconds}/${kind}`);
        assert.equal(next.durationSeconds, row.seconds);
      }
    }
  });

  it("bounds overlap and still forms a usable 12-photo 15s timeline", () => {
    const c = setTransitionKind(fixed(12, 15, "homecheff-item"), "hc_shards", "homecheff-item");
    const duration = compositionDuration(c, "homecheff-item");
    assert.equal(duration.totalSeconds, 15);
    assert.ok(duration.holdSeconds > duration.overlapSeconds);
    assert.ok(duration.overlapSeconds <= overlapSecondsForTransition("hc_shards"));
    const head = playheadAt(c, duration.holdSeconds - 0.02, "homecheff-item");
    assert.ok(head.mix >= 0);
    assert.ok(head.mix <= 1);
  });

  it("cut has zero overlap mix while fade overlaps", () => {
    const fade = setTransitionKind(fixed(2, 15), "fade");
    const cut = setTransitionKind(fixed(2, 15), "cut");
    const fadeHold = compositionDuration(fade).holdSeconds;
    assert.ok(playheadAt(fade, fadeHold - 0.1).mix > 0);
    assert.equal(playheadAt(cut, fadeHold - 0.1).mix, 0);
    assert.equal(playheadAt(cut, fadeHold - 0.1).to, null);
  });

  it("text, movement, music, and ratio stay composition fields beside transitionKind", () => {
    let c = setMovementMode(setTransitionKind(fixed(4, 15), "hc_orbit"), "none");
    c = addTextForPhoto(c, { id: "t0", photoId: "p0", text: "Hallo" });
    c = setAudio(c, {
      kind: "ownMusic",
      startSeconds: 0,
      durationSeconds: 15,
      trackDurationSeconds: 20,
      volume: PHOTO_VIDEO_DEFAULT_VOLUME,
      objectUrl: "blob:audio",
    });
    c.ratio = "1:1";
    assert.equal(c.transitionKind, "hc_orbit");
    assert.equal(c.overlays[0]?.text, "Hallo");
    assert.equal(c.movementMode, "none");
    assert.equal(c.audio.kind, "ownMusic");
    assert.equal(c.ratio, "1:1");
    assert.equal(compositionDuration(c).totalSeconds, 15);
    assert.ok(PHOTO_VIDEO_STANDARD_TRANSITIONS.includes("wipe"));
    assert.ok(PHOTO_VIDEO_SIGNATURE_TRANSITIONS.includes("hc_ripple"));
    assert.ok(PHOTO_VIDEO_SIGNATURE_TRANSITIONS.includes("hc_split"));
    assert.ok(PHOTO_VIDEO_SIGNATURE_TRANSITIONS.includes("hc_strips"));
    assert.ok(PHOTO_VIDEO_SIGNATURE_TRANSITIONS.includes("hc_lens"));
  });

  it("honors a future per-boundary override without changing total duration", () => {
    const base = setTransitionKind(fixed(4, 15), "fade");
    const overridden = setBoundaryTransition(base, 0, "hc_shards");
    assert.equal(compositionDuration(overridden).totalSeconds, 15);
    const head = playheadAt(overridden, compositionDuration(overridden).holdSeconds - 0.05);
    assert.equal(head.transition, "hc_shards");
    assert.equal(playheadAt(base, compositionDuration(base).holdSeconds - 0.05).transition, "fade");
  });
});
