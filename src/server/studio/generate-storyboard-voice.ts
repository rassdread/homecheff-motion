import { analyzeVoiceDirector } from "@/lib/studio-voice-director";
import { buildVoiceRequest, validateVoiceSettings } from "@/lib/elevenlabs-voice";
import {
  getVoiceProfilePreset,
  normalizeStudioNarrationMode,
  normalizeStudioVoiceProfileId,
} from "@/lib/studio-voice-profiles";
import { buildSubtitleEntriesFromVoiceSegments } from "@/lib/studio-subtitle-track";
import { buildTimedSegmentsFromSpeakerLines } from "@/lib/build-speaker-voice-segments";
import {
  buildCharacterVoiceAssignments,
  buildMultiCharacterNarrationScript,
  collectStoryboardCharacters,
  resolveSpeakerSegmentsWithCharacters,
  scriptUsesSpeakerTags,
} from "@/lib/studio-character-voice";
import { buildTimedVoiceSegments } from "@/lib/studio-voice-timing-execution";
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

function serviceError(code: string, message: string, httpStatus: number): ServiceError {
  return { code, message, httpStatus };
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

    const segments = buildTimedVoiceSegments({
      storyboard: sb,
      script: report.script,
      profile: preset,
      actualDurationSeconds: synthesis.durationSeconds,
    });
    const subtitleEntries = buildSubtitleEntriesFromVoiceSegments(segments);

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

    const subtitle = await prisma.studioStoryboardSubtitleTrack.upsert({
      where: {
        storyboardId_language: { storyboardId: sb.id, language },
      },
      create: {
        storyboardId: sb.id,
        language,
        status: "ready",
        entriesJson: subtitleEntries,
      },
      update: {
        status: "ready",
        entriesJson: subtitleEntries,
      },
    });

    return {
      ok: true,
      data: {
        voiceId: updatedVoice.id,
        audioUrl: updatedVoice.audioUrl,
        durationSeconds: updatedVoice.durationSeconds,
        provider: updatedVoice.provider,
        subtitleTrackId: subtitle.id,
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

    const subtitle = await prisma.studioStoryboardSubtitleTrack.upsert({
      where: { storyboardId_language: { storyboardId: sb.id, language } },
      create: {
        storyboardId: sb.id,
        language,
        status: "ready",
        entriesJson: subtitleEntries,
      },
      update: { status: "ready", entriesJson: subtitleEntries },
    });

    return {
      ok: true,
      data: {
        voiceId: updatedVoice.id,
        audioUrl: updatedVoice.audioUrl,
        durationSeconds: updatedVoice.durationSeconds,
        provider: updatedVoice.provider,
        subtitleTrackId: subtitle.id,
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
