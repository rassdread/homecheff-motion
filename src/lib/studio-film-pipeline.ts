/**
 * Local film plan for an editable multi-character production.
 * Reuses character ownership, SadTalker-as-still lip-sync, the licensed-music
 * editor, and the existing HC pricing rules. It does not call a provider,
 * reserve a wallet, or create a second project table.
 */

import { estimateLipsyncReservedUsd } from "@/lib/lipsync/config";
import { cogsUsdToCustomerCredits } from "@/lib/studio-production-pricing-engine";
import {
  OBSERVED_BLOB_USD_PER_ASSET,
  OBSERVED_BLOB_USD_PER_PRODUCTION,
  OBSERVED_EXPORT_USD_PER_OUTPUT,
  OBSERVED_OPENAI_USD_PER_GENERATED_SCENE,
  OBSERVED_RETRY_BUFFER_FRACTION,
  OBSERVED_VIDU_USD_PER_CREDIT,
} from "@/lib/studio-production-pricing-observed";

/** Documented viduq3-turbo reference-to-video price at 720p, in provider credits per second. */
const VIDU_REFERENCE_CREDITS_PER_SECOND_720P = 10;

function referenceVideoCogsUsd(durationSeconds: number): number {
  return durationSeconds * VIDU_REFERENCE_CREDITS_PER_SECOND_720P * OBSERVED_VIDU_USD_PER_CREDIT;
}
import { usdToCredits } from "@/lib/studio-credit-constants";
import { classifyVoiceAccent } from "@/lib/studio-voice-accent-model";
import { quoteReservationDecision } from "@/lib/studio-production-quote";
import { getActionCost } from "@/server/studio-account/studio-action-cost-registry";

type CharacterOwnerRow = { ownerId: string };
type Viewer = { id: string; role: string };

function viewerCanView(viewer: Viewer, character: CharacterOwnerRow): boolean {
  return character.ownerId === viewer.id || viewer.role === "admin";
}

export const STUDIO_FILM_PROJECT_HANDOFF_KEY = "studioFilmProject";
export const FILM_FRAME = { width: 720, height: 1280 } as const;
export const FILM_MUSIC_DUCK_GAIN = 0.35;
export const FILM_MUSIC_CROSSFADE_SECONDS = 0.4;

export type FilmVoiceRole =
  | "american_female"
  | "argentine_english_male"
  | "british_female"
  | "english_narrator";

export type FilmShotRole = "action" | "speaking_closeup" | "return_to_action";

export type FilmShot = {
  id: string;
  sceneId: string;
  role: FilmShotRole;
  characterId: string | null;
  provider: "vidu_reference" | "replicate_sadtalker";
  startSeconds: number;
  durationSeconds: number;
  /** SadTalker animates a still plus audio. It does not lip-sync a Vidu plate. */
  lipsyncsActionFootage: false;
};

export type FilmScenePlan = {
  id: string;
  order: number;
  characterId: string | null;
  voiceRole: FilmVoiceRole;
  /** On-screen title. Spoken English is not copied here. */
  englishTitle: string;
  englishDialogue: string;
  dutchSubtitle: string;
  musicTrackId: string | null;
  /** Owned editor scene whose picture this film scene uses. */
  sourceSceneId?: string | null;
  durationSeconds: number;
  /** Bottom of the subject in the 1280-tall frame, when known. */
  subjectBottom?: number | null;
  shots: FilmShot[];
};

export type FilmSfxCue = {
  id: string;
  sceneId: string;
  label: string;
  startSeconds: number;
  durationSeconds: number;
  verified: true;
};

export type FilmSubtitleCue = {
  index: number;
  sceneId: string;
  english: string;
  dutch: string;
  startSeconds: number;
  endSeconds: number;
};

export type FilmTextPlacement = {
  titleColor: string;
  subtitleColor: string;
  titleY: number;
  subtitleY: number;
  logo: "top-right";
  ctaY: number;
  overridden: boolean;
};

export type StudioFilmProjectDocument = {
  version: 1;
  title: string;
  characterIds: string[];
  scenes: FilmScenePlan[];
  sfxCues: FilmSfxCue[];
  subtitles: FilmSubtitleCue[];
  /** Optional contrast and placement override shared by every scene. */
  textOverride?: { titleColor?: string; subtitleY?: number } | null;
  logo: { enabled: boolean; position: "top-right" };
  cta: { title: string; subtitle: string; website: string };
  export: {
    width: 720;
    height: 1280;
    videoCodec: "h264";
    audioCodec: "aac";
    subtitleMode: "burn_in" | "srt";
    subtitleLanguage: "nl-NL";
    visualLanguage: "en";
  };
};

export type FilmCostLine = {
  id: string;
  providerUsd: number;
  customerHc: number;
};

export type FilmCostQuote = {
  lines: FilmCostLine[];
  providerUsd: number;
  customerHc: number;
  includesUnexecuted: false;
};

function roundUsd(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function registryCharge(actionType: string, count: number): { usd: number; hc: number } {
  if (count <= 0) return { usd: 0, hc: 0 };
  const entry = getActionCost(actionType);
  if (!entry) return { usd: 0, hc: 0 };
  const usd = entry.reservedCostUsd * count;
  const hc = count * usdToCredits(entry.reservedCostUsd, entry.minimumCreditCost);
  return { usd, hc };
}

export function assessFilmVoiceRole(role: FilmVoiceRole): {
  role: FilmVoiceRole;
  supported: boolean;
  accentId: string | null;
  voiceId: null;
  reason: string;
} {
  if (role === "argentine_english_male") {
    const accent = classifyVoiceAccent("argentinian");
    return {
      role,
      supported: false,
      accentId: accent?.id ?? null,
      voiceId: null,
      reason: "No English Argentine accent class. Argentinian labels map to Spanish Latin American.",
    };
  }
  if (role === "english_narrator") {
    return {
      role,
      supported: false,
      accentId: null,
      voiceId: null,
      reason: "No verified ElevenLabs voice id for a distinct energetic English narrator.",
    };
  }
  const raw = role === "american_female" ? "american" : "british";
  const accent = classifyVoiceAccent(raw);
  return {
    role,
    supported: accent?.id === "english.american" || accent?.id === "english.british",
    accentId: accent?.id ?? null,
    voiceId: null,
    reason: "Accent class exists. No live voice id was verified.",
  };
}

export function bindOwnedCharacters(
  viewer: Viewer,
  characters: Array<CharacterOwnerRow & { id: string }>
): { allowedIds: string[]; deniedIds: string[] } {
  const allowedIds: string[] = [];
  const deniedIds: string[] = [];
  for (const character of characters) {
    if (viewerCanView(viewer, character)) allowedIds.push(character.id);
    else deniedIds.push(character.id);
  }
  return { allowedIds, deniedIds };
}

/** Action plate, speaking still, then a return plate. Speaking never uses Vidu. */
export function composeCharacterScene(input: {
  sceneId: string;
  characterId: string;
  durationSeconds: number;
  dialogueStartSeconds: number;
  dialogueDurationSeconds: number;
}): FilmShot[] {
  const duration = Math.max(0.4, input.durationSeconds);
  const speechStart = Math.min(Math.max(0, input.dialogueStartSeconds), duration);
  const speechDuration = Math.min(
    Math.max(0.4, input.dialogueDurationSeconds),
    Math.max(0.4, duration - speechStart)
  );
  const shots: FilmShot[] = [];
  if (speechStart >= 0.4) {
    shots.push({
      id: `${input.sceneId}-action`,
      sceneId: input.sceneId,
      role: "action",
      characterId: input.characterId,
      provider: "vidu_reference",
      startSeconds: 0,
      durationSeconds: roundUsd(speechStart),
      lipsyncsActionFootage: false,
    });
  }
  shots.push({
    id: `${input.sceneId}-speak`,
    sceneId: input.sceneId,
    role: "speaking_closeup",
    characterId: input.characterId,
    provider: "replicate_sadtalker",
    startSeconds: roundUsd(speechStart),
    durationSeconds: roundUsd(speechDuration),
    lipsyncsActionFootage: false,
  });
  const returnStart = speechStart + speechDuration;
  if (duration - returnStart >= 0.4) {
    shots.push({
      id: `${input.sceneId}-return`,
      sceneId: input.sceneId,
      role: "return_to_action",
      characterId: input.characterId,
      provider: "vidu_reference",
      startSeconds: roundUsd(returnStart),
      durationSeconds: roundUsd(duration - returnStart),
      lipsyncsActionFootage: false,
    });
  }
  return shots;
}

export function planFilmAudio(scenes: FilmScenePlan[]): {
  tracks: Array<"dialogue" | "narrator" | "music" | "sfx">;
  musicCrossfades: Array<{ fromSceneId: string; toSceneId: string; seconds: number }>;
  ducking: Array<{ sceneId: string; startSeconds: number; endSeconds: number; musicGain: number }>;
  loudness: { voiceLufs: -16; musicLufs: -18 };
} {
  const musicCrossfades = [];
  const ducking = [];
  let cursor = 0;
  for (let index = 0; index < scenes.length; index += 1) {
    const scene = scenes[index]!;
    const speech = scene.shots.find((shot) => shot.role === "speaking_closeup");
    if (speech && (scene.characterId || scene.voiceRole === "english_narrator")) {
      ducking.push({
        sceneId: scene.id,
        startSeconds: roundUsd(cursor + speech.startSeconds),
        endSeconds: roundUsd(cursor + speech.startSeconds + speech.durationSeconds),
        musicGain: FILM_MUSIC_DUCK_GAIN,
      });
    }
    const next = scenes[index + 1];
    if (next && scene.musicTrackId && next.musicTrackId && scene.musicTrackId !== next.musicTrackId) {
      musicCrossfades.push({
        fromSceneId: scene.id,
        toSceneId: next.id,
        seconds: FILM_MUSIC_CROSSFADE_SECONDS,
      });
    }
    cursor += scene.durationSeconds;
  }
  return {
    tracks: ["dialogue", "narrator", "music", "sfx"],
    musicCrossfades,
    ducking,
    loudness: { voiceLufs: -16, musicLufs: -18 },
  };
}

export function acceptVerifiedSfxCues(raw: unknown[]): { accepted: FilmSfxCue[]; rejected: string[] } {
  const accepted: FilmSfxCue[] = [];
  const rejected: string[] = [];
  raw.forEach((item, index) => {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const label = typeof row.label === "string" ? row.label.trim() : "";
    const sceneId = typeof row.sceneId === "string" ? row.sceneId.trim() : "";
    const start = typeof row.startSeconds === "number" ? row.startSeconds : Number.NaN;
    const duration = typeof row.durationSeconds === "number" ? row.durationSeconds : Number.NaN;
    if (row.verified !== true || !label || !sceneId || !Number.isFinite(start) || start < 0 || !(duration > 0)) {
      rejected.push(label || `cue-${index + 1}`);
      return;
    }
    accepted.push({
      id: typeof row.id === "string" && row.id.trim() ? row.id.trim() : `sfx-${index + 1}`,
      sceneId,
      label,
      startSeconds: start,
      durationSeconds: duration,
      verified: true,
    });
  });
  return { accepted, rejected };
}

export function buildDutchSubtitleTrack(
  scenes: Array<Pick<FilmScenePlan, "id" | "englishDialogue" | "dutchSubtitle" | "shots" | "durationSeconds">>
): { cues: FilmSubtitleCue[]; errors: string[] } {
  const cues: FilmSubtitleCue[] = [];
  const errors: string[] = [];
  let cursor = 0;
  let previousEnd = 0;
  scenes.forEach((scene) => {
    const speech = scene.shots.find((shot) => shot.role === "speaking_closeup");
    const dutch = scene.dutchSubtitle.trim();
    const english = scene.englishDialogue.trim();
    if (!speech || !dutch || !english) {
      errors.push(scene.id);
      cursor += scene.durationSeconds;
      return;
    }
    const start = cursor + speech.startSeconds;
    const end = cursor + speech.startSeconds + speech.durationSeconds;
    if (!(end > start) || start < previousEnd - 0.001) {
      errors.push(scene.id);
      cursor += scene.durationSeconds;
      return;
    }
    cues.push({
      index: cues.length + 1,
      sceneId: scene.id,
      english,
      dutch,
      startSeconds: roundUsd(start),
      endSeconds: roundUsd(end),
    });
    previousEnd = end;
    cursor += scene.durationSeconds;
  });
  return { cues, errors };
}

export function renderSrt(cues: FilmSubtitleCue[]): string {
  const stamp = (seconds: number) => {
    const ms = Math.round(seconds * 1000);
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    const milli = ms % 1000;
    const pad = (value: number, size: number) => String(value).padStart(size, "0");
    return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)},${pad(milli, 3)}`;
  };
  return cues
    .map((cue) => `${cue.index}\n${stamp(cue.startSeconds)} --> ${stamp(cue.endSeconds)}\n${cue.dutch}`)
    .join("\n\n");
}

export function planAdaptiveText(input: {
  backgroundLuma: number;
  subjectBottom: number | null;
  userOverride?: { titleColor?: string; subtitleY?: number } | null;
}): FilmTextPlacement {
  const dark = input.backgroundLuma < 0.45;
  const titleColor = dark ? "#FFF8F0" : "#1C1917";
  const subtitleColor = "#FFF8F0";
  let subtitleY = 1080;
  if (input.subjectBottom != null && input.subjectBottom > 980) subtitleY = 900;
  const override = input.userOverride;
  return {
    titleColor: override?.titleColor || titleColor,
    subtitleColor,
    titleY: 140,
    subtitleY: override?.subtitleY ?? subtitleY,
    logo: "top-right",
    ctaY: (override?.subtitleY ?? subtitleY) - 160,
    overridden: Boolean(override?.titleColor || override?.subtitleY != null),
  };
}

export function quoteFilmProduction(input: {
  sceneImageCount: number;
  referenceVideoSeconds: number;
  voiceLineCount: number;
  lipsyncClipCount: number;
  sfxCueCount: number;
  musicGenerationCount: number;
}): FilmCostQuote {
  const imageUsd = Math.max(0, input.sceneImageCount) * OBSERVED_OPENAI_USD_PER_GENERATED_SCENE;
  const viduUsd = input.referenceVideoSeconds > 0 ? referenceVideoCogsUsd(input.referenceVideoSeconds) : 0;
  const exportUsd = OBSERVED_EXPORT_USD_PER_OUTPUT;
  const blobUsd =
    OBSERVED_BLOB_USD_PER_PRODUCTION +
    (Math.max(0, input.sceneImageCount) + 1) * OBSERVED_BLOB_USD_PER_ASSET;
  const engineBase = imageUsd + viduUsd + exportUsd + blobUsd;
  const retryUsd = engineBase * OBSERVED_RETRY_BUFFER_FRACTION;
  const engineUsd = engineBase + retryUsd;
  const lines: FilmCostLine[] = [];
  if (engineUsd > 0) {
    lines.push({
      id: "images_video_storage_export_retry",
      providerUsd: roundUsd(engineUsd),
      customerHc: cogsUsdToCustomerCredits(engineUsd),
    });
  }
  const voice = registryCharge("voice_generation", input.voiceLineCount);
  if (voice.hc > 0) lines.push({ id: "voice_generation", providerUsd: roundUsd(voice.usd), customerHc: voice.hc });
  const lipsyncEach = estimateLipsyncReservedUsd({
    provider: "replicate_sadtalker",
    durationSeconds: 8,
  });
  const lipsyncEntry = getActionCost("lipsync_talking_avatar");
  const lipsyncCount = Math.max(0, input.lipsyncClipCount);
  if (lipsyncCount > 0 && lipsyncEach > 0 && lipsyncEntry) {
    lines.push({
      id: "replicate_sadtalker",
      providerUsd: roundUsd(lipsyncEach * lipsyncCount),
      customerHc: lipsyncCount * usdToCredits(lipsyncEach, lipsyncEntry.minimumCreditCost),
    });
  }
  const sfx = registryCharge("sfx_generation", input.sfxCueCount);
  if (sfx.hc > 0) lines.push({ id: "sfx_generation", providerUsd: roundUsd(sfx.usd), customerHc: sfx.hc });
  const music = registryCharge("music_generation", input.musicGenerationCount);
  if (music.hc > 0) lines.push({ id: "music_generation", providerUsd: roundUsd(music.usd), customerHc: music.hc });
  return {
    lines,
    providerUsd: roundUsd(lines.reduce((sum, line) => sum + line.providerUsd, 0)),
    customerHc: lines.reduce((sum, line) => sum + line.customerHc, 0),
    includesUnexecuted: false,
  };
}

export function filmReservationDecision(state: "none" | "open" | "settled") {
  return quoteReservationDecision(state);
}

export function parseStudioFilmProject(raw: unknown): StudioFilmProjectDocument | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  if (row.version !== 1 || typeof row.title !== "string" || !Array.isArray(row.scenes)) return null;
  const scenes = row.scenes.filter((scene) => scene && typeof scene === "object").map((scene) => {
    const rowScene = scene as FilmScenePlan;
    return {
      ...rowScene,
      englishTitle: typeof rowScene.englishTitle === "string" ? rowScene.englishTitle : "",
      sourceSceneId: typeof rowScene.sourceSceneId === "string" ? rowScene.sourceSceneId : null,
    };
  });
  if (scenes.some((scene) => scene.shots?.some((shot) => shot.lipsyncsActionFootage))) return null;
  const sfxCues = Array.isArray(row.sfxCues) ? (row.sfxCues as FilmSfxCue[]) : [];
  if (sfxCues.some((cue) => !cue || typeof cue.id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(cue.id))) return null;
  return {
    version: 1,
    title: row.title,
    characterIds: Array.isArray(row.characterIds) ? row.characterIds.filter((id) => typeof id === "string") : [],
    scenes,
    sfxCues,
    subtitles: Array.isArray(row.subtitles) ? (row.subtitles as FilmSubtitleCue[]) : [],
    textOverride:
      row.textOverride && typeof row.textOverride === "object"
        ? (row.textOverride as StudioFilmProjectDocument["textOverride"])
        : null,
    logo: {
      enabled:
        !row.logo ||
        typeof row.logo !== "object" ||
        (row.logo as { enabled?: boolean }).enabled !== false,
      position: "top-right",
    },
    cta: (row.cta as StudioFilmProjectDocument["cta"]) ?? { title: "", subtitle: "", website: "" },
    export: {
      width: 720,
      height: 1280,
      videoCodec: "h264",
      audioCodec: "aac",
      subtitleMode:
        row.export &&
        typeof row.export === "object" &&
        (row.export as { subtitleMode?: string }).subtitleMode === "srt"
          ? "srt"
          : "burn_in",
      subtitleLanguage: "nl-NL",
      visualLanguage: "en",
    },
  };
}

export function embedFilmProjectInHandoff(
  handoff: Record<string, unknown>,
  project: StudioFilmProjectDocument
): Record<string, unknown> {
  return { ...handoff, [STUDIO_FILM_PROJECT_HANDOFF_KEY]: project };
}

export function readFilmProjectFromHandoff(handoff: unknown): StudioFilmProjectDocument | null {
  if (!handoff || typeof handoff !== "object" || Array.isArray(handoff)) return null;
  return parseStudioFilmProject((handoff as Record<string, unknown>)[STUDIO_FILM_PROJECT_HANDOFF_KEY]);
}

export function writeFilmProjectToHandoff(
  handoff: Record<string, unknown>,
  project: StudioFilmProjectDocument
): Record<string, unknown> | null {
  const parsed = parseStudioFilmProject(project);
  if (!parsed || parsed.version !== 1) return null;
  return embedFilmProjectInHandoff(handoff, parsed);
}

export function emptyStudioFilmProject(sceneCount = 6): StudioFilmProjectDocument {
  const count = Math.min(12, Math.max(1, Math.round(sceneCount)));
  const scenes: FilmScenePlan[] = Array.from({ length: count }, (_, index) => {
    const id = `scene-${index + 1}`;
    const durationSeconds = 8;
    return {
      id,
      order: index,
      characterId: null,
      voiceRole: "american_female",
      englishTitle: "",
      englishDialogue: "",
      dutchSubtitle: "",
      musicTrackId: null,
      durationSeconds,
      shots: composeCharacterScene({
        sceneId: id,
        characterId: id,
        durationSeconds,
        dialogueStartSeconds: 1,
        dialogueDurationSeconds: 4,
      }).map((shot) => ({ ...shot, characterId: null })),
    };
  });
  return {
    version: 1,
    title: "",
    characterIds: [],
    scenes,
    sfxCues: [],
    subtitles: [],
    logo: { enabled: true, position: "top-right" },
    cta: { title: "", subtitle: "", website: "" },
    export: {
      width: 720,
      height: 1280,
      videoCodec: "h264",
      audioCodec: "aac",
      subtitleMode: "burn_in",
      subtitleLanguage: "nl-NL",
      visualLanguage: "en",
    },
  };
}

export function updateFilmScene(
  project: StudioFilmProjectDocument,
  sceneId: string,
  patch: Partial<
    Pick<
      FilmScenePlan,
      "characterId" | "voiceRole" | "englishTitle" | "englishDialogue" | "dutchSubtitle" | "musicTrackId" | "sourceSceneId"
    >
  >
): StudioFilmProjectDocument {
  const scenes = project.scenes.map((scene) => {
    if (scene.id !== sceneId) return scene;
    const next = { ...scene, ...patch };
    return {
      ...next,
      shots: next.shots.map((shot) => ({ ...shot, characterId: next.characterId })),
    };
  });
  const characterIds = [...new Set(scenes.map((scene) => scene.characterId).filter((id): id is string => Boolean(id)))];
  const subtitles = buildDutchSubtitleTrack(scenes).cues;
  return { ...project, scenes, characterIds, subtitles };
}
