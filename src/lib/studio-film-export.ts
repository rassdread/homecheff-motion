/**
 * Decides which existing editor export runs, and which owned scene file
 * each storyboard scene may use. No providers and no project store.
 */

import { realpathSync } from "node:fs";
import path from "node:path";
import { getResolvedFfprobePathSync, resolveFfmpegBinaries } from "@/lib/ffmpeg/resolve-ffmpeg-binaries";
import type { FilmVoiceRole, StudioFilmProjectDocument } from "@/lib/studio-film-pipeline";
import { runFfmpegCapture } from "@/lib/video-ffmpeg-capability";

export type EditorExportKind = "film" | "montage";

export function selectEditorExport(film: StudioFilmProjectDocument | null | undefined): EditorExportKind {
  return film && film.version === 1 && film.scenes.length > 0 ? "film" : "montage";
}

const EDITOR_EXPORT_FILES = new Set(["preview.mp4", "export.mp4", "export.srt"]);

export function resolveEditorExportFileName(name: string | null | undefined): "preview.mp4" | "export.mp4" | "export.srt" | null {
  if (!name || !EDITOR_EXPORT_FILES.has(name)) return null;
  return name as "preview.mp4" | "export.mp4" | "export.srt";
}

export function authorizeFilmExport(input: {
  userId: string;
  projectOwnerId: string;
  characterIds: string[];
  ownedCharacterIds: string[];
}): { ok: true } | { ok: false; error: "PROJECT_FORBIDDEN" | "CHARACTER_FORBIDDEN" } {
  if (input.userId !== input.projectOwnerId) return { ok: false, error: "PROJECT_FORBIDDEN" };
  const owned = new Set(input.ownedCharacterIds);
  const foreign = input.characterIds.find((id) => id.trim() && !owned.has(id));
  if (foreign) return { ok: false, error: "CHARACTER_FORBIDDEN" };
  return { ok: true };
}

export function planFilmSceneMedia(
  film: StudioFilmProjectDocument,
  owned: Array<{ sceneId: string; order: number }>
):
  | { ok: true; assignments: Array<{ filmSceneId: string; sourceSceneId: string }> }
  | { ok: false; error: "SCENE_MEDIA_MISSING"; sceneId: string } {
  const byId = new Map(owned.map((row) => [row.sceneId, row]));
  const byOrder = [...owned].sort((a, b) => a.order - b.order);
  const assignments: Array<{ filmSceneId: string; sourceSceneId: string }> = [];
  for (const scene of [...film.scenes].sort((a, b) => a.order - b.order)) {
    const chosen = scene.sourceSceneId ? byId.get(scene.sourceSceneId) : byOrder[scene.order];
    if (!chosen) return { ok: false, error: "SCENE_MEDIA_MISSING", sceneId: scene.id };
    assignments.push({ filmSceneId: scene.id, sourceSceneId: chosen.sceneId });
  }
  return { ok: true, assignments };
}

export type SceneMediaProbe = {
  kind: "video" | "image" | "audio" | "unknown";
  durationSeconds: number;
  width: number;
  height: number;
};

export async function probeSceneFile(filePath: string): Promise<SceneMediaProbe> {
  await resolveFfmpegBinaries();
  const ffprobe = getResolvedFfprobePathSync();
  const result = await runFfmpegCapture(
    ffprobe,
    ["-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name,width,height", "-of", "json", filePath],
    { timeoutMs: 20_000 }
  );
  if (result.code !== 0) return { kind: "unknown", durationSeconds: 0, width: 0, height: 0 };
  let parsed: { streams?: Array<{ codec_type?: string; codec_name?: string; width?: number; height?: number }>; format?: { duration?: string } };
  try {
    parsed = JSON.parse(result.output) as typeof parsed;
  } catch {
    return { kind: "unknown", durationSeconds: 0, width: 0, height: 0 };
  }
  const video = parsed.streams?.find((stream) => stream.codec_type === "video");
  const audio = parsed.streams?.find((stream) => stream.codec_type === "audio");
  const durationSeconds = Number(parsed.format?.duration ?? 0);
  const imageCodecs = new Set(["png", "mjpeg", "gif", "webp", "bmp"]);
  if (video && imageCodecs.has(video.codec_name ?? "")) {
    return { kind: "image", durationSeconds: 0, width: video.width ?? 0, height: video.height ?? 0 };
  }
  if (video) {
    return {
      kind: "video",
      durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : 0,
      width: video.width ?? 0,
      height: video.height ?? 0,
    };
  }
  if (audio) return { kind: "audio", durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : 0, width: 0, height: 0 };
  return { kind: "unknown", durationSeconds: 0, width: 0, height: 0 };
}

export function acceptSceneProbe(
  probe: SceneMediaProbe,
  sceneDurationSeconds: number
): { ok: true; kind: "video" | "image" } | { ok: false; error: "SCENE_MEDIA_TYPE" | "SCENE_MEDIA_DURATION" | "SCENE_MEDIA_DIMENSIONS" } {
  if (probe.kind === "audio" || probe.kind === "unknown") return { ok: false, error: "SCENE_MEDIA_TYPE" };
  if (!(probe.width >= 2) || !(probe.height >= 2)) return { ok: false, error: "SCENE_MEDIA_DIMENSIONS" };
  if (probe.kind === "video" && !(probe.durationSeconds + 0.05 >= sceneDurationSeconds)) {
    return { ok: false, error: "SCENE_MEDIA_DURATION" };
  }
  return { ok: true, kind: probe.kind };
}

export function assertPathInsideRoots(filePath: string, roots: string[]): string {
  if (!filePath || filePath.includes("\0")) throw new Error("PATH_REJECTED");
  let resolved: string;
  try {
    resolved = realpathSync(filePath);
  } catch {
    throw new Error("PATH_REJECTED");
  }
  const allowed = roots.map((root) => {
    try {
      return realpathSync(root);
    } catch {
      return path.resolve(root);
    }
  });
  if (!allowed.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`))) {
    throw new Error("PATH_REJECTED");
  }
  return resolved;
}

export function resolveLocalEnglishVoice(
  role: FilmVoiceRole,
  availableVoiceIds: readonly string[]
): { sayName: string | null; voiceId: string | null; accentFidelity: false; limitation: string } {
  if (role === "american_female") {
    if (!availableVoiceIds.includes("samantha")) {
      return {
        sayName: null,
        voiceId: null,
        accentFidelity: false,
        limitation: "No installed en_US female voice.",
      };
    }
    return {
      sayName: "Samantha",
      voiceId: "samantha",
      accentFidelity: false,
      limitation: "Samantha is the installed en_US female voice. Accent fidelity is not claimed.",
    };
  }
  if (role === "english_narrator") {
    if (!availableVoiceIds.includes("daniel")) {
      return {
        sayName: null,
        voiceId: null,
        accentFidelity: false,
        limitation: "No installed second English voice for the narrator.",
      };
    }
    return {
      sayName: "Daniel",
      voiceId: "daniel",
      accentFidelity: false,
      limitation: "Daniel is the installed en_GB male voice, used as a distinct narrator. Accent fidelity is not claimed.",
    };
  }
  if (role === "british_female") {
    return {
      sayName: null,
      voiceId: null,
      accentFidelity: false,
      limitation: "No installed en_GB female voice. The en_GB male voice is not used as a substitute.",
    };
  }
  return {
    sayName: null,
    voiceId: null,
    accentFidelity: false,
    limitation: "No installed English Argentine voice. Installed English voices are en_US female and en_GB male only.",
  };
}
