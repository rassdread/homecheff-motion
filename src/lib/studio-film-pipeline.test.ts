import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyVoiceAccent } from "@/lib/studio-voice-accent-model";
import {
  acceptVerifiedSfxCues,
  assessFilmVoiceRole,
  bindOwnedCharacters,
  buildDutchSubtitleTrack,
  composeCharacterScene,
  embedFilmProjectInHandoff,
  filmReservationDecision,
  parseStudioFilmProject,
  planAdaptiveText,
  planFilmAudio,
  quoteFilmProduction,
  renderSrt,
  type FilmScenePlan,
} from "@/lib/studio-film-pipeline";

function scene(partial: Partial<FilmScenePlan> & Pick<FilmScenePlan, "id">): FilmScenePlan {
  const shots =
    partial.shots ??
    composeCharacterScene({
      sceneId: partial.id,
      characterId: partial.characterId ?? "char_cupcake_baker",
      durationSeconds: partial.durationSeconds ?? 10,
      dialogueStartSeconds: 2,
      dialogueDurationSeconds: 4,
    });
  return {
    order: 0,
    characterId: "char_cupcake_baker",
    voiceRole: "american_female",
    englishDialogue: "I love baking cupcakes.",
    dutchSubtitle: "Ik ben dol op cupcakes bakken.",
    musicTrackId: "fm_oga_build",
    durationSeconds: 10,
    shots,
    ...partial,
  };
}

describe("studio film pipeline", () => {
  it("keeps another owner's character out of the film", () => {
    const bound = bindOwnedCharacters(
      { id: "user-a", role: "user" },
      [
        { id: "mine", ownerId: "user-a" },
        { id: "theirs", ownerId: "user-b" },
      ]
    );
    assert.deepEqual(bound.allowedIds, ["mine"]);
    assert.deepEqual(bound.deniedIds, ["theirs"]);
  });

  it("composes Vidu action around a SadTalker close-up", () => {
    const shots = composeCharacterScene({
      sceneId: "baker",
      characterId: "char_cupcake_baker",
      durationSeconds: 10,
      dialogueStartSeconds: 2,
      dialogueDurationSeconds: 4,
    });
    assert.deepEqual(
      shots.map((shot) => shot.role),
      ["action", "speaking_closeup", "return_to_action"]
    );
    assert.equal(shots[0]?.provider, "vidu_reference");
    assert.equal(shots[1]?.provider, "replicate_sadtalker");
    assert.equal(shots[1]?.lipsyncsActionFootage, false);
    assert.equal(shots[2]?.provider, "vidu_reference");
    assert.equal(shots[1]?.characterId, shots[0]?.characterId);
  });

  it("plans per-scene music, crossfades and ducking without generating audio", () => {
    const scenes = [
      scene({ id: "baker", order: 0, musicTrackId: "fm_oga_build" }),
      scene({
        id: "potter",
        order: 1,
        characterId: "char_potter",
        voiceRole: "argentine_english_male",
        musicTrackId: "fm_oga_funked_up",
      }),
    ];
    const audio = planFilmAudio(scenes);
    assert.deepEqual(audio.tracks, ["dialogue", "narrator", "music", "sfx"]);
    assert.equal(audio.musicCrossfades.length, 1);
    assert.equal(audio.musicCrossfades[0]?.seconds, 0.4);
    assert.equal(audio.ducking.length, 2);
    assert.equal(audio.ducking[0]?.musicGain, 0.35);
    assert.equal(audio.loudness.voiceLufs, -16);
  });

  it("accepts only manually verified SFX cues", () => {
    const result = acceptVerifiedSfxCues([
      { id: "mix", sceneId: "baker", label: "Mixing batter", startSeconds: 1.2, durationSeconds: 0.8, verified: true },
      { sceneId: "baker", label: "Invented wheel", startSeconds: 3, durationSeconds: 1, verified: false },
    ]);
    assert.equal(result.accepted.length, 1);
    assert.equal(result.accepted[0]?.startSeconds, 1.2);
    assert.deepEqual(result.rejected, ["Invented wheel"]);
  });

  it("times Dutch subtitles to the speaking shot and exports SRT", () => {
    const track = buildDutchSubtitleTrack([
      scene({ id: "baker", englishDialogue: "I love baking cupcakes.", dutchSubtitle: "Ik ben dol op cupcakes bakken." }),
    ]);
    assert.equal(track.errors.length, 0);
    assert.equal(track.cues[0]?.startSeconds, 2);
    assert.equal(track.cues[0]?.endSeconds, 6);
    const srt = renderSrt(track.cues);
    assert.match(srt, /Ik ben dol op cupcakes bakken/);
    assert.equal(srt.includes("I love baking cupcakes"), false);
  });

  it("keeps a user text override and lifts subtitles off a low subject", () => {
    const automatic = planAdaptiveText({ backgroundLuma: 0.2, subjectBottom: 1100 });
    assert.equal(automatic.titleColor, "#FFF8F0");
    assert.equal(automatic.subtitleY, 900);
    assert.equal(automatic.logo, "top-right");
    const overridden = planAdaptiveText({
      backgroundLuma: 0.2,
      subjectBottom: null,
      userOverride: { titleColor: "#006D52", subtitleY: 1000 },
    });
    assert.equal(overridden.titleColor, "#006D52");
    assert.equal(overridden.subtitleY, 1000);
    assert.equal(overridden.overridden, true);
  });

  it("round-trips a film document inside the existing handoff object", () => {
    const project = parseStudioFilmProject({
      version: 1,
      title: "MADE WITH PASSION",
      characterIds: ["char_cupcake_baker"],
      scenes: [scene({ id: "baker" })],
      sfxCues: [],
      subtitles: [],
      cta: { title: "CREATE · DISCOVER · SELL · SWAP", subtitle: "DISCOVER HOMECHEFF", website: "homecheff.eu" },
    });
    assert.ok(project);
    const stored = embedFilmProjectInHandoff({ storyboardId: "sb-1" }, project!);
    const again = parseStudioFilmProject(stored.studioFilmProject);
    assert.equal(again?.title, "MADE WITH PASSION");
    assert.equal(again?.export.subtitleLanguage, "nl-NL");
    assert.equal(again?.export.visualLanguage, "en");
    assert.equal(stored.storyboardId, "sb-1");
  });

  it("prices only requested operations and reuses an open reservation", () => {
    const estimated = quoteFilmProduction({
      sceneImageCount: 6,
      referenceVideoSeconds: 45,
      voiceLineCount: 6,
      lipsyncClipCount: 3,
      sfxCueCount: 0,
      musicGenerationCount: 0,
    });
    const maximum = quoteFilmProduction({
      sceneImageCount: 6,
      referenceVideoSeconds: 60,
      voiceLineCount: 6,
      lipsyncClipCount: 3,
      sfxCueCount: 0,
      musicGenerationCount: 0,
    });
    assert.equal(estimated.includesUnexecuted, false);
    assert.equal(estimated.lines.some((line) => line.id === "sfx_generation"), false);
    assert.equal(estimated.lines.some((line) => line.id === "music_generation"), false);
    assert.ok(maximum.providerUsd > estimated.providerUsd);
    assert.ok(maximum.customerHc > estimated.customerHc);
    assert.equal(filmReservationDecision("open"), "reuse");
    assert.equal(filmReservationDecision("settled"), "reject");
    assert.equal(classifyVoiceAccent("argentinian")?.id, "spanish.latin_american");
    assert.equal(assessFilmVoiceRole("argentine_english_male").supported, false);
    assert.equal(assessFilmVoiceRole("american_female").voiceId, null);
    assert.equal(estimated.providerUsd, 3.5906);
    assert.equal(estimated.customerHc, 1131);
    assert.equal(maximum.providerUsd, 4.4006);
    assert.equal(maximum.customerHc, 1344);
  });
});
