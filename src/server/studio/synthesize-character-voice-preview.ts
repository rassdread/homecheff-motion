import { randomUUID } from "node:crypto";
import {
  buildVoiceRequest,
  ELEVENLABS_VOICE_LIBRARY_ACCESS_DENIED_CODE,
  ELEVENLABS_VOICE_LIBRARY_ACCESS_DENIED_EN,
  ElevenLabsVoiceAccessDeniedError,
  resolveElevenLabsVoiceId,
  validateVoiceSettings,
} from "@/lib/elevenlabs-voice";
import { defaultCharacterVoicePreviewLine } from "@/lib/studio-character-voice";
import { inferVoicePreviewType } from "@/lib/studio-voice-preview-cache-key";
import { estimateElevenLabsTtsCostUsd } from "@/lib/studio-cost-estimates";
import { getVoiceProfilePreset } from "@/lib/studio-voice-profiles";
import { validateVoiceProfileForSynthesis } from "@/lib/studio-voice-profile-ref";
import type { VoicePreviewType } from "@/types/studio-voice-preview-cache";
import { selectVoiceProvider } from "@/server/studio/voice/voice-provider";
import { uploadStoryboardVoiceAudio } from "@/server/studio/studio-voice-blob";
import {
  lookupVoicePreviewCache,
  storeVoicePreviewCache,
} from "@/server/studio/studio-voice-preview-cache";
import type { ServiceError } from "@/server/studio/studio-storyboard-service";
import {
  buildVoicePreviewDedupHash,
  meterElevenLabsTts,
  meterVoicePreviewCacheHit,
  type StudioCostFeature,
} from "@/server/provider-cost/studio-cost-metering";

function serviceError(code: string, message: string, httpStatus: number): ServiceError {
  return { code, message, httpStatus };
}

export type CharacterVoicePreviewSynthesisInput = {
  ownerId: string;
  characterName: string;
  voiceProfile: string;
  language: string;
  sampleLine?: string;
  /** Blob path scope — character id or draft id */
  storageAssetId: string;
  storageStoryboardId: string;
  previewType?: VoicePreviewType;
};

export type CharacterVoicePreviewSynthesisResult =
  | {
      ok: true;
      audioUrl: string;
      durationSeconds: number;
      provider: string;
      script: string;
      voiceProfile: string;
      language: string;
      cacheHit: boolean;
    }
  | { error: ServiceError };

export function resolveCharacterVoicePreviewScript(params: {
  characterName: string;
  language: string;
  sampleLine?: string;
}): string {
  const language = params.language.trim().toLowerCase().slice(0, 2);
  const trimmed = params.sampleLine?.trim();
  if (trimmed) {
    return trimmed.slice(0, 500);
  }
  const name = params.characterName.trim() || "Character";
  return defaultCharacterVoicePreviewLine(name, language);
}

function resolvePreviewCostFeature(storageStoryboardId: string): StudioCostFeature {
  if (storageStoryboardId.startsWith("character-draft-")) {
    return "voice_preview_draft";
  }
  return "voice_preview_character";
}

function resolveProviderVoiceId(voiceProfile: string, providerId: string): string {
  if (providerId === "mock") {
    return "mock-voice";
  }
  return resolveElevenLabsVoiceId(voiceProfile);
}

export async function synthesizeCharacterVoicePreview(
  input: CharacterVoicePreviewSynthesisInput
): Promise<CharacterVoicePreviewSynthesisResult> {
  const language = input.language.trim().toLowerCase().slice(0, 2) || "en";
  const profileValidation = validateVoiceProfileForSynthesis(input.voiceProfile || "warm_narrator");
  if (!profileValidation.ok) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[voice-preview] blocked synthesis:", profileValidation.code, input.voiceProfile);
    }
    return {
      error: serviceError(profileValidation.code, profileValidation.message, 400),
    };
  }
  const voiceProfile = profileValidation.voiceProfile;
  const defaultLine = defaultCharacterVoicePreviewLine(
    input.characterName.trim() || "Character",
    language
  );
  const script = resolveCharacterVoicePreviewScript({
    characterName: input.characterName,
    language,
    sampleLine: input.sampleLine,
  });

  if (!script.trim()) {
    return {
      error: serviceError("SAMPLE_LINE_REQUIRED", "Enter preview text before listening.", 400),
    };
  }

  const preset = getVoiceProfilePreset(voiceProfile);
  const validation = validateVoiceSettings({
    voiceEnabled: true,
    voiceLanguage: language,
    voiceProfile,
    narrationMode: "narrator",
    script,
  });
  if (!validation.ok) {
    return { error: serviceError(validation.code, validation.message, 400) };
  }

  const request = buildVoiceRequest({
    script,
    voiceProfile,
    voiceLanguage: language,
    narrationMode: "narrator",
    preset,
  });

  const provider = selectVoiceProvider();
  const modelId = request.model_id;
  const providerVoiceId = resolveProviderVoiceId(voiceProfile, provider.id);
  const previewType =
    input.previewType ??
    inferVoicePreviewType({
      sampleLine: input.sampleLine,
      defaultLine,
    });
  const costFeature = resolvePreviewCostFeature(input.storageStoryboardId);
  const meteringCtx = {
    userId: input.ownerId,
    storyboardId: input.storageStoryboardId,
    feature: costFeature,
    relatedJobId: input.storageAssetId,
  };

  if (provider.id === "elevenlabs") {
    const cached = await lookupVoicePreviewCache({
      voiceId: providerVoiceId,
      previewText: script,
      language,
      modelId,
    });
    if (cached) {
      const estimatedCostSavedUsd = estimateElevenLabsTtsCostUsd({
        characterCount: script.length,
        modelId,
      });
      meterVoicePreviewCacheHit({
        ctx: meteringCtx,
        voiceId: providerVoiceId,
        previewDedupHash: cached.cacheKey,
        previewType,
        language,
        modelId,
        estimatedCostSavedUsd,
        previewTextLength: script.length,
      });
      return {
        ok: true,
        audioUrl: cached.audioUrl,
        durationSeconds: Math.max(1, script.length / 14),
        provider: "elevenlabs",
        script,
        voiceProfile,
        language,
        cacheHit: true,
      };
    }
  }

  try {
    const synthesis = await provider.synthesize({
      request,
      voiceProfile,
      voiceLanguage: language,
    });

    if (synthesis.provider === "elevenlabs") {
      meterElevenLabsTts({
        ctx: meteringCtx,
        status: "completed",
        providerId: synthesis.provider,
        voiceId: synthesis.providerVoiceId,
        characterCount: request.metadata.estimatedCharacters,
        modelId: synthesis.providerModelId,
        language,
        previewText: script,
      });

      const stored = await storeVoicePreviewCache({
        voiceId: synthesis.providerVoiceId,
        previewText: script,
        language,
        modelId: synthesis.providerModelId,
        provider: synthesis.provider,
        previewType,
        audioBuffer: synthesis.audioBuffer,
        contentType: "audio/mpeg",
      });

      return {
        ok: true,
        audioUrl: stored.audioUrl,
        durationSeconds: synthesis.durationSeconds,
        provider: synthesis.provider,
        script,
        voiceProfile,
        language,
        cacheHit: false,
      };
    }

    const contentType = synthesis.provider === "mock" ? "audio/wav" : "audio/mpeg";
    const uploaded = await uploadStoryboardVoiceAudio({
      ownerId: input.ownerId,
      storyboardId: input.storageStoryboardId,
      language: `preview-${language}`,
      voiceAssetId: input.storageAssetId,
      audioBuffer: synthesis.audioBuffer,
      contentType,
    });
    return {
      ok: true,
      audioUrl: uploaded.audioUrl,
      durationSeconds: synthesis.durationSeconds,
      provider: synthesis.provider,
      script,
      voiceProfile,
      language,
      cacheHit: false,
    };
  } catch (err) {
    if (err instanceof ElevenLabsVoiceAccessDeniedError) {
      return {
        error: serviceError(
          ELEVENLABS_VOICE_LIBRARY_ACCESS_DENIED_CODE,
          ELEVENLABS_VOICE_LIBRARY_ACCESS_DENIED_EN,
          403
        ),
      };
    }
    const message = err instanceof Error ? err.message : "Voice preview failed.";
    return { error: serviceError("VOICE_PREVIEW_FAILED", message, 502) };
  }
}

export function draftCharacterVoicePreviewStorageIds(ownerId: string): {
  storageStoryboardId: string;
  storageAssetId: string;
} {
  return {
    storageStoryboardId: `character-draft-${ownerId}`,
    storageAssetId: randomUUID(),
  };
}

/** Exported for tests — builds the dedup hash used by cache + metering. */
export function voicePreviewCacheKeyForTest(params: {
  voiceId: string;
  previewText: string;
  language: string;
  modelId: string;
}): string {
  return buildVoicePreviewDedupHash(params);
}
