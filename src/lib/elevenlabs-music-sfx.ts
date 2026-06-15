/**
 * ElevenLabs music & SFX generation (V10).
 */

export type ElevenLabsMusicGenerationInput = {
  prompt: string;
  durationSeconds: number;
  instrumental?: boolean;
};

export type ElevenLabsSfxGenerationInput = {
  prompt: string;
  durationSeconds?: number;
};

export type ElevenLabsAudioGenerationResult = {
  audioBuffer: Buffer;
  durationSeconds: number;
  provider: "elevenlabs_music" | "elevenlabs_sfx" | "mock";
  providerAssetId: string;
};

function estimateMp3DurationSeconds(buffer: Buffer): number {
  const bytesPerSecond = 16_000;
  return Math.max(1, Math.round((buffer.length / bytesPerSecond) * 10) / 10);
}

function buildMockAudioBuffer(durationSeconds: number): Buffer {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const dataSize = numSamples;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate, 28);
  buffer.writeUInt16LE(8, 32);
  buffer.writeUInt16LE(8, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < numSamples; i++) {
    buffer[44 + i] = 128 + Math.sin(i / 120) * 8;
  }
  return buffer;
}

export async function generateElevenLabsMusic(
  input: ElevenLabsMusicGenerationInput
): Promise<ElevenLabsAudioGenerationResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  const duration = Math.min(60, Math.max(5, Math.round(input.durationSeconds)));
  const providerAssetId = `music_${input.prompt.slice(0, 40)}_${duration}`;

  if (!apiKey) {
    const audioBuffer = buildMockAudioBuffer(duration);
    return {
      audioBuffer,
      durationSeconds: duration,
      provider: "mock",
      providerAssetId,
    };
  }

  const res = await fetch("https://api.elevenlabs.io/v1/music", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      prompt: input.prompt,
      music_length_ms: duration * 1000,
      ...(input.instrumental === false ? {} : { force_instrumental: true }),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ElevenLabs music failed (${res.status}): ${detail.slice(0, 200)}`);
  }

  const audioBuffer = Buffer.from(await res.arrayBuffer());
  return {
    audioBuffer,
    durationSeconds: estimateMp3DurationSeconds(audioBuffer),
    provider: "elevenlabs_music",
    providerAssetId,
  };
}

export async function generateElevenLabsSfx(
  input: ElevenLabsSfxGenerationInput
): Promise<ElevenLabsAudioGenerationResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  const duration = Math.min(22, Math.max(0.5, input.durationSeconds ?? 3));
  const providerAssetId = `sfx_${input.prompt.slice(0, 40)}_${duration}`;

  if (!apiKey) {
    const audioBuffer = buildMockAudioBuffer(duration);
    return {
      audioBuffer,
      durationSeconds: duration,
      provider: "mock",
      providerAssetId,
    };
  }

  const res = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: input.prompt,
      duration_seconds: duration,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ElevenLabs SFX failed (${res.status}): ${detail.slice(0, 200)}`);
  }

  const audioBuffer = Buffer.from(await res.arrayBuffer());
  return {
    audioBuffer,
    durationSeconds: estimateMp3DurationSeconds(audioBuffer),
    provider: "elevenlabs_sfx",
    providerAssetId,
  };
}
