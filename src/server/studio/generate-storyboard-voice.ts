import { analyzeVoiceDirector } from "@/lib/studio-voice-director";
import { buildVoiceRequest, validateVoiceSettings } from "@/lib/elevenlabs-voice";
import {
  getVoiceProfilePreset,
  normalizeStudioNarrationMode,
} from "@/lib/studio-voice-profiles";
import { buildSubtitleEntriesFromVoiceSegments, parseSubtitleEntriesJson } from "@/lib/studio-subtitle-track";
import { buildTimedSegmentsFromSpeakerLines } from "@/lib/build-speaker-voice-segments";
import { canReplaceSubtitleTrack, spokenNarrationSubtitle } from "@/lib/studio-narration-playback";
import {
  buildCharacterVoiceAssignments,
  buildMultiCharacterNarrationScript,
  collectStoryboardCharacters,
  resolveSpeakerSegmentsWithCharacters,
  scriptUsesSpeakerTags,
} from "@/lib/studio-character-voice";
import { concatVoiceSegmentBuffers } from "@/server/studio/studio-voice-audio-merge";
import {
  isStudioVoiceExecutionLanguage,
  type StudioVoiceExecutionLanguage,
} from "@/types/studio-voice-execution";
import { prisma } from "@/lib/prisma";
import { selectVoiceProvider } from "@/server/studio/voice/voice-provider";
import { uploadStoryboardVoiceAudio } from "@/server/studio/studio-voice-blob";
import type { StudioStoryboardDetail } from "@/types/studio-api";
import type { ServiceError } from "@/server/studio/studio-storyboard-service";
import { meterElevenLabsTts } from "@/server/provider-cost/studio-cost-metering";

function serviceError(code: string, message: string, httpStatus: number): ServiceError {
  return { code, message, httpStatus };
}

async function saveSpokenSubtitle(params: {
  storyboardId: string;
  language: string;
  entries: Array<{ start: number; end: number; text: string }>;
}): Promise<string> {
  const existing = await prisma.studioStoryboardSubtitleTrack.findUnique({
    where: { storyboardId_language: { storyboardId: params.storyboardId, language: params.language } },
    select: { id: true, entriesJson: true },
  });
  const existingTexts = existing ? parseSubtitleEntriesJson(existing.entriesJson).map((entry) => entry.text) : [];
  if (!canReplaceSubtitleTrack(existingTexts, params.entries.map((entry) => entry.text))) {
    return existing?.id ?? "";
  }
  const saved = await prisma.studioStoryboardSubtitleTrack.upsert({
    where: { storyboardId_language: { storyboardId: params.storyboardId, language: params.language } },
    create: {
      storyboardId: params.storyboardId,
      language: params.language,
      status: "draft",
      entriesJson: params.entries,
    },
    update: { status: "draft", entriesJson: params.entries },
  });
  return saved.id;
}

export type GenerateStoryboardVoiceResult = {
  voiceId: string;
  audioUrl: string;
  durationSeconds: number;
  provider: string;
  subtitleTrackId: string;
};

export async function generateStoryboardVoice(params: {
  storyboard: StudioStoryboardDetail;
  ownerId: string;
  language?: string;
  forceProvider?: "mock" | "elevenlabs";
}): Promise<{ ok: true; data: GenerateStoryboardVoiceResult } | { error: ServiceError }> {
  const sb = params.storyboard;
  if (!sb.voiceEnabled) {
    return {
      error: serviceError("VOICE_DISABLED", "Enable voice on the storyboard first.", 400),
    };
  }

  const languageRaw = (params.language ?? sb.voiceLanguage ?? "en").trim().toLowerCase().slice(0, 2);
  const language: StudioVoiceExecutionLanguage = isStudioVoiceExecutionLanguage(languageRaw)
    ? languageRaw
    : "en";

  const report = analyzeVoiceDirector(sb);
  const characters = collectStoryboardCharacters(sb);
  const assignments = buildCharacterVoiceAssignments(sb, language);
  const savedScript = sb.voiceNarrationScript?.trim() ?? "";
  const useMultiCharacter =
    assignments.length >= 2 ||
    (assignments.length >= 1 && scriptUsesSpeakerTags(savedScript));

  if (useMultiCharacter) {
    return generateMultiCharacterStoryboardVoice({
      storyboard: sb,
      ownerId: params.ownerId,
      language,
      report,
      forceProvider: params.forceProvider,
      script:
        savedScript && scriptUsesSpeakerTags(savedScript)
          ? savedScript
          : buildMultiCharacterNarrationScript(sb, language),
    });
  }

  const validation = validateVoiceSettings({
    voiceEnabled: true,
    voiceLanguage: language,
    voiceProfile: report.voiceProfile,
    narrationMode: report.narrationMode,
    script: report.script.fullNarration,
  });
  if (!validation.ok) {
    return {
      error: serviceError(validation.code, validation.message, 400),
    };
  }

  const preset = getVoiceProfilePreset(report.voiceProfile);
  const request = buildVoiceRequest({
    script: report.script.fullNarration,
    voiceProfile: report.voiceProfile,
    voiceLanguage: language,
    narrationMode: report.narrationMode,
    preset,
  });

  const voiceRow = await prisma.studioStoryboardVoice.upsert({
    where: {
      storyboardId_language: { storyboardId: sb.id, language },
    },
    create: {
      storyboardId: sb.id,
      language,
      provider: "queued",
      voiceProfile: report.voiceProfile,
      voiceStyle: report.voiceStyle,
      status: "generating",
    },
    update: {
      status: "generating",
      errorMessage: "",
      voiceProfile: report.voiceProfile,
      voiceStyle: report.voiceStyle,
    },
  });

  try {
    const provider = selectVoiceProvider(params.forceProvider);
    const synthesis = await provider.synthesize({
      request,
      voiceProfile: report.voiceProfile,
      voiceLanguage: language,
    });
    meterElevenLabsTts({
      ctx: {
        userId: params.ownerId,
        storyboardId: sb.id,
        feature: "voice_narration",
        relatedJobId: voiceRow.id,
      },
      status: "completed",
      providerId: synthesis.provider,
      voiceId: synthesis.providerVoiceId,
      characterCount: request.metadata.estimatedCharacters,
      modelId: synthesis.providerModelId,
      language,
    });

    const contentType =
      synthesis.provider === "mock" ? "audio/wav" : "audio/mpeg";
    const uploaded = await uploadStoryboardVoiceAudio({
      ownerId: params.ownerId,
      storyboardId: sb.id,
      language,
      voiceAssetId: voiceRow.id,
      audioBuffer: synthesis.audioBuffer,
      contentType,
    });

    const generatedAt = new Date();
    const updatedVoice = await prisma.studioStoryboardVoice.update({
      where: { id: voiceRow.id },
      data: {
        provider: synthesis.provider,
        audioUrl: uploaded.audioUrl,
        storageKey: uploaded.storageKey,
        durationSeconds: synthesis.durationSeconds,
        status: "completed",
        providerVoiceId: synthesis.providerVoiceId,
        providerModelId: synthesis.providerModelId,
        providerMetadata: synthesis.providerMetadata as object,
        generatedAt,
      },
    });

    const subtitleTrackId = await saveSpokenSubtitle({
      storyboardId: sb.id,
      language,
      entries: spokenNarrationSubtitle(report.script.fullNarration, synthesis.durationSeconds),
    });

    return {
      ok: true,
      data: {
        voiceId: updatedVoice.id,
        audioUrl: updatedVoice.audioUrl,
        durationSeconds: updatedVoice.durationSeconds,
        provider: updatedVoice.provider,
        subtitleTrackId,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Voice generation failed.";
    await prisma.studioStoryboardVoice.update({
      where: { id: voiceRow.id },
      data: { status: "failed", errorMessage: message.slice(0, 500) },
    });
    return { error: serviceError("VOICE_GENERATION_FAILED", message, 502) };
  }
}

async function generateMultiCharacterStoryboardVoice(params: {
  storyboard: StudioStoryboardDetail;
  ownerId: string;
  language: StudioVoiceExecutionLanguage;
  report: ReturnType<typeof analyzeVoiceDirector>;
  script: string;
  forceProvider?: "mock" | "elevenlabs";
}): Promise<{ ok: true; data: GenerateStoryboardVoiceResult } | { error: ServiceError }> {
  const { storyboard: sb, language, report } = params;
  const characters = collectStoryboardCharacters(sb);
  const speakerLines = resolveSpeakerSegmentsWithCharacters({
    script: params.script,
    characters,
    storyboardLanguage: language,
    fallbackVoiceProfile: report.voiceProfile,
  });
  if (speakerLines.length === 0) {
    return {
      error: serviceError("VOICE_SCRIPT_EMPTY", "No speaker lines found for multi-voice generation.", 400),
    };
  }

  const voiceRow = await prisma.studioStoryboardVoice.upsert({
    where: { storyboardId_language: { storyboardId: sb.id, language } },
    create: {
      storyboardId: sb.id,
      language,
      provider: "queued",
      voiceProfile: report.voiceProfile,
      voiceStyle: report.voiceStyle,
      status: "generating",
    },
    update: {
      status: "generating",
      errorMessage: "",
      voiceProfile: report.voiceProfile,
      voiceStyle: report.voiceStyle,
    },
  });

  try {
    const provider = selectVoiceProvider(params.forceProvider);
    const buffers: Buffer[] = [];
    const durations: number[] = [];

    for (const line of speakerLines) {
      const preset = getVoiceProfilePreset(line.voiceProfile);
      const request = buildVoiceRequest({
        script: line.text,
        voiceProfile: line.voiceProfile,
        voiceLanguage: language,
        narrationMode: "narrator",
        preset,
      });
      const synthesis = await provider.synthesize({
        request,
        voiceProfile: line.voiceProfile,
        voiceLanguage: language,
      });
      meterElevenLabsTts({
        ctx: {
          userId: params.ownerId,
          storyboardId: sb.id,
          feature: "voice_narration_multi",
          relatedJobId: voiceRow.id,
        },
        status: "completed",
        providerId: synthesis.provider,
        voiceId: synthesis.providerVoiceId,
        characterCount: request.metadata.estimatedCharacters,
        modelId: synthesis.providerModelId,
        language,
      });
      buffers.push(synthesis.audioBuffer);
      durations.push(synthesis.durationSeconds);
    }

    const contentType = provider.id === "mock" ? "audio/wav" : "audio/mpeg";
    const merged = await concatVoiceSegmentBuffers(buffers, contentType);
    const segments = buildTimedSegmentsFromSpeakerLines(speakerLines, durations);
    const subtitleEntries = buildSubtitleEntriesFromVoiceSegments(segments);

    const uploaded = await uploadStoryboardVoiceAudio({
      ownerId: params.ownerId,
      storyboardId: sb.id,
      language,
      voiceAssetId: voiceRow.id,
      audioBuffer: merged.audioBuffer,
      contentType,
    });

    const updatedVoice = await prisma.studioStoryboardVoice.update({
      where: { id: voiceRow.id },
      data: {
        provider: provider.id,
        audioUrl: uploaded.audioUrl,
        storageKey: uploaded.storageKey,
        durationSeconds: merged.durationSeconds,
        status: "completed",
        providerMetadata: { multiCharacter: true, speakerCount: speakerLines.length } as object,
        generatedAt: new Date(),
      },
    });

    const subtitleTrackId = await saveSpokenSubtitle({
      storyboardId: sb.id,
      language,
      entries: subtitleEntries,
    });

    return {
      ok: true,
      data: {
        voiceId: updatedVoice.id,
        audioUrl: updatedVoice.audioUrl,
        durationSeconds: updatedVoice.durationSeconds,
        provider: updatedVoice.provider,
        subtitleTrackId,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Multi-voice generation failed.";
    await prisma.studioStoryboardVoice.update({
      where: { id: voiceRow.id },
      data: { status: "failed", errorMessage: message.slice(0, 500) },
    });
    return { error: serviceError("VOICE_GENERATION_FAILED", message, 502) };
  }
}
