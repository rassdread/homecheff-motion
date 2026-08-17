import {
  classifyDecodedDuration,
  sampleWaveformPeaks,
} from "@/lib/photo-video/audio";

type AudioContextCtor = typeof AudioContext;

function audioContextCtor(): AudioContextCtor {
  const fromWindow = window.AudioContext;
  if (fromWindow) return fromWindow;
  const webkit = (window as Window & { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (webkit) return webkit;
  throw new Error("decode");
}

export async function decodeOwnMusicFile(file: File): Promise<{ durationSeconds: number; peaks: number[] }> {
  const Ctx = audioContextCtor();
  const ctx = new Ctx();
  try {
    const bytes = await file.arrayBuffer();
    const audio = await ctx.decodeAudioData(bytes);
    if (classifyDecodedDuration(audio.duration) !== "ok") {
      throw new Error("duration");
    }
    const channel = audio.numberOfChannels > 0 ? audio.getChannelData(0) : new Float32Array();
    return {
      durationSeconds: audio.duration,
      peaks: sampleWaveformPeaks(channel, 160),
    };
  } catch (error) {
    if (error instanceof Error && error.message === "duration") throw error;
    throw new Error("decode");
  } finally {
    await ctx.close().catch(() => undefined);
  }
}
