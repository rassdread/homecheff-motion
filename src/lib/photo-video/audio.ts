export const PHOTO_VIDEO_MAX_AUDIO_BYTES = 20 * 1024 * 1024;
export const PHOTO_VIDEO_MAX_AUDIO_SECONDS = 600;
export const PHOTO_VIDEO_MIN_AUDIO_SECONDS = 1;
export const PHOTO_VIDEO_DEFAULT_VOLUME = 0.85;

export const PHOTO_VIDEO_AUDIO_MIME = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/aac",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/ogg",
  "audio/webm",
  "audio/x-m4a",
  "audio/m4a",
] as const;

const AUDIO_EXTENSIONS = /\.(mp3|m4a|aac|wav|ogg|oga|webm|mp4)$/i;

export type PhotoVideoOwnMusic = {
  kind: "ownMusic";
  startSeconds: number;
  durationSeconds: number;
  trackDurationSeconds: number;
  volume: number;
  objectUrl?: string;
  fileName?: string;
  peaks?: number[];
};

export type PhotoVideoAudio = { kind: "none" } | PhotoVideoOwnMusic;

export type AudioWindow = {
  startSeconds: number;
  windowSeconds: number;
  trackDurationSeconds: number;
  maxStartSeconds: number;
  trackShorterThanVideo: boolean;
};

export type AudioFileReject = "type" | "size";

export function classifyAudioFile(file: { type: string; name: string; size: number }): "ok" | AudioFileReject {
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > PHOTO_VIDEO_MAX_AUDIO_BYTES) return "size";
  const mime = file.type.trim().toLowerCase();
  if (mime && !mime.startsWith("audio/") && mime !== "application/octet-stream") return "type";
  if (mime && PHOTO_VIDEO_AUDIO_MIME.some((allowed) => mime === allowed || mime.startsWith(`${allowed};`))) {
    return "ok";
  }
  if (mime.startsWith("audio/") || mime === "application/octet-stream" || !mime) {
    return AUDIO_EXTENSIONS.test(file.name) ? "ok" : mime.startsWith("audio/") ? "ok" : "type";
  }
  return "type";
}

export function looksLikeAudioFile(file: { type: string; name: string; size?: number }): boolean {
  return classifyAudioFile({ type: file.type, name: file.name, size: file.size ?? 1 }) === "ok";
}

export function audioWindowFor(input: {
  videoDurationSeconds: number;
  trackDurationSeconds: number;
  startSeconds: number;
}): AudioWindow {
  const video = Math.max(0, input.videoDurationSeconds);
  const track = Math.max(0, input.trackDurationSeconds);
  const trackShorterThanVideo = track > 0 && track < video;
  const windowSeconds = trackShorterThanVideo ? track : video;
  const maxStartSeconds = Math.max(0, track - windowSeconds);
  const startSeconds = Math.max(0, Math.min(maxStartSeconds, input.startSeconds));
  return {
    startSeconds,
    windowSeconds,
    trackDurationSeconds: track,
    maxStartSeconds,
    trackShorterThanVideo,
  };
}

export function clampOwnMusicToVideo(
  audio: PhotoVideoOwnMusic,
  videoDurationSeconds: number
): PhotoVideoOwnMusic {
  const window = audioWindowFor({
    videoDurationSeconds,
    trackDurationSeconds: audio.trackDurationSeconds,
    startSeconds: audio.startSeconds,
  });
  return {
    ...audio,
    startSeconds: window.startSeconds,
    durationSeconds: window.windowSeconds,
  };
}

export function setOwnMusicStart(audio: PhotoVideoOwnMusic, startSeconds: number, videoDurationSeconds: number): PhotoVideoOwnMusic {
  return clampOwnMusicToVideo({ ...audio, startSeconds }, videoDurationSeconds);
}

export function setOwnMusicVolume(audio: PhotoVideoOwnMusic, volume: number): PhotoVideoOwnMusic {
  return { ...audio, volume: Math.max(0, Math.min(1, volume)) };
}

/** Playback offset into the track at composition time. Null = silence (past end of short track). */
export function audioTrackTimeAt(input: {
  audio: PhotoVideoAudio;
  compositionTimeSeconds: number;
}): number | null {
  if (input.audio.kind !== "ownMusic") return null;
  const t = Math.max(0, input.compositionTimeSeconds);
  const trackTime = input.audio.startSeconds + t;
  if (trackTime >= input.audio.trackDurationSeconds) return null;
  return trackTime;
}

export function classifyDecodedDuration(durationSeconds: number): "ok" | "duration" {
  if (!Number.isFinite(durationSeconds)) return "duration";
  if (durationSeconds < PHOTO_VIDEO_MIN_AUDIO_SECONDS) return "duration";
  if (durationSeconds > PHOTO_VIDEO_MAX_AUDIO_SECONDS) return "duration";
  return "ok";
}

export function audioWindowPixels(input: {
  trackDurationSeconds: number;
  startSeconds: number;
  windowSeconds: number;
  width: number;
}): { x: number; width: number } {
  const track = Math.max(0, input.trackDurationSeconds);
  if (track <= 0 || input.width <= 0) return { x: 0, width: 0 };
  return {
    x: (input.startSeconds / track) * input.width,
    width: (input.windowSeconds / track) * input.width,
  };
}

export function startSecondsFromClientX(input: {
  clientX: number;
  rectLeft: number;
  rectWidth: number;
  trackDurationSeconds: number;
  grabOffsetSeconds: number;
  videoDurationSeconds: number;
}): number {
  const ratio = input.rectWidth > 0 ? (input.clientX - input.rectLeft) / input.rectWidth : 0;
  const start = ratio * Math.max(0, input.trackDurationSeconds) - input.grabOffsetSeconds;
  return audioWindowFor({
    videoDurationSeconds: input.videoDurationSeconds,
    trackDurationSeconds: input.trackDurationSeconds,
    startSeconds: start,
  }).startSeconds;
}

export function sampleWaveformPeaks(channelData: ArrayLike<number>, barCount = 160): number[] {
  const len = channelData.length;
  if (len === 0 || barCount <= 0) return [];
  const peaks: number[] = [];
  const step = len / barCount;
  for (let i = 0; i < barCount; i += 1) {
    const start = Math.floor(i * step);
    const end = Math.min(len, Math.floor((i + 1) * step));
    let max = 0;
    for (let s = start; s < end; s += 1) {
      const v = Math.abs(channelData[s] ?? 0);
      if (v > max) max = v;
    }
    peaks.push(max);
  }
  const peak = Math.max(...peaks, 0.0001);
  return peaks.map((value) => value / peak);
}
