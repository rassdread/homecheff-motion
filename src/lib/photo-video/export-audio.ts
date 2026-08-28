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
  if (audio.kind !== "ownMusic" && audio.kind !== "catalog") return null;
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

export type MixAudioLayer = {
  buffer: AudioBuffer;
  startSeconds: number;
  volume?: number;
};

/** Mix PCM layers on a composition-length buffer. No ducking. */
export function mixAudioLayers(
  durationSeconds: number,
  sampleRate: number,
  layers: MixAudioLayer[]
): AudioBuffer {
  const length = Math.max(1, Math.floor(Math.max(0, durationSeconds) * sampleRate));
  const channels = Math.max(1, ...layers.map((layer) => layer.buffer.numberOfChannels), 1);
  const Ctor = (layers[0]?.buffer.constructor ?? undefined) as
    | { new (channels: number, length: number, sampleRate: number): AudioBuffer }
    | undefined;
  const out =
    typeof AudioBuffer !== "undefined"
      ? new AudioBuffer({ length, numberOfChannels: channels, sampleRate })
      : new Ctor!(channels, length, sampleRate);
  for (const layer of layers) {
    const gain = Math.max(0, Math.min(1, layer.volume ?? 1));
    const start = Math.floor(layer.startSeconds * sampleRate);
    for (let ch = 0; ch < channels; ch += 1) {
      const src = layer.buffer.getChannelData(Math.min(ch, layer.buffer.numberOfChannels - 1));
      const dest = out.getChannelData(ch);
      for (let i = 0; i < src.length; i += 1) {
        const j = start + i;
        if (j >= 0 && j < length) dest[j] = Math.max(-1, Math.min(1, dest[j]! + src[i]! * gain));
      }
    }
  }
  return out;
}
