import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { withEstimatedCredits } from "@/server/studio-account/studio-billed-route";
import { generateStoryboardTranscript } from "@/server/studio/generate-storyboard-transcript";
import { isStudioVoiceExecutionLanguage } from "@/types/studio-voice-execution";
import {
  resolveAudioRouteIdempotencyKey,
  runAudioGenerationJobRoute,
} from "@/server/studio-generation/run-audio-generation-job-route";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id } = await context.params;

  let language: string | undefined;
  let forceMock = false;
  let clientMutationId: string | null = null;
  let confirmed = false;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      language?: string;
      mock?: boolean;
      clientMutationId?: string;
      confirmed?: boolean;
    };
    const lang = body.language?.trim().toLowerCase().slice(0, 2);
    language = lang && isStudioVoiceExecutionLanguage(lang) ? lang : undefined;
    forceMock = body.mock === true || process.env.NODE_ENV === "test";
    clientMutationId =
      typeof body.clientMutationId === "string" && body.clientMutationId.trim()
        ? body.clientMutationId.trim().slice(0, 128)
        : null;
    confirmed = body.confirmed === true;
  } catch {
    /* empty body ok */
  }

  const langKey = language ?? "auto";
  const idempotencyKey = resolveAudioRouteIdempotencyKey({
    request,
    clientMutationId,
    fallbackPrefix: `subtitle_stt:${id}:${langKey}`,
    operationFingerprint: `subtitle_transcription:${id}:${langKey}`,
  });

  return runAudioGenerationJobRoute({
    user,
    capability: "SUBTITLE_GENERATE",
    actionType: "subtitle_transcription",
    idempotencyKey,
    storyboardId: id,
    projectId: id,
    confirmed,
    inputSnapshot: {
      storyboardId: id,
      language: langKey,
      action: "subtitle_transcription",
    },
    execute: () =>
      generateStoryboardTranscript({
        storyboardId: id,
        viewer: user,
        language,
        forceProvider: forceMock ? "mock" : undefined,
      }),
    isFailure: (result) => "error" in result,
    getOutputAssetId: (result) => {
      if ("error" in result) return null;
      return result.data.subtitleTrackId;
    },
    mapFailure: (result) => {
      if ("error" in result) {
        return {
          error: result.error.message,
          code: result.error.code,
          status: result.error.httpStatus,
        };
      }
      return { error: "Transcription failed.", code: "STT_FAILED" };
    },
    mapSuccess: (result, estimatedCredits) => {
      if ("error" in result) {
        return { error: result.error.message };
      }
      return withEstimatedCredits({ ok: true, ...result.data }, estimatedCredits);
    },
  });
}
