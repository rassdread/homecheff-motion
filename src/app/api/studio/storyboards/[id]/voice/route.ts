import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { billProviderAction } from "@/server/studio-account/bill-provider-action";
import { parseSubtitleEntriesJson } from "@/lib/studio-subtitle-track";
import { resolveStudioGenerationIdempotencyKey } from "@/lib/studio-generation-idempotency";
import { generateStoryboardVoice } from "@/server/studio/generate-storyboard-voice";
import { getStudioStoryboardById } from "@/server/studio/studio-storyboard-service";
import {
  createGenerationJob,
  runSynchronousGenerationJob,
  toStudioGenerationUiContract,
} from "@/server/studio-generation/generation-orchestrator";
import { prisma } from "@/lib/prisma";
import { isStudioVoiceExecutionLanguage } from "@/types/studio-voice-execution";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }
  const { id } = await context.params;
  const storyboard = await getStudioStoryboardById(id, user);
  if (!storyboard) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const lang = (storyboard.voiceLanguage ?? "en").trim().toLowerCase().slice(0, 2);
  const [voice, subtitle, allVoices] = await Promise.all([
    prisma.studioStoryboardVoice.findUnique({
      where: { storyboardId_language: { storyboardId: id, language: lang } },
    }),
    prisma.studioStoryboardSubtitleTrack.findUnique({
      where: { storyboardId_language: { storyboardId: id, language: lang } },
    }),
    prisma.studioStoryboardVoice.findMany({
      where: { storyboardId: id },
      orderBy: { language: "asc" },
    }),
  ]);
  return NextResponse.json({
    voice,
    subtitle: subtitle
      ? {
          ...subtitle,
          entries: parseSubtitleEntriesJson(subtitle.entriesJson),
        }
      : null,
    voices: allVoices,
  });
}

export async function POST(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }
  const { id } = await context.params;
  const storyboard = await getStudioStoryboardById(id, user);
  if (!storyboard) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (storyboard.ownerId !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let language: string | undefined;
  let forceMock = false;
  let confirmed = false;
  let clientMutationId: string | null = null;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      language?: string;
      mock?: boolean;
      confirmed?: boolean;
      clientMutationId?: string;
    };
    language = body.language?.trim().toLowerCase().slice(0, 2);
    forceMock = body.mock === true || process.env.NODE_ENV === "test";
    confirmed = body.confirmed === true;
    clientMutationId =
      typeof body.clientMutationId === "string" && body.clientMutationId.trim() ?
        body.clientMutationId.trim().slice(0, 128)
      : null;
  } catch {
    /* empty body ok */
  }

  const storyboardLang = (storyboard.voiceLanguage ?? "en").trim().toLowerCase().slice(0, 2);
  const frozenLanguage =
    language && isStudioVoiceExecutionLanguage(language) ? language
    : isStudioVoiceExecutionLanguage(storyboardLang) ? storyboardLang
    : "en";

  const idempotencyKey = resolveStudioGenerationIdempotencyKey({
    headerKey: request.headers.get("idempotency-key"),
    clientMutationId,
    fallbackPrefix: `voice_tts:${id}:${frozenLanguage}`,
    operationFingerprint: `voice_tts:${id}:${frozenLanguage}`,
  });

  const created = await createGenerationJob({
    ownerId: user.id,
    idempotencyKey,
    capability: "VOICE_TTS",
    storyboardId: id,
    sceneId: null,
    inputSnapshot: {
      storyboardId: id,
      language: frozenLanguage,
      action: "voice_tts",
      scope: "project",
    },
  });

  if (created.kind === "replay" && created.job.status === "succeeded" && created.job.outputAssetId) {
    return NextResponse.json(
      {
        ok: true,
        voiceId: created.job.outputAssetId,
        generationJob: toStudioGenerationUiContract(created.job),
        replay: true,
      },
      { status: 200 }
    );
  }

  if (created.kind === "resumed" && created.job.status === "generating") {
    return NextResponse.json(
      {
        error: "A generation with this request is already in progress.",
        code: "CONFLICT",
        generationJob: toStudioGenerationUiContract(created.job),
      },
      { status: 409 }
    );
  }

  const run = await runSynchronousGenerationJob({
    job: created.job,
    executeBilled: async () => {
      const billed = await billProviderAction({
        user,
        actionType: "voice_generation",
        projectId: id,
        confirmed,
        relatedJobId: created.job.id,
        execute: () =>
          generateStoryboardVoice({
            storyboard,
            ownerId: storyboard.ownerId,
            language: frozenLanguage,
            forceProvider: forceMock ? "mock" : undefined,
          }),
        isFailure: (result) => "error" in result,
      });

      if ("blocked" in billed) {
        const payload = await billed.blocked.clone().json().catch(() => ({}));
        const code =
          typeof payload === "object" && payload && "code" in payload ?
            String((payload as { code?: string }).code)
          : "";
        return {
          ok: false as const,
          errorCode:
            code === "free_account_provider_action" ||
            code === "insufficient_credits" ||
            code === "insufficient_balance" ?
              ("INSUFFICIENT_CREDITS" as const)
            : ("PROVIDER_REJECTED" as const),
          safeMessage:
            typeof payload === "object" && payload && "error" in payload ?
              String((payload as { error?: string }).error)
            : undefined,
        };
      }

      const result = billed.result;
      if ("error" in result) {
        return {
          ok: false as const,
          errorCode: "PROVIDER_REJECTED" as const,
          safeMessage: result.error.message,
        };
      }

      return {
        ok: true as const,
        result: result.data,
        creditsCharged: billed.billing.captured ? (billed.billing.estimatedCredits ?? 0) : 0,
        outputAssetId: result.data.voiceId,
      };
    },
  });

  if (!run.ok) {
    return NextResponse.json(
      {
        error: run.job.errorMessageSafe || "Voice generation failed.",
        code: run.errorCode,
        generationJob: toStudioGenerationUiContract(run.job),
        creditGate: run.errorCode === "INSUFFICIENT_CREDITS",
      },
      { status: run.errorCode === "INSUFFICIENT_CREDITS" ? 403 : 500 }
    );
  }

  if (run.replay) {
    return NextResponse.json(
      {
        ok: true,
        voiceId: run.job.outputAssetId,
        generationJob: toStudioGenerationUiContract(run.job),
        replay: true,
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      ...run.result,
      generationJob: toStudioGenerationUiContract(run.job),
    },
    { status: 200 }
  );
}
