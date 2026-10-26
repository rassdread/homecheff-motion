import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isOwnedProductionBlobUrl } from "@/lib/studio-film-media";
import { prepareShotContinuity } from "@/lib/studio-scene-continuity";
import { buildSrt, buildVtt } from "@/lib/studio-timeline";
import {
  TIMELINE_GAP_POLICY,
  assembleVisualPieces,
  buildTimelineMixRequest,
  characterMasterBlocked,
} from "@/lib/studio-timeline-render-plan";

describe("timeline render plan", () => {
  it("holds black for a gap and rejects overlapping pictures", () => {
    assert.equal(TIMELINE_GAP_POLICY, "hold_black");
    const pieces = assembleVisualPieces([
      { path: "/a.mp4", kind: "video", startMs: 0, durationMs: 2000, inMs: 400 },
      { path: "/b.mp4", kind: "still", startMs: 2500, durationMs: 1000, inMs: 0 },
    ]);
    assert.equal(pieces.ok, true);
    if (!pieces.ok) return;
    assert.equal(pieces.totalMs, 3500);
    assert.deepEqual(
      pieces.pieces.map((piece) => piece.kind),
      ["video", "black", "still"],
    );
    const first = pieces.pieces[0];
    assert.equal(first?.kind, "video");
    if (first?.kind === "video") assert.equal(first.inMs, 400);
    const overlap = assembleVisualPieces([
      { path: "/a.mp4", kind: "video", startMs: 0, durationMs: 2000, inMs: 0 },
      { path: "/b.mp4", kind: "video", startMs: 1500, durationMs: 1000, inMs: 0 },
    ]);
    assert.deepEqual(overlap, { ok: false, code: "overlap" });
  });

  it("puts music that starts at zero on the music bed and everything else on discrete cues", () => {
    const mix = buildTimelineMixRequest({
      totalMs: 4000,
      clips: [
        { track: "MUSIC", path: "/music.wav", startMs: 0, durationMs: 4000, inMs: 250, volume: 40 },
        { track: "DIALOGUE", path: "/voice.wav", startMs: 500, durationMs: 1500, inMs: 0, volume: 100 },
        { track: "SFX", path: "/hit.wav", startMs: 3000, durationMs: 400, inMs: 20, volume: 80 },
        { track: "MUSIC", path: "/later.wav", startMs: 2000, durationMs: 1000, inMs: 0, volume: 0 },
      ],
    });
    assert.equal("plan" in mix, true);
    if (!("plan" in mix)) return;
    assert.equal(mix.musicPath, "/music.wav");
    assert.equal(mix.plan.musicSourceOffsetSeconds, 0.25);
    assert.equal(mix.plan.musicStartSeconds, 0);
    assert.equal(mix.plan.musicDurationSeconds, 4);
    assert.equal(mix.plan.duckingEnvelopes.length, 1);
    assert.equal(mix.plan.duckingEnvelopes[0]?.musicGain, 0.35);
    assert.deepEqual(
      mix.discretePaths,
      ["/voice.wav", "/hit.wav"],
    );
    assert.equal(mix.discreteTrim[1]?.inMs, 20);
  });

  it("ducks music that starts after zero by keeping it on the music bed", () => {
    const mix = buildTimelineMixRequest({
      totalMs: 8000,
      clips: [
        { track: "MUSIC", path: "/later-music.wav", startMs: 2000, durationMs: 5000, inMs: 100, volume: 50 },
        { track: "DIALOGUE", path: "/voice.wav", startMs: 500, durationMs: 1000, inMs: 0, volume: 100 },
        { track: "NARRATION", path: "/narration.wav", startMs: 3000, durationMs: 1500, inMs: 0, volume: 100 },
        { track: "MUSIC", path: "/second.wav", startMs: 6000, durationMs: 1000, inMs: 0, volume: 40 },
      ],
    });
    assert.equal("plan" in mix, true);
    if (!("plan" in mix)) return;
    assert.equal(mix.musicPath, "/later-music.wav");
    assert.equal(mix.plan.musicStartSeconds, 2);
    assert.equal(mix.plan.musicDurationSeconds, 5);
    assert.equal(mix.plan.musicSourceOffsetSeconds, 0.1);
    assert.equal(mix.plan.duckingEnvelopes.length, 2);
    assert.deepEqual(mix.discretePaths, ["/voice.wav", "/narration.wav", "/second.wav"]);
  });

  it("blocks a character scene whose master was not among the picked references", () => {
    assert.equal(
      characterMasterBlocked({
        assignedCharacters: 1,
        characterReferenceUrls: ["https://cdn.example/master.png"],
        pickedUrls: ["https://cdn.example/location.png"],
      }),
      true,
    );
    assert.equal(
      characterMasterBlocked({
        assignedCharacters: 1,
        characterReferenceUrls: ["https://cdn.example/master.png"],
        pickedUrls: ["https://cdn.example/master.png"],
      }),
      false,
    );
    assert.equal(
      characterMasterBlocked({
        assignedCharacters: 0,
        characterReferenceUrls: [],
        pickedUrls: [],
      }),
      false,
    );
  });

  it("delegates subtitle files to the existing builders and keeps language independent", () => {
    const srt = buildSrt([{ text: "Tuin", startMs: 0, endMs: 1200 }]);
    const vtt = buildVtt([{ text: "Garden", startMs: 400, endMs: 1800 }], "en-GB");
    assert.match(srt, /00:00:00,000 --> 00:00:01,200/);
    assert.match(srt, /Tuin/);
    assert.match(vtt, /^WEBVTT/);
    assert.match(vtt, /Language: en-GB/);
    assert.match(vtt, /00:00:00\.400 --> 00:00:01\.800/);
    assert.doesNotMatch(vtt, /Tuin/);
  });

  it("accepts only an owned production blob for an uploaded film video", () => {
    const owner = "user_123";
    assert.equal(
      isOwnedProductionBlobUrl(owner, `https://store.blob.vercel-storage.com/production/${owner}/clip.mp4`),
      true,
    );
    assert.equal(isOwnedProductionBlobUrl(owner, "https://example.com/production/user_123/clip.mp4"), false);
    assert.equal(
      isOwnedProductionBlobUrl(owner, "https://store.blob.vercel-storage.com/production/someone-else/clip.mp4"),
      false,
    );
  });

  it("prepares continuity without calling a provider", () => {
    const plan = prepareShotContinuity({
      previousVideoPath: "/scene-a.mp4",
      characterMasterUrl: "https://cdn.example/master.png",
      locationReferenceUrl: null,
    });
    assert.equal(plan.providerCall, false);
    assert.equal(plan.previousVideo, true);
    assert.equal(plan.characterMaster, true);
    assert.equal(plan.locationReference, false);
    assert.match(plan.limitation, /start frame/);
  });
});
