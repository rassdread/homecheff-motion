import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  classifyUserAgent,
  summarizeFreeMusicEvents,
  trackFreeMusicEvent,
  listFreeMusicEvents,
  type FreeMusicAnalyticsEvent,
} from "@/lib/free-music/analytics";
import { loadFreeMusicRegistry, listPublicFreeMusicCatalog, toPublicCatalogTrack } from "@/lib/free-music/registry";
import {
  isStudioFreeMusicCatalogEnabled,
  isStudioFreeMusicCatalogEnabledForUser,
  isStudioFreeMusicPilotEnabled,
} from "@/lib/free-music/flag";
import { en } from "@/i18n/locales/en";
import { nl } from "@/i18n/locales/nl";

describe("Free Music Phase 4 analytics", () => {
  it("classifies user agents", () => {
    assert.equal(classifyUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)"), "iphone");
    assert.equal(classifyUserAgent("Mozilla/5.0 (Macintosh) AppleWebKit Safari/605"), "safari");
    assert.equal(classifyUserAgent("Mozilla/5.0 Chrome/120"), "chromium");
  });

  it("stores structured events without media payloads", () => {
    const mem: Record<string, string> = {};
    (globalThis as { localStorage?: Storage }).localStorage = {
      getItem: (k) => mem[k] ?? null,
      setItem: (k, v) => {
        mem[k] = String(v);
      },
      removeItem: (k) => {
        delete mem[k];
      },
      clear: () => {
        for (const k of Object.keys(mem)) delete mem[k];
      },
      key: () => null,
      length: 0,
    };
    trackFreeMusicEvent("free_music_catalog_opened");
    trackFreeMusicEvent("free_music_catalog_loaded", { trackCount: 55 });
    trackFreeMusicEvent("free_music_catalog_failed", { reason: "fetch" });
    trackFreeMusicEvent("free_music_preview_started", { trackId: "fm_oga_adventure_time" });
    trackFreeMusicEvent("free_music_preview_failed", { trackId: "fm_oga_adventure_time", reason: "play" });
    trackFreeMusicEvent("free_music_track_selected", { trackId: "fm_oga_adventure_time" });
    trackFreeMusicEvent("free_music_export_started", { trackId: "fm_oga_adventure_time" });
    trackFreeMusicEvent("free_music_export_completed", { trackId: "fm_oga_adventure_time" });
    trackFreeMusicEvent("free_music_export_failed", { trackId: "fm_oga_adventure_time", reason: "encode" });
    const events = listFreeMusicEvents();
    assert.ok(events.length >= 9);
    assert.ok(events.every((e) => !("blob" in e) && !("objectUrl" in e)));
    const summary = summarizeFreeMusicEvents(events);
    assert.equal(summary.catalogOpened >= 1, true);
    assert.equal(summary.catalogLoaded >= 1, true);
    assert.equal(summary.previewStarted >= 1, true);
    assert.equal(summary.trackSelected >= 1, true);
    assert.equal(summary.exportCompleted >= 1, true);
    assert.equal(summary.topSelected[0]?.trackId, "fm_oga_adventure_time");
  });

  it("summarize handles empty export rates", () => {
    const empty: FreeMusicAnalyticsEvent[] = [];
    const s = summarizeFreeMusicEvents(empty);
    assert.equal(s.previewFailureRate, null);
    assert.equal(s.exportFailureRate, null);
  });
});

describe("Free Music Phase 4 i18n + catalog", () => {
  it("contentId notices have NL/EN parity keys", () => {
    assert.ok(en["px4a.freeMusic.contentIdNotice.unknown"]);
    assert.ok(en["px4a.freeMusic.contentIdNotice.known"]);
    assert.ok(nl["px4a.freeMusic.contentIdNotice.unknown"]);
    assert.ok(nl["px4a.freeMusic.contentIdNotice.known"]);
    assert.notEqual(
      en["px4a.freeMusic.contentIdNotice.unknown"],
      nl["px4a.freeMusic.contentIdNotice.unknown"]
    );
  });

  it("public track uses notice key not hardcoded English body", () => {
    const pub = toPublicCatalogTrack(loadFreeMusicRegistry(true)[0]!);
    assert.equal(pub.contentIdNotice, null);
    assert.equal(pub.contentIdNoticeKey, "unknown");
  });

  it("defaults remain OFF; pilot/public gating intact", () => {
    const prevC = process.env.STUDIO_FREE_MUSIC_CATALOG_ENABLED;
    const prevP = process.env.STUDIO_FREE_MUSIC_PILOT_ENABLED;
    const prevU = process.env.STUDIO_FREE_MUSIC_PILOT_USER_IDS;
    delete process.env.STUDIO_FREE_MUSIC_CATALOG_ENABLED;
    delete process.env.STUDIO_FREE_MUSIC_PILOT_ENABLED;
    delete process.env.STUDIO_FREE_MUSIC_PILOT_USER_IDS;
    assert.equal(isStudioFreeMusicCatalogEnabled(), false);
    assert.equal(isStudioFreeMusicPilotEnabled(), false);
    assert.equal(listPublicFreeMusicCatalog("anyone").length, 0);

    process.env.STUDIO_FREE_MUSIC_PILOT_ENABLED = "true";
    process.env.STUDIO_FREE_MUSIC_PILOT_USER_IDS = "pilot-a";
    assert.equal(isStudioFreeMusicCatalogEnabledForUser("pilot-a"), true);
    assert.equal(listPublicFreeMusicCatalog("pilot-a").length, 55);
    assert.equal(isStudioFreeMusicCatalogEnabledForUser("other"), false);

    delete process.env.STUDIO_FREE_MUSIC_PILOT_ENABLED;
    delete process.env.STUDIO_FREE_MUSIC_PILOT_USER_IDS;
    process.env.STUDIO_FREE_MUSIC_CATALOG_ENABLED = "true";
    assert.equal(isStudioFreeMusicCatalogEnabledForUser("any-user"), true);
    assert.equal(listPublicFreeMusicCatalog("any-user").length, 55);

    if (prevC == null) delete process.env.STUDIO_FREE_MUSIC_CATALOG_ENABLED;
    else process.env.STUDIO_FREE_MUSIC_CATALOG_ENABLED = prevC;
    if (prevP == null) delete process.env.STUDIO_FREE_MUSIC_PILOT_ENABLED;
    else process.env.STUDIO_FREE_MUSIC_PILOT_ENABLED = prevP;
    if (prevU == null) delete process.env.STUDIO_FREE_MUSIC_PILOT_USER_IDS;
    else process.env.STUDIO_FREE_MUSIC_PILOT_USER_IDS = prevU;
  });

  it("55 ACTIVE tracks remain selectable under public ON", () => {
    const tracks = loadFreeMusicRegistry(true);
    assert.equal(tracks.length, 55);
    assert.equal(tracks.filter((t) => t.catalogStatus === "ACTIVE").length, 55);
  });
});

describe("Free Music Phase 4 billing safety (static)", () => {
  it("catalog/preview/select paths do not import provider or credit modules", () => {
    const browser = readFileSync(
      join(process.cwd(), "src/components/photo-video/photo-video-free-music-browser.tsx"),
      "utf8"
    );
    const analytics = readFileSync(join(process.cwd(), "src/lib/free-music/analytics.ts"), "utf8");
    const catalogRoute = readFileSync(
      join(process.cwd(), "src/app/api/studio/free-music/catalog/route.ts"),
      "utf8"
    );
    for (const src of [browser, analytics, catalogRoute]) {
      assert.ok(!/vidu|openai|reserveCredits|creditReservation/i.test(src));
    }
  });
});
