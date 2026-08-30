import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadFreeMusicRegistry, listPublicFreeMusicCatalog, toPublicCatalogTrack } from "@/lib/free-music/registry";
import { admitTrack, canSelectCatalogTrack, resolveCatalogAudioForRender } from "@/lib/free-music/admit-track";
import {
  isStudioFreeMusicCatalogEnabled,
  isStudioFreeMusicCatalogEnabledForUser,
  isStudioFreeMusicPilotEnabled,
} from "@/lib/free-music/flag";
import { makeCc0Fixture } from "@/lib/free-music/test-fixtures";
import { PILOT_TRACK_IDS, reconcileFreeMusicCatalog } from "@/lib/free-music/reconcile";
import { toDraftCompositionMeta } from "@/lib/photo-video/draft-storage";
import { createPhotoVideoComposition, setAudio } from "@/lib/photo-video/composition";
import { ownMusicExportWindow } from "@/lib/photo-video/export-audio";

describe("Free Music Phase 3 registry baseline", () => {
  it("has 55 approved CC0 tracks", () => {
    const tracks = loadFreeMusicRegistry(true);
    assert.equal(tracks.length, 55);
    assert.equal(tracks.filter((t) => t.rightsReviewStatus === "APPROVED").length, 55);
    assert.equal(tracks.filter((t) => t.licenseClass === "CC0").length, 55);
    assert.equal(tracks.filter((t) => t.contentIdRisk === "UNKNOWN").length, 55);
  });

  it("activates all 55 approved tracks after Phase 3R expansion", () => {
    const tracks = loadFreeMusicRegistry(true);
    const active = tracks.filter((t) => t.catalogStatus === "ACTIVE");
    assert.equal(active.length, 55);
    for (const id of PILOT_TRACK_IDS) {
      const t = tracks.find((x) => x.trackId === id);
      assert.ok(t, id);
      assert.equal(t!.catalogStatus, "ACTIVE");
      assert.equal(canSelectCatalogTrack(t!), true);
    }
    assert.equal(tracks.filter((t) => t.catalogStatus === "DRAFT").length, 0);
    assert.equal(tracks.filter((t) => canSelectCatalogTrack(t)).length, 55);
  });

  it("public catalog API fields exclude secrets", () => {
    const track = loadFreeMusicRegistry(true)[0]!;
    const pub = toPublicCatalogTrack(track);
    assert.ok(pub.previewUrl?.includes("/api/studio/free-music/asset/"));
    assert.equal("masterStorageKey" in pub, false);
    assert.equal("licenseEvidenceStorageKey" in pub, false);
    assert.equal("reviewedBy" in pub, false);
    assert.equal(pub.contentIdNotice, null);
    assert.equal(pub.contentIdNoticeKey, "unknown");
  });
});

describe("Free Music Phase 3 pilot gating", () => {
  it("defaults public and pilot OFF", () => {
    const prevC = process.env.STUDIO_FREE_MUSIC_CATALOG_ENABLED;
    const prevP = process.env.STUDIO_FREE_MUSIC_PILOT_ENABLED;
    const prevU = process.env.STUDIO_FREE_MUSIC_PILOT_USER_IDS;
    delete process.env.STUDIO_FREE_MUSIC_CATALOG_ENABLED;
    delete process.env.STUDIO_FREE_MUSIC_PILOT_ENABLED;
    delete process.env.STUDIO_FREE_MUSIC_PILOT_USER_IDS;
    assert.equal(isStudioFreeMusicCatalogEnabled(), false);
    assert.equal(isStudioFreeMusicPilotEnabled(), false);
    assert.equal(isStudioFreeMusicCatalogEnabledForUser("pilot-user"), false);
    assert.equal(listPublicFreeMusicCatalog("pilot-user").length, 0);
    process.env.STUDIO_FREE_MUSIC_CATALOG_ENABLED = prevC;
    process.env.STUDIO_FREE_MUSIC_PILOT_ENABLED = prevP;
    process.env.STUDIO_FREE_MUSIC_PILOT_USER_IDS = prevU;
  });

  it("pilot allowlist exposes only ACTIVE selectable tracks", () => {
    const prevC = process.env.STUDIO_FREE_MUSIC_CATALOG_ENABLED;
    const prevP = process.env.STUDIO_FREE_MUSIC_PILOT_ENABLED;
    const prevU = process.env.STUDIO_FREE_MUSIC_PILOT_USER_IDS;
    delete process.env.STUDIO_FREE_MUSIC_CATALOG_ENABLED;
    process.env.STUDIO_FREE_MUSIC_PILOT_ENABLED = "true";
    process.env.STUDIO_FREE_MUSIC_PILOT_USER_IDS = "cert-pilot-user";
    const list = listPublicFreeMusicCatalog("cert-pilot-user");
    assert.equal(list.length, 55);
    assert.equal(listPublicFreeMusicCatalog("other-user").length, 0);
    process.env.STUDIO_FREE_MUSIC_CATALOG_ENABLED = prevC;
    process.env.STUDIO_FREE_MUSIC_PILOT_ENABLED = prevP;
    process.env.STUDIO_FREE_MUSIC_PILOT_USER_IDS = prevU;
  });
});

describe("Free Music Phase 3 persistence + export window", () => {
  it("persists catalogTrackId without objectUrl in draft meta", () => {
    const comp = setAudio(
      createPhotoVideoComposition(undefined, "studio"),
      {
        kind: "catalog",
        trackId: "fm_oga_adventure_time",
        startSeconds: 5,
        durationSeconds: 30,
        trackDurationSeconds: 86,
        volume: 0.5,
        title: "Adventure Time",
        artist: "Scribe",
      },
      "studio"
    );
    const meta = toDraftCompositionMeta(comp);
    assert.equal(meta.audio.kind, "catalog");
    if (meta.audio.kind === "catalog") {
      assert.equal(meta.audio.trackId, "fm_oga_adventure_time");
      assert.equal("objectUrl" in meta.audio, false);
    }
  });

  it("catalog export window does not loop past track end", () => {
    const window = ownMusicExportWindow(
      {
        kind: "catalog",
        trackId: "fm_oga_cave_explorer",
        startSeconds: 10,
        durationSeconds: 60,
        trackDurationSeconds: 73,
        volume: 0.8,
      },
      60
    );
    assert.ok(window);
    assert.equal(window!.loops, false);
    assert.equal(window!.startSeconds, 10);
    assert.equal(window!.durationSeconds, 60);
  });
});

describe("Free Music Phase 3 suspension + security", () => {
  it("blocks SUSPENDED and RETIRED from render resolution", () => {
    const suspended = makeCc0Fixture({ catalogStatus: "SUSPENDED" });
    const retired = makeCc0Fixture({ catalogStatus: "RETIRED" });
    assert.equal(
      resolveCatalogAudioForRender({ catalogTrackId: suspended.trackId, registry: [suspended] }).ok,
      false
    );
    assert.equal(
      resolveCatalogAudioForRender({ catalogTrackId: retired.trackId, registry: [retired] }).ok,
      false
    );
  });

  it("reconciler reports registry shape", () => {
    const r = reconcileFreeMusicCatalog();
    assert.equal(r.totalRightsApproved, 55);
    assert.equal(r.pilotTracksSelected, 55);
    assert.equal(r.cc0, 55);
    assert.equal(r.contentIdUnknown, 55);
  });
});
