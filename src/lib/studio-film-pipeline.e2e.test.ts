import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  bindOwnedCharacters,
  composeCharacterScene,
  parseStudioFilmProject,
  readFilmProjectFromHandoff,
  renderSrt,
  updateFilmScene,
  writeFilmProjectToHandoff,
  type StudioFilmProjectDocument,
} from "@/lib/studio-film-pipeline";
import { splitEditorSaveBody } from "@/server/studio/studio-user-video-editor-access";
import { renderStudioFilmProject } from "@/server/studio/studio-film-render";
import { resolveFfmpegForTextOverlay, runFfmpegCapture } from "@/lib/video-ffmpeg-capability";

const ROOT = process.cwd();

function scene(index: number, musicTrackId: string): StudioFilmProjectDocument["scenes"][number] {
  const id = `scene-${index + 1}`;
  const durationSeconds = 2;
  return {
    id,
    order: index,
    characterId: index === 5 ? null : `char-${index + 1}`,
    voiceRole: index === 5 ? "english_narrator" : "american_female",
    englishTitle: `Title ${index + 1}`,
    englishDialogue: `Spoken line ${index + 1}`,
    dutchSubtitle: `Nederlandse regel ${index + 1}`,
    musicTrackId,
    durationSeconds,
    subjectBottom: index === 0 ? 1100 : 700,
    shots: composeCharacterScene({
      sceneId: id,
      characterId: index === 5 ? "narrator" : `char-${index + 1}`,
      durationSeconds,
      dialogueStartSeconds: 0.2,
      dialogueDurationSeconds: 0.5,
    }).map((shot) => ({ ...shot, characterId: index === 5 ? null : `char-${index + 1}` })),
  };
}

test("six-scene film saves, reopens, renders, and probes a local MP4", { timeout: 180_000 }, async () => {
  const created = parseStudioFilmProject({
    version: 1,
    title: "Synthetic film",
    characterIds: ["char-1"],
    scenes: [0, 1, 2, 3, 4, 5].map((index) => scene(index, index % 2 === 0 ? "bed-a" : "bed-b")),
    sfxCues: [],
    subtitles: [],
    cta: { title: "Watch", subtitle: "Local", website: "example.test" },
    logo: { enabled: true, position: "top-right" },
    export: { subtitleMode: "burn_in" },
  });
  assert.ok(created);
  assert.equal(created.scenes.length, 6);
  assert.equal(writeFilmProjectToHandoff({}, { ...created, version: 2 as 1 }), null);

  const work = await mkdtemp(path.join(tmpdir(), "hc-film-"));
  const handoffPath = path.join(work, "handoff.json");
  const saved = writeFilmProjectToHandoff({ userVideoEditor: { mode: "simple" } }, created);
  assert.ok(saved);
  await writeFile(handoffPath, JSON.stringify(saved));
  const loaded = readFilmProjectFromHandoff(JSON.parse(await readFile(handoffPath, "utf8")));
  assert.equal(loaded?.title, "Synthetic film");
  assert.equal(loaded?.scenes.length, 6);

  let edited = updateFilmScene(loaded!, "scene-2", {
    characterId: "char-2",
    englishDialogue: "Spoken line 2",
    dutchSubtitle: "Nederlandse regel 2",
    musicTrackId: "bed-b",
  });
  edited = updateFilmScene(edited, "scene-6", { voiceRole: "english_narrator", characterId: null });
  edited = {
    ...edited,
    sfxCues: [
      {
        id: "tap",
        sceneId: "scene-3",
        label: "Tap",
        startSeconds: 1.3,
        durationSeconds: 0.25,
        verified: true,
      },
    ],
  };
  assert.equal(edited.characterIds.includes("char-2"), true);
  assert.equal(edited.scenes[5]?.voiceRole, "english_narrator");
  assert.equal(edited.subtitles.length, 6);
  assert.equal(edited.subtitles.every((cue) => cue.dutch.startsWith("Nederlandse")), true);
  const srtPreview = renderSrt(edited.subtitles);
  assert.equal(srtPreview.includes("Title 1"), false);
  assert.equal(srtPreview.includes("Nederlandse regel 1"), true);

  const ownership = bindOwnedCharacters(
    { id: "owner-1", role: "user" },
    [
      { id: "char-2", ownerId: "owner-1" },
      { id: "char-9", ownerId: "other" },
    ]
  );
  assert.deepEqual(ownership.allowedIds, ["char-2"]);
  assert.deepEqual(ownership.deniedIds, ["char-9"]);
  const split = splitEditorSaveBody({ document: { mode: "simple" }, film: edited });
  assert.equal((split.editor as { mode: string }).mode, "simple");
  assert.equal(parseStudioFilmProject(split.film)?.version, 1);

  const ffmpeg = await resolveFfmpegForTextOverlay();
  const clips = [];
  for (let index = 0; index < 6; index += 1) {
    const filePath = path.join(work, `src-${index}.mp4`);
    const color = index % 2 === 0 ? "black" : "white";
    const made = await runFfmpegCapture(
      ffmpeg,
      ["-y", "-f", "lavfi", "-i", `color=c=${color}:s=720x1280:d=2`, "-r", "30", "-pix_fmt", "yuv420p", filePath],
      { timeoutMs: 30_000 }
    );
    assert.equal(made.code, 0, made.output.slice(-300));
    clips.push({ sceneId: `scene-${index + 1}`, filePath, backgroundLuma: index % 2 === 0 ? 0.05 : 0.95 });
  }
  const sfxPath = path.join(work, "tap.wav");
  const sfx = await runFfmpegCapture(
    ffmpeg,
    ["-y", "-f", "lavfi", "-i", "sine=frequency=1800:sample_rate=44100", "-t", "0.25", sfxPath],
    { timeoutMs: 20_000 }
  );
  assert.equal(sfx.code, 0);

  const outputPath = path.join(work, "film.mp4");
  const rendered = await renderStudioFilmProject({
    project: edited,
    clips,
    musicFiles: [
      { id: "bed-a", filePath: path.join(ROOT, "public/studio-local-assets/fm_oga_build.mp3") },
      { id: "bed-b", filePath: path.join(ROOT, "public/studio-local-assets/fm_oga_bossa_nova.mp3") },
    ],
    sfxFiles: [{ id: "tap", filePath: sfxPath }],
    logoPath: path.join(ROOT, "public/brand/homecheff-mark.png"),
    workDir: path.join(work, "render"),
    outputPath,
    allowedRoots: [work, path.join(ROOT, "public")],
  });
  assert.equal(rendered.creditsCharged, 0);
  assert.deepEqual(rendered.providerCalls, []);
  assert.equal(rendered.srt.includes("Nederlandse regel 6"), true);
  const srtFile = await readFile(outputPath.replace(/\.mp4$/, ".srt"), "utf8");
  assert.equal(srtFile, rendered.srt);

  const musicFilter = await readFile(path.join(work, "render/music-filter.txt"), "utf8");
  assert.equal(musicFilter.includes("afade="), true);
  const mixFilter = await readFile(path.join(work, "render/mix-filter.txt"), "utf8");
  assert.equal(mixFilter.includes("0.119"), true);
  assert.equal(mixFilter.includes("adelay=5300|5300"), true);
  const overlay = await readFile(path.join(work, "render/film-overlay.ass"), "utf8");
  assert.equal(overlay.includes("Title 1"), true);
  assert.equal(overlay.includes("&H00F0F8FF&"), true);
  assert.equal(overlay.includes("&H0017191C&"), true);
  assert.equal(overlay.includes("\\pos(360,900)"), true);

  const probe = await runFfmpegCapture(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name,width,height", "-of", "json", outputPath],
    { timeoutMs: 20_000 }
  );
  assert.equal(probe.code, 0, probe.output.slice(-400));
  const probed = JSON.parse(probe.output) as {
    streams: Array<{ codec_type?: string; codec_name?: string; width?: number; height?: number }>;
    format: { duration?: string };
  };
  const video = probed.streams.find((stream) => stream.codec_type === "video");
  const audio = probed.streams.find((stream) => stream.codec_type === "audio");
  assert.equal(video?.codec_name, "h264");
  assert.equal(video?.width, 720);
  assert.equal(video?.height, 1280);
  assert.equal(audio?.codec_name, "aac");
  const duration = Number(probed.format.duration);
  assert.ok(duration > 11.5 && duration < 12.6, `duration ${duration}`);

  const sfxWindow = await meanVolume(ffmpeg, outputPath, 5.32, 0.18);
  const quietWindow = await meanVolume(ffmpeg, outputPath, 5.02, 0.15);
  assert.ok(sfxWindow > quietWindow, `sfx ${sfxWindow} quiet ${quietWindow}`);

  const reopenedHandoff = writeFilmProjectToHandoff(JSON.parse(await readFile(handoffPath, "utf8")) as Record<string, unknown>, {
    ...edited,
    title: "Synthetic film reopened",
  });
  await writeFile(handoffPath, JSON.stringify(reopenedHandoff));
  const reopened = readFilmProjectFromHandoff(JSON.parse(await readFile(handoffPath, "utf8")));
  assert.equal(reopened?.title, "Synthetic film reopened");
  assert.equal(reopened?.scenes[1]?.characterId, "char-2");
  assert.equal(reopened?.scenes[5]?.voiceRole, "english_narrator");
  assert.equal(reopened?.sfxCues[0]?.verified, true);
  assert.equal(reopened?.subtitles.length, 6);

  const source = await readFile(path.join(ROOT, "src/server/studio/studio-film-render.ts"), "utf8");
  assert.equal(source.includes("video-providers"), false);
  assert.equal(source.includes("elevenlabs"), false);
  assert.equal(source.includes("reserveStudioCredits"), false);
  console.log(JSON.stringify({ outputPath, duration, sfxWindow, quietWindow, creditsCharged: rendered.creditsCharged }));
});

async function meanVolume(ffmpeg: string, file: string, start: number, duration: number): Promise<number> {
  const result = await runFfmpegCapture(
    ffmpeg,
    ["-ss", start.toFixed(3), "-t", duration.toFixed(3), "-i", file, "-af", "volumedetect", "-f", "null", "-"],
    { timeoutMs: 20_000 }
  );
  const match = result.output.match(/mean_volume:\s*(-?[\d.]+)\s*dB/);
  assert.ok(match, result.output.slice(-300));
  return Number(match[1]);
}
