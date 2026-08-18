import { audioTrackTimeAt, type PhotoVideoAudio } from "@/lib/photo-video/audio";

/**
 * Future catalog audio: `{ kind: "catalog", trackId, startSeconds, durationSeconds, trackDurationSeconds, volume }`
 * would reuse ownMusicExportWindow once PhotoVideoAudio includes that variant.
 * PX.4A.6.4 does not ship catalog tracks.
 */

export type OwnMusicExportWindow = {
  startSeconds: number;
  durationSeconds: number;
  volume: number;
  loops: false;
};

export function ownMusicExportWindow(
  audio: PhotoVideoAudio,
  videoDurationSeconds: number
): OwnMusicExportWindow | null {
  if (audio.kind !== "ownMusic") return null;
  const start = audio.startSeconds;
  const available = Math.max(0, audio.trackDurationSeconds - start);
  const duration = Math.min(videoDurationSeconds, available, audio.durationSeconds);
  if (duration <= 0) return null;
  return { startSeconds: start, durationSeconds: duration, volume: audio.volume, loops: false };
}

export function ownMusicIsSilentAt(audio: PhotoVideoAudio, compositionTimeSeconds: number): boolean {
  return audioTrackTimeAt({ audio, compositionTimeSeconds }) == null;
}

export function copyAudioWindow(
  source: AudioBuffer,
  startSeconds: number,
  durationSeconds: number,
  volume: number
): AudioBuffer {
  const sampleRate = source.sampleRate;
  const startSample = Math.max(0, Math.min(source.length, Math.floor(startSeconds * sampleRate)));
  const length = Math.max(1, Math.min(source.length - startSample, Math.floor(durationSeconds * sampleRate)));
  const Ctor = source.constructor as { new (channels: number, length: number, sampleRate: number): AudioBuffer };
  const out =
    typeof AudioBuffer !== "undefined"
      ? new AudioBuffer({ length, numberOfChannels: source.numberOfChannels, sampleRate })
      : new Ctor(source.numberOfChannels, length, sampleRate);
  const gain = Math.max(0, Math.min(1, volume));
  for (let ch = 0; ch < source.numberOfChannels; ch += 1) {
    const src = source.getChannelData(ch);
    const dest = out.getChannelData(ch);
    for (let i = 0; i < length; i += 1) dest[i] = src[startSample + i]! * gain;
  }
  return out;
}
