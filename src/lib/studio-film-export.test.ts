import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  acceptSceneProbe,
  assertPathInsideRoots,
  authorizeFilmExport,
  planFilmSceneMedia,
  probeSceneFile,
  resolveEditorExportFileName,
  resolveLocalEnglishVoice,
  selectEditorExport,
} from "@/lib/studio-film-export";
import { buildDutchSubtitleTrack, composeCharacterScene, parseStudioFilmProject, renderSrt, type StudioFilmProjectDocument } from "@/lib/studio-film-pipeline";
import { filmCtaWindow, filmOverlayAss, formatAssCentiseconds, renderStudioFilmProject } from "@/server/studio/studio-film-render";
import { resolveFfmpegForTextOverlay, runFfmpegCapture } from "@/lib/video-ffmpeg-capability";

const ROOT = process.cwd();

function project(): StudioFilmProjectDocument {
  const scenes = [0, 1].map((index) => {
    const id = `scene-${index + 1}`;
    return {
      id,
      order: index,
      characterId: index === 1 ? null : "char-1",
      voiceRole: index === 1 ? "english_narrator" as const : "american_female" as const,
      englishTitle: `Title ${index + 1}`,
      englishDialogue: index === 1 ? "Come and see the garden." : "Fresh bread is ready.",
      dutchSubtitle: index === 1 ? "Kom de tuin bekijken." : "Vers brood is klaar.",
      musicTrackId: index === 0 ? "bed-a" : "bed-b",
      sourceSceneId: index === 0 ? "owned-video" : "owned-still",
      durationSeconds: 4,
      subjectBottom: index === 0 ? 1100 : 700,
      shots: composeCharacterScene({
        sceneId: id,
        characterId: "char-1",
        durationSeconds: 4,
        dialogueStartSeconds: 0.5,
        dialogueDurationSeconds: 1.6,
      }).map((shot) => ({ ...shot, characterId: index === 1 ? null : "char-1" })),
    };
  });
  const parsed = parseStudioFilmProject({
    version: 1,
    title: "Local speech film",
    characterIds: ["char-1"],
    scenes,
    sfxCues: [{ id: "tap", sceneId: "scene-1", label: "Tap", startSeconds: 3.2, durationSeconds: 0.3, verified: true }],
    subtitles: [],
    cta: { title: "Watch", subtitle: "Local", website: "example.test" },
    logo: { enabled: true, position: "top-right" },
  });
  if (!parsed) throw new Error("project");
  const withCues = {
    ...parsed,
    scenes: parsed.scenes.map((scene, index) => ({ ...scene, ...scenes[index] })),
    subtitles: [],
  };
  return withCues;
}

test("routes a storyboard to the film renderer and leaves other projects on the montage", async () => {
  assert.equal(selectEditorExport(null), "montage");
  assert.equal(selectEditorExport(project()), "film");
  const route = await readFile(path.join(ROOT, "src/app/api/studio/videos/[projectId]/editor/export/route.ts"), "utf8");
  assert.equal(route.includes('selectEditorExport(loaded.film) === "film"'), true);
  assert.equal(route.includes("renderStudioFilmProject"), true);
  assert.equal(route.includes("renderUserVideoEditor"), true);
  assert.equal(/reserveStudioCredits|elevenlabs|video-providers/.test(route), false);
  const renderer = await readFile(path.join(ROOT, "src/server/studio/studio-film-render.ts"), "utf8");
  assert.equal(renderer.includes("sine=frequency"), false);
  assert.equal(renderer.includes('execFileAsync("say"'), true);
});

test("formats CTA in centiseconds, aligns burned subtitles with SRT, and keeps the subtitle file owned", async () => {
  assert.equal(formatAssCentiseconds(22.4), "0:00:22.40");
  assert.equal(formatAssCentiseconds(0.4), "0:00:00.40");
  assert.equal(formatAssCentiseconds(24), "0:00:24.00");
  assert.equal(formatAssCentiseconds(22.4).includes(".400"), false);

  const film = project();
  const cues = buildDutchSubtitleTrack(film.scenes).cues;
  const overlay = filmOverlayAss(film);
  const srt = renderSrt(cues);
  assert.equal(cues[0]?.startSeconds, 0.5);
  assert.equal(cues[0]?.endSeconds, 2.1);
  assert.equal(overlay.includes("0:00:00.50,0:00:02.10,Sub"), true);
  assert.equal(overlay.includes("0:00:00.00,0:00:04.00,Sub"), false);
  assert.equal(srt.includes("00:00:00,500 --> 00:00:02,100"), true);
  assert.equal(srt.includes("Vers brood is klaar."), true);
  const window = filmCtaWindow(8, cues[cues.length - 1]?.endSeconds ?? 0);
  assert.deepEqual(window, { start: 6.4, end: 8 });
  assert.equal(overlay.includes("0:00:06.40,0:00:08.00,Cta"), true);
  assert.equal(overlay.includes("Watch\\NLocal\\Nexample.test"), true);
  assert.equal(overlay.includes("HomeCheff"), false);
  assert.equal(overlay.includes("\\pos(360,1040)"), true);
  assert.ok((window?.start ?? 0) >= (cues[cues.length - 1]?.endSeconds ?? 0));
  assert.ok((window?.end ?? 0) <= 8);

  assert.equal(parseStudioFilmProject({ ...film, sfxCues: [{ ...film.sfxCues[0], id: "../passwd" }] }), null);
  assert.equal(resolveEditorExportFileName("export.srt"), "export.srt");
  assert.equal(resolveEditorExportFileName("export.mp4"), "export.mp4");
  assert.equal(resolveEditorExportFileName("../export.srt"), null);
  assert.equal(resolveEditorExportFileName("export.srt/../../etc/passwd"), null);
  assert.equal(resolveEditorExportFileName("/tmp/export.srt"), null);
  const route = await readFile(path.join(ROOT, "src/app/api/studio/videos/[projectId]/editor/file/route.ts"), "utf8");
  assert.equal(route.includes("requireActiveUser"), true);
  assert.equal(route.includes("loadOwnedEditor"), true);
  assert.equal(route.includes("resolveEditorExportFileName"), true);
  const editor = await readFile(path.join(ROOT, "src/components/studio/studio-user-video-editor.tsx"), "utf8");
  assert.equal(editor.includes('data-testid="editor-srt-download"'), true);
  assert.equal(editor.includes("name=export.srt"), true);
});

test("rejects missing, foreign, short, and non-picture scene media", async () => {
  const film = project();
  const missing = planFilmSceneMedia(film, [{ sceneId: "owned-video", order: 0 }]);
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.error, "SCENE_MEDIA_MISSING");
  const foreign = authorizeFilmExport({
    userId: "owner",
    projectOwnerId: "owner",
    characterIds: ["char-1"],
    ownedCharacterIds: ["char-2"],
  });
  assert.equal(foreign.ok, false);
  assert.throws(() => assertPathInsideRoots("/etc/passwd", [path.join(ROOT, "public")]));
  const otherOwner = authorizeFilmExport({
    userId: "intruder",
    projectOwnerId: "owner",
    characterIds: [],
    ownedCharacterIds: [],
  });
  assert.equal(otherOwner.ok, false);
  assert.deepEqual(acceptSceneProbe({ kind: "audio", durationSeconds: 4, width: 0, height: 0 }, 4), {
    ok: false,
    error: "SCENE_MEDIA_TYPE",
  });
  assert.deepEqual(acceptSceneProbe({ kind: "video", durationSeconds: 0.4, width: 720, height: 1280 }, 4), {
    ok: false,
    error: "SCENE_MEDIA_DURATION",
  });
  assert.equal(acceptSceneProbe({ kind: "image", durationSeconds: 0, width: 1280, height: 720 }, 4).ok, true);
});

test("local English voices are Samantha and Daniel, without accent claims", () => {
  const available = ["samantha", "daniel", "ellen", "xander"];
  const american = resolveLocalEnglishVoice("american_female", available);
  const narrator = resolveLocalEnglishVoice("english_narrator", available);
  const british = resolveLocalEnglishVoice("british_female", available);
  const argentine = resolveLocalEnglishVoice("argentine_english_male", available);
  assert.equal(american.sayName, "Samantha");
  assert.equal(narrator.sayName, "Daniel");
  assert.equal(american.accentFidelity, false);
  assert.equal(narrator.accentFidelity, false);
  assert.equal(british.sayName, null);
  assert.equal(argentine.sayName, null);
  assert.equal(new Set([american.sayName, narrator.sayName, british.sayName, argentine.sayName].filter(Boolean)).size, 2);
});

test("exports spoken English, narrator, music, sfx, Dutch subtitles, and an MP4", { timeout: 180_000 }, async () => {
  const ffmpeg = await resolveFfmpegForTextOverlay();
  const work = await mkdtemp(path.join(tmpdir(), "hc-film-voice-"));
  const video = path.join(work, "scene.mp4");
  const still = path.join(work, "still.png");
  const sfx = path.join(work, "tap.wav");
  for (const [args, label] of [
    [["-y", "-f", "lavfi", "-i", "color=c=black:s=720x1280:d=4", "-r", "30", "-pix_fmt", "yuv420p", video], "video"],
    [["-y", "-f", "lavfi", "-i", "color=c=white:s=1280x720:d=1", "-frames:v", "1", still], "still"],
    [["-y", "-f", "lavfi", "-i", "sine=frequency=1800:sample_rate=44100", "-t", "0.3", sfx], "sfx"],
  ] as const) {
    const made = await runFfmpegCapture(ffmpeg, [...args], { timeoutMs: 30_000 });
    assert.equal(made.code, 0, label);
  }
  const videoProbe = await probeSceneFile(video);
  const stillProbe = await probeSceneFile(still);
  const audioProbe = await probeSceneFile(sfx);
  assert.equal(acceptSceneProbe(videoProbe, 4).ok, true);
  assert.equal(stillProbe.kind, "image");
  assert.equal(audioProbe.kind, "audio");
  assert.equal(acceptSceneProbe(audioProbe, 4).ok, false);

  const film = project();
  const outputPath = path.join(work, "film.mp4");
  const rendered = await renderStudioFilmProject({
    project: {
      ...film,
      subtitles: film.scenes.map((scene, index) => ({
        index: index + 1,
        sceneId: scene.id,
        english: scene.englishDialogue,
        dutch: scene.dutchSubtitle,
        startSeconds: index * 4 + 0.5,
        endSeconds: index * 4 + 2.1,
      })),
    },
    clips: [
      { sceneId: "scene-1", filePath: video, backgroundLuma: 0.05, kind: "video" },
      { sceneId: "scene-2", filePath: still, backgroundLuma: 0.95, kind: "image" },
    ],
    musicFiles: [
      { id: "bed-a", filePath: path.join(ROOT, "public/studio-local-assets/fm_oga_build.mp3") },
      { id: "bed-b", filePath: path.join(ROOT, "public/studio-local-assets/fm_oga_bossa_nova.mp3") },
    ],
    sfxFiles: [{ id: "tap", filePath: sfx }],
    logoPath: path.join(ROOT, "public/brand/homecheff-mark.png"),
    workDir: path.join(work, "render"),
    outputPath,
    allowedRoots: [work, path.join(ROOT, "public")],
    availableVoiceIds: ["samantha", "daniel"],
  });
  assert.equal(rendered.renderer, "film");
  assert.equal(rendered.creditsCharged, 0);
  assert.deepEqual(rendered.providerCalls, []);
  assert.deepEqual(
    rendered.voices.map((voice) => voice.sayName),
    ["Samantha", "Daniel"]
  );
  assert.equal(rendered.voices.every((voice) => voice.accentFidelity === false), true);
  const speech = await readFile(path.join(work, "render/speech-scene-1.wav"));
  assert.ok(speech.byteLength > 8_000);
  const low = await bandMean(ffmpeg, path.join(work, "render/speech-scene-1.wav"), 200, 700);
  const high = await bandMean(ffmpeg, path.join(work, "render/speech-scene-1.wav"), 900, 2500);
  assert.ok(low > -45 && high > -45, `speech bands ${low} ${high}`);
  assert.ok(Math.abs(low - high) < 24, `speech is not a single tone ${low} ${high}`);
  const srt = await readFile(outputPath.replace(/\.mp4$/, ".srt"), "utf8");
  assert.equal(srt.includes("Vers brood is klaar."), true);
  assert.equal(srt.includes("Fresh bread is ready."), false);
  const overlay = await readFile(path.join(work, "render/film-overlay.ass"), "utf8");
  assert.equal(overlay.includes("Title 1"), true);
  assert.equal(overlay.includes("Watch\\NLocal\\Nexample.test"), true);
  assert.equal(overlay.includes("0:00:00.50,0:00:02.10,Sub"), true);
  assert.equal(overlay.includes("0:00:06.40,0:00:08.00,Cta"), true);
  assert.equal(overlay.includes(".400"), false);
  const musicFilter = await readFile(path.join(work, "render/music-filter.txt"), "utf8");
  assert.equal(musicFilter.includes("afade="), true);
  const mixFilter = await readFile(path.join(work, "render/mix-filter.txt"), "utf8");
  assert.equal(mixFilter.includes("0.119"), true);
  assert.equal(mixFilter.includes("adelay=3200|3200"), true);
  const probe = await runFfmpegCapture(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name,width,height", "-of", "json", outputPath],
    { timeoutMs: 20_000 }
  );
  const probed = JSON.parse(probe.output) as {
    streams: Array<{ codec_type?: string; codec_name?: string; width?: number; height?: number }>;
    format: { duration?: string };
  };
  assert.equal(probed.streams.find((stream) => stream.codec_type === "video")?.codec_name, "h264");
  assert.equal(probed.streams.find((stream) => stream.codec_type === "video")?.width, 720);
  assert.equal(probed.streams.find((stream) => stream.codec_type === "audio")?.codec_name, "aac");
  const duration = Number(probed.format.duration);
  assert.ok(duration > 7.5 && duration < 8.6, `duration ${duration}`);
  const sfxLevel = await meanVolume(ffmpeg, outputPath, 3.25, 0.2);
  const quietLevel = await meanVolume(ffmpeg, outputPath, 2.45, 0.2);
  assert.ok(sfxLevel > quietLevel, `sfx ${sfxLevel} quiet ${quietLevel}`);
  console.log(JSON.stringify({ outputPath, duration, low, high, sfxLevel, quietLevel, voices: rendered.voices }));
});

async function bandMean(ffmpeg: string, file: string, lowHz: number, highHz: number): Promise<number> {
  const result = await runFfmpegCapture(
    ffmpeg,
    ["-i", file, "-af", `highpass=f=${lowHz},lowpass=f=${highHz},volumedetect`, "-f", "null", "-"],
    { timeoutMs: 20_000 }
  );
  const match = result.output.match(/mean_volume:\s*(-?[\d.]+)\s*dB/);
  assert.ok(match, result.output.slice(-200));
  return Number(match[1]);
}

async function meanVolume(ffmpeg: string, file: string, start: number, duration: number): Promise<number> {
  const result = await runFfmpegCapture(
    ffmpeg,
    ["-ss", start.toFixed(3), "-t", duration.toFixed(3), "-i", file, "-af", "volumedetect", "-f", "null", "-"],
    { timeoutMs: 20_000 }
  );
  const match = result.output.match(/mean_volume:\s*(-?[\d.]+)\s*dB/);
  assert.ok(match, result.output.slice(-200));
  return Number(match[1]);
}
