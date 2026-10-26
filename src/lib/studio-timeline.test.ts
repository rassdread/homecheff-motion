import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";
import {
  applyClipPatch,
  audibleClip,
  authoritativeSubtitleCues,
  buildSrt,
  buildVtt,
  cueAt,
  cuesFromStored,
  cuesToStored,
  defaultTimelineTracks,
  existingSourceIds,
  filmEndMs,
  futureTranslationPlan,
  msFromPixels,
  normalizeLanguageTag,
  presentDialogue,
  presentNarration,
  sameRevision,
  searchLanguages,
  subtitleFilename,
  tracksAreCompatible,
  trimEdge,
  validateCue,
} from "@/lib/studio-timeline";

describe("studio timeline tracks", () => {
  it("creates the five base tracks and leaves subtitles for an explicit language", () => {
    const tracks = defaultTimelineTracks();
    assert.deepEqual(tracks.map((track) => track.type), ["VIDEO", "DIALOGUE", "NARRATION", "MUSIC", "SFX"]);
    assert.equal(tracks.some((track) => track.type === "SUBTITLE"), false);
  });

  it("moves a clip only onto the same track type", () => {
    assert.equal(tracksAreCompatible("MUSIC", "MUSIC"), true);
    assert.equal(tracksAreCompatible("MUSIC", "SFX"), false);
    assert.equal(tracksAreCompatible("SUBTITLE", "DIALOGUE"), false);
  });
});

describe("studio timeline clips", () => {
  const clip = { startMs: 1000, durationMs: 4000, inMs: 0, outMs: null, volume: 100, muted: false, text: "" };

  it("places, trims, and rejects a trim that removes the clip", () => {
    const moved = applyClipPatch(clip, { startMs: 2500 });
    assert.equal(moved.ok && moved.value.startMs, 2500);
    const trimmed = trimEdge(clip, "end", 3000);
    assert.equal(trimmed.ok && trimmed.value.durationMs, 2000);
    const collapsed = trimEdge(clip, "start", 5000);
    assert.equal(collapsed.ok, false);
  });

  it("keeps volume as a whole percent and mute separate from the source", () => {
    const quiet = applyClipPatch(clip, { volume: 25, muted: true });
    assert.equal(quiet.ok && quiet.value.volume, 25);
    assert.equal(quiet.ok && quiet.value.muted, true);
    assert.equal(applyClipPatch(clip, { volume: 101 }).ok, false);
    assert.equal(applyClipPatch(clip, { startMs: -1 }).ok, false);
  });

  it("detects a repeated source and a stale revision", () => {
    assert.equal(existingSourceIds(["scene-1"], "scene-1"), true);
    assert.equal(existingSourceIds(["scene-1"], "scene-2"), false);
    assert.equal(sameRevision(4, 4), true);
    assert.equal(sameRevision(4, 3), false);
  });

  it("converts pixels to integer milliseconds", () => {
    assert.equal(msFromPixels(80, 80), 1000);
    assert.equal(filmEndMs([{ startMs: 0, durationMs: 2000 }, { startMs: 1500, durationMs: 1000 }]), 2500);
  });
});

describe("studio timeline dialogue and narration", () => {
  it("shows prepared dialogue without pretending audio or a speaker exists", () => {
    const view = presentDialogue({ text: " Hello ", audioUrl: null });
    assert.equal(view.preparedText, "Hello");
    assert.equal(view.audioStatus, "not_generated");
    assert.equal(view.speakerStatus, "unassigned");
    assert.equal(presentDialogue({ text: "Hello", audioUrl: "https://cdn.example/voice.mp3" }).audioStatus, "ready");
  });

  it("keeps the film script separate from narration audio", () => {
    assert.equal(presentNarration({ script: "Once", audioUrl: "" }).audioStatus, "not_generated");
    assert.equal(presentNarration({ script: "", audioUrl: "" }).audioStatus, "no_script");
    assert.equal(presentNarration({ script: "Once", audioUrl: "https://cdn.example/narration.mp3" }).audioStatus, "ready");
  });

  it("plays only an unmuted file that has a url", () => {
    assert.equal(audibleClip({ muted: false, trackMuted: false, volume: 80, trackVolume: 100, playbackUrl: "https://cdn.example/a.mp3" }), true);
    assert.equal(audibleClip({ muted: true, trackMuted: false, volume: 80, trackVolume: 100, playbackUrl: "https://cdn.example/a.mp3" }), false);
    assert.equal(audibleClip({ muted: false, trackMuted: false, volume: 80, trackVolume: 100, playbackUrl: null }), false);
  });
});

describe("multilingual subtitles", () => {
  it("keeps regional language tags distinct", () => {
    assert.equal(normalizeLanguageTag("es-mx"), "es-MX");
    assert.equal(normalizeLanguageTag("pt-BR"), "pt-BR");
    assert.equal(normalizeLanguageTag("zh-hans"), "zh-Hans");
    assert.equal(normalizeLanguageTag("nl"), "nl");
    assert.equal(normalizeLanguageTag("not a language"), null);
    assert.equal(normalizeLanguageTag("es-MX") === normalizeLanguageTag("es-ES"), false);
  });

  it("searches the selector without limiting storage to those tags", () => {
    const found = searchLanguages("fran");
    assert.equal(found.some((language) => language.tag === "fr"), true);
    assert.equal(normalizeLanguageTag("sv-SE"), "sv-SE");
  });

  it("validates timing per language and allows different cue counts", () => {
    const dutch = { id: "nl-1", text: "Hallo", startMs: 0, endMs: 1200 };
    const overlap = validateCue({ text: "Nog", startMs: 1000, endMs: 2000 }, 5000, [dutch]);
    assert.equal(overlap.ok, false);
    const spanish = validateCue({ text: "Hola a todos", startMs: 0, endMs: 1800 }, 5000, []);
    assert.equal(spanish.ok, true);
    const late = validateCue({ text: "Later", startMs: 4000, endMs: 6000 }, 5000, []);
    assert.equal(late.ok && late.outsideFilm, true);
    assert.equal(validateCue({ text: "Bad", startMs: -1, endMs: 10 }, null, []).ok, false);
  });

  it("stores integer milliseconds and still writes seconds for the existing reader", () => {
    const stored = cuesToStored([{ text: "Hi", startMs: 1500, endMs: 2500, sceneId: "scene-1" }]);
    assert.equal(stored[0]?.startMs, 1500);
    assert.equal(stored[0]?.start, 1.5);
    const read = cuesFromStored([{ text: "Hi", start: 1.25, end: 2 }]);
    assert.equal(read[0]?.startMs, 1250);
    const preferred = cuesFromStored([{ text: "Hi", start: 1, end: 2, startMs: 1100, endMs: 2100 }]);
    assert.equal(preferred[0]?.startMs, 1100);
  });

  it("reads storyboard cues and ignores a different clip copy", () => {
    const authority = authoritativeSubtitleCues({
      storyboardId: "board-1",
      trackId: "track-1",
      storedEntries: [{ text: "Van het storyboard", startMs: 0, endMs: 1000 }],
      clips: [{ id: "clip-1", text: "Andere tekst", startMs: 0, durationMs: 1000, sourceId: "" }],
    });
    assert.equal(authority.source, "storyboard_track");
    assert.equal(authority.cues[0]?.text, "Van het storyboard");
    const clipsOnly = authoritativeSubtitleCues({
      storyboardId: null,
      trackId: "track-1",
      storedEntries: [{ text: "Niet gebruiken", startMs: 0, endMs: 500 }],
      clips: [{ id: "clip-1", text: "Alleen de clip", startMs: 200, durationMs: 800, sourceId: "scene-1" }],
    });
    assert.equal(clipsOnly.source, "timeline_clips");
    assert.equal(clipsOnly.cues[0]?.text, "Alleen de clip");
    assert.equal(clipsOnly.cues[0]?.endMs, 1000);
  });

  it("exports srt and vtt without calling a provider", () => {
    const cues = [
      { text: "Hello", startMs: 0, endMs: 1000 },
      { text: "Hola", startMs: 1000, endMs: 2200 },
    ];
    const srt = buildSrt([cues[0]!]);
    const vtt = buildVtt([cues[1]!], "es");
    assert.match(srt, /00:00:00,000 --> 00:00:01,000/);
    assert.match(srt, /Hello/);
    assert.match(vtt, /^WEBVTT/);
    assert.match(vtt, /Language: es/);
    assert.match(vtt, /00:00:01.000 --> 00:00:02.200/);
    assert.equal(cueAt(cues, 1100)?.text, "Hola");
    assert.equal(subtitleFilename("Made With Passion", "nl", "srt"), "made-with-passion.nl.srt");
  });

  it("does not run paid translation", () => {
    assert.deepEqual(futureTranslationPlan(), { executes: false, requiresApproval: true, overwritesManualEdits: false });
  });
});

describe("timeline safety", () => {
  it("does not charge, call providers, or seed the protected film", () => {
    const service = readFileSync(join(process.cwd(), "src/server/studio/studio-timeline-service.ts"), "utf8");
    const route = readFileSync(join(process.cwd(), "src/app/api/studio/projects/[projectId]/timeline/route.ts"), "utf8");
    const migration = readFileSync(join(process.cwd(), "prisma/migrations/20261020120000_studio_timeline/migration.sql"), "utf8");
    for (const source of [service, route]) {
      assert.equal(/reserveStudioCredits|elevenlabs|openai|stripe|vidu/i.test(source), false);
      assert.equal(source.includes("cmvcbmxdp00032jryohiw8a84"), false);
      assert.equal(source.includes("referenceImageUrl"), false);
    }
    assert.equal(/DROP TABLE|DELETE FROM/i.test(migration), false);
    assert.match(migration, /CREATE TABLE "StudioTimeline"/);
  });
});
