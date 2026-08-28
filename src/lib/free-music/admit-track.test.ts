import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { admitTrack, canSelectCatalogTrack, resolveCatalogAudioForRender } from "@/lib/free-music/admit-track";
import { makeCc0Fixture } from "@/lib/free-music/test-fixtures";
import { CC_BY_PHASE_2_DECISION } from "@/lib/free-music/types";
import { isStudioFreeMusicCatalogEnabled, isStudioFreeMusicCatalogEnabledForUser } from "@/lib/free-music/flag";

describe("Free Music Phase 2 admission engine", () => {
  it("approves verified CC0 recording with human review", () => {
    const r = admitTrack(makeCc0Fixture());
    assert.equal(r.decision, "APPROVED");
  });

  it("approves verified PD recording class", () => {
    const r = admitTrack(
      makeCc0Fixture({
        licenseClass: "PD_RECORDING",
        licenseType: "Public Domain Mark 1.0",
        licenseVersion: "1.0",
        licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
      })
    );
    assert.equal(r.decision, "APPROVED");
  });

  it("rejects unknown licence class", () => {
    const r = admitTrack(makeCc0Fixture({ licenseClass: "UNKNOWN", licenseType: "free" }));
    assert.equal(r.decision, "REJECTED");
    assert.ok(r.reasons.includes("LICENCE_NOT_VERIFIED"));
  });

  it("rejects NC", () => {
    const r = admitTrack(makeCc0Fixture({ licenseType: "CC BY-NC 4.0", licenseClass: "CC0" }));
    assert.equal(r.decision, "REJECTED");
    assert.ok(r.reasons.includes("NC_FORBIDDEN"));
  });

  it("rejects ND", () => {
    const r = admitTrack(makeCc0Fixture({ licenseType: "CC BY-ND 4.0" }));
    assert.equal(r.decision, "REJECTED");
    assert.ok(r.reasons.includes("ND_FORBIDDEN"));
  });

  it("fails missing recording rights", () => {
    const r = admitTrack(makeCc0Fixture({ recordingRightsStatus: "UNKNOWN" }));
    assert.equal(r.decision, "REJECTED");
    assert.ok(r.reasons.includes("RECORDING_RIGHTS_NOT_VERIFIED"));
  });

  it("fails public-domain composition with unknown recording", () => {
    const r = admitTrack(
      makeCc0Fixture({
        compositionRightsStatus: "VERIFIED",
        recordingRightsStatus: "UNKNOWN",
      })
    );
    assert.equal(r.decision, "REJECTED");
    assert.ok(r.reasons.includes("PD_COMPOSITION_UNKNOWN_RECORDING"));
  });

  it("fails missing sync rights", () => {
    const r = admitTrack(makeCc0Fixture({ syncAllowed: false }));
    assert.equal(r.decision, "REJECTED");
  });

  it("fails missing hosting rights", () => {
    const r = admitTrack(makeCc0Fixture({ homecheffHostingAllowed: null }));
    assert.equal(r.decision, "REJECTED");
  });

  it("fails missing catalog distribution rights", () => {
    const r = admitTrack(makeCc0Fixture({ studioCatalogDistributionAllowed: false }));
    assert.equal(r.decision, "REJECTED");
  });

  it("fails missing evidence", () => {
    const r = admitTrack(
      makeCc0Fixture({
        licenseTextSnapshot: null,
        licenseEvidenceStorageKey: null,
        licenseEvidenceUrl: null,
      })
    );
    assert.equal(r.decision, "REJECTED");
    assert.ok(r.reasons.includes("EVIDENCE_SNAPSHOT_MISSING"));
  });

  it("fails missing hash", () => {
    const r = admitTrack(makeCc0Fixture({ sourceFileHash: null, storedMasterHash: null }));
    assert.equal(r.decision, "REJECTED");
  });

  it("fails HIGH Content ID risk", () => {
    const r = admitTrack(makeCc0Fixture({ contentIdRisk: "HIGH" }));
    assert.equal(r.decision, "REJECTED");
  });

  it("REJECTED never becomes selectable ACTIVE", () => {
    const track = makeCc0Fixture({ rightsReviewStatus: "REJECTED", catalogStatus: "ACTIVE" });
    assert.equal(canSelectCatalogTrack(track), false);
  });

  it("SUSPENDED cannot be newly selected", () => {
    assert.equal(canSelectCatalogTrack(makeCc0Fixture({ catalogStatus: "SUSPENDED" })), false);
  });

  it("RETIRED cannot be newly selected", () => {
    assert.equal(canSelectCatalogTrack(makeCc0Fixture({ catalogStatus: "RETIRED" })), false);
  });

  it("defers CC BY in Phase 2", () => {
    assert.equal(CC_BY_PHASE_2_DECISION, "DEFER");
    const r = admitTrack(makeCc0Fixture({ licenseClass: "CC_BY", licenseType: "CC BY 4.0", attributionRequired: true }));
    assert.equal(r.decision, "REJECTED");
    assert.ok(r.reasons.includes("CC_BY_DEFERRED_PHASE_2"));
  });
});

describe("Free Music Phase 2 security resolve", () => {
  it("rejects client spoofed catalog audio URL", () => {
    const track = makeCc0Fixture();
    const r = resolveCatalogAudioForRender({
      catalogTrackId: track.trackId,
      clientAudioUrl: "https://evil.example/a.mp3",
      registry: [track],
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, "CLIENT_AUDIO_URL_FORBIDDEN_FOR_CATALOG");
  });

  it("resolves catalogTrackId server-side", () => {
    const track = makeCc0Fixture();
    const r = resolveCatalogAudioForRender({
      catalogTrackId: track.trackId,
      clientAudioUrl: null,
      registry: [track],
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.masterStorageKey, track.masterStorageKey);
  });

  it("rejects inactive track", () => {
    const track = makeCc0Fixture({ catalogStatus: "DRAFT" });
    const r = resolveCatalogAudioForRender({
      catalogTrackId: track.trackId,
      registry: [track],
    });
    assert.equal(r.ok, false);
  });
});

describe("Free Music kill switch", () => {
  it("defaults OFF", () => {
    const prev = process.env.STUDIO_FREE_MUSIC_CATALOG_ENABLED;
    delete process.env.STUDIO_FREE_MUSIC_CATALOG_ENABLED;
    assert.equal(isStudioFreeMusicCatalogEnabled(), false);
    assert.equal(isStudioFreeMusicCatalogEnabledForUser("u1"), false);
    if (prev == null) delete process.env.STUDIO_FREE_MUSIC_CATALOG_ENABLED;
    else process.env.STUDIO_FREE_MUSIC_CATALOG_ENABLED = prev;
  });

  it("respects pilot allowlist when enabled", () => {
    const prevE = process.env.STUDIO_FREE_MUSIC_CATALOG_ENABLED;
    const prevPe = process.env.STUDIO_FREE_MUSIC_PILOT_ENABLED;
    const prevP = process.env.STUDIO_FREE_MUSIC_PILOT_USER_IDS;
    delete process.env.STUDIO_FREE_MUSIC_CATALOG_ENABLED;
    process.env.STUDIO_FREE_MUSIC_PILOT_ENABLED = "true";
    process.env.STUDIO_FREE_MUSIC_PILOT_USER_IDS = "pilot-a,pilot-b";
    assert.equal(isStudioFreeMusicCatalogEnabledForUser("pilot-a"), true);
    assert.equal(isStudioFreeMusicCatalogEnabledForUser("other"), false);
    process.env.STUDIO_FREE_MUSIC_CATALOG_ENABLED = prevE;
    process.env.STUDIO_FREE_MUSIC_PILOT_ENABLED = prevPe;
    process.env.STUDIO_FREE_MUSIC_PILOT_USER_IDS = prevP;
  });
});
