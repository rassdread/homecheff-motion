import {
  buildProviderAudioCacheKey,
  findLibraryCacheMatch,
} from "@/lib/studio-provider-audio-cache";
import {
  generateElevenLabsMusic,
  generateElevenLabsSfx,
} from "@/lib/elevenlabs-music-sfx";
import { listUserAudioLibraryAssets, uploadUserAudioLibraryAsset } from "@/server/studio/studio-user-audio-library-blob";
import { registerAudioAssetInLibrary } from "@/server/studio/library-consistency-hooks";
import type { UserAudioLibraryAsset } from "@/types/studio-user-audio-library";

export type GenerateStudioAudioResult =
  | {
      ok: true;
      asset: UserAudioLibraryAsset;
      cacheHit: boolean;
      provider: string;
      providerAssetId: string;
    }
  | { ok: false; error: string; code: string };

export async function generateStudioMusicAsset(input: {
  ownerId: string;
  prompt: string;
  genre: string;
  mood: string;
  durationSeconds: number;
  instrumental?: boolean;
  name?: string;
}): Promise<GenerateStudioAudioResult> {
  const prompt = input.prompt.trim() || `${input.mood} ${input.genre} instrumental`;
  const cacheKey = buildProviderAudioCacheKey({
    kind: "music",
    prompt,
    provider: "elevenlabs_music",
    genre: input.genre,
    mood: input.mood,
  });

  const library = await listUserAudioLibraryAssets(input.ownerId);
  const cached = findLibraryCacheMatch(library, {
    kind: "music",
    prompt,
    mood: input.mood,
  });
  if (cached.hit) {
    return {
      ok: true,
      asset: cached.asset,
      cacheHit: true,
      provider: "library",
      providerAssetId: cacheKey,
    };
  }

  try {
    const generated = await generateElevenLabsMusic({
      prompt,
      durationSeconds: input.durationSeconds,
      instrumental: input.instrumental ?? true,
    });
    const asset = await uploadUserAudioLibraryAsset({
      ownerId: input.ownerId,
      kind: "music",
      name: input.name?.trim() || `${input.mood} ${input.genre}`,
      category: input.genre,
      mood: input.mood,
      energy: "medium",
      audioBuffer: generated.audioBuffer,
      contentType: "audio/mpeg",
      extension: "mp3",
      durationSeconds: generated.durationSeconds,
    });
    await registerAudioAssetInLibrary({
      ownerId: input.ownerId,
      createdBy: input.ownerId,
      assetId: asset.id,
      assetName: asset.name,
      audioUrl: asset.audioUrl,
      storageKey: asset.storageKey,
      generationType: "music",
    });
    return {
      ok: true,
      asset,
      cacheHit: false,
      provider: generated.provider,
      providerAssetId: cacheKey,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Music generation failed",
      code: "MUSIC_GENERATION_FAILED",
    };
  }
}

export async function generateStudioSfxAsset(input: {
  ownerId: string;
  prompt: string;
  category: string;
  durationSeconds?: number;
  name?: string;
  sceneLabel?: string;
}): Promise<GenerateStudioAudioResult> {
  const prompt =
    input.prompt.trim() ||
    `${input.category} sound effect${input.sceneLabel ? ` for ${input.sceneLabel}` : ""}`;
  const cacheKey = buildProviderAudioCacheKey({
    kind: "sfx",
    prompt,
    provider: "elevenlabs_sfx",
    sfxCategory: input.category,
  });

  const library = await listUserAudioLibraryAssets(input.ownerId);
  const cached = findLibraryCacheMatch(library, {
    kind: "sfx",
    prompt,
    category: input.category,
  });
  if (cached.hit) {
    return {
      ok: true,
      asset: cached.asset,
      cacheHit: true,
      provider: "library",
      providerAssetId: cacheKey,
    };
  }

  try {
    const generated = await generateElevenLabsSfx({
      prompt,
      durationSeconds: input.durationSeconds ?? 3,
    });
    const asset = await uploadUserAudioLibraryAsset({
      ownerId: input.ownerId,
      kind: "sfx",
      name: input.name?.trim() || `${input.category} SFX`,
      category: input.category,
      mood: "neutral",
      energy: "medium",
      audioBuffer: generated.audioBuffer,
      contentType: "audio/mpeg",
      extension: "mp3",
      durationSeconds: generated.durationSeconds,
    });
    await registerAudioAssetInLibrary({
      ownerId: input.ownerId,
      createdBy: input.ownerId,
      assetId: asset.id,
      assetName: asset.name,
      audioUrl: asset.audioUrl,
      storageKey: asset.storageKey,
      generationType: "sfx",
    });
    return {
      ok: true,
      asset,
      cacheHit: false,
      provider: generated.provider,
      providerAssetId: cacheKey,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "SFX generation failed",
      code: "SFX_GENERATION_FAILED",
    };
  }
}
