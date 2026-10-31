import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canReplaceSubtitleTrack,
  narrationClipCarriesProjectAudio,
  narrationPlayheadInsideClip,
  ownedNarrationAudioUrl,
  ownedVoiceStorageKey,
  spokenNarrationSubtitle,
} from "@/lib/studio-narration-playback";

const owner = "cmoez6kkh0000lb04f9emsa5f";
const storyboard = "cmvuzo5pj0001kx088urirgsw";
const storageKey = `studio/${owner}/storyboards/${storyboard}/voice/nl/cmvvdf98f0003jk08pdcnfdyf.mp3`;
const audioUrl = `https://store.public.blob.vercel-storage.com/${storageKey}`;

describe("film narration playback", () => {
  it("resolves the stored project narration file and rejects another owner's file", () => {
    assert.equal(ownedVoiceStorageKey(owner, storyboard, storageKey), true);
    assert.equal(ownedNarrationAudioUrl({ ownerId: owner, storyboardId: storyboard, storageKey, audioUrl }), audioUrl);
    assert.equal(ownedNarrationAudioUrl({
      ownerId: "someone-else",
      storyboardId: storyboard,
      storageKey,
      audioUrl,
    }), null);
    assert.equal(ownedNarrationAudioUrl({
      ownerId: owner,
      storyboardId: storyboard,
      storageKey,
      audioUrl: "https://example.com/other.mp3",
    }), null);
  });

  it("attaches playback only to the existing project narration clip", () => {
    assert.equal(narrationClipCarriesProjectAudio({
      trackType: "NARRATION",
      sourceKind: "narration_script",
      sourceId: storyboard,
      storyboardId: storyboard,
    }), true);
    assert.equal(narrationClipCarriesProjectAudio({
      trackType: "DIALOGUE",
      sourceKind: "narration_script",
      sourceId: storyboard,
      storyboardId: storyboard,
    }), false);
    assert.equal(narrationClipCarriesProjectAudio({
      trackType: "NARRATION",
      sourceKind: "library_asset",
      sourceId: "cmvvdf98f0003jk08pdcnfdyf",
      storyboardId: storyboard,
    }), false);
  });

  it("keeps narration running across a video cut and restores the original window", () => {
    const durationMs = 2461;
    assert.equal(narrationPlayheadInsideClip(4000, durationMs, 4500), true);
    assert.equal(narrationPlayheadInsideClip(4000, durationMs, 5200), true);
    assert.equal(narrationPlayheadInsideClip(4000, durationMs, 6400), true);
    assert.equal(narrationPlayheadInsideClip(4000, durationMs, 6461), false);
    assert.equal(narrationPlayheadInsideClip(0, durationMs, 1000), true);
    assert.equal(narrationPlayheadInsideClip(0, durationMs, 2461), false);
  });

  it("writes the spoken sentence and leaves a different dialogue draft untouched", () => {
    const spoken = spokenNarrationSubtitle("Achter ieder product schuilt een verhaal.", 2.461);
    assert.deepEqual(spoken, [{ start: 0, end: 2.461, text: "Achter ieder product schuilt een verhaal." }]);
    assert.equal(canReplaceSubtitleTrack(["Met liefde gemaakt, voor mensen uit de buurt."], spoken.map((entry) => entry.text)), false);
    assert.equal(canReplaceSubtitleTrack(["Achter ieder product schuilt een verhaal."], spoken.map((entry) => entry.text)), true);
    assert.equal(canReplaceSubtitleTrack([], spoken.map((entry) => entry.text)), true);
    assert.deepEqual(spokenNarrationSubtitle("", 2.461), []);
  });
});
