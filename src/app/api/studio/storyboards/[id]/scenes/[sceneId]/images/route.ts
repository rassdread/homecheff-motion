import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { billProviderAction } from "@/server/studio-account/bill-provider-action";
import {
  generateStudioSceneImage,
  listStudioSceneImages,
} from "@/server/studio/studio-scene-image-service";
import {
  createGenerationJob,
  runSynchronousGenerationJob,
  toStudioGenerationUiContract,
} from "@/server/studio-generation/generation-orchestrator";
import { resolveStudioGenerationIdempotencyKey } from "@/lib/studio-generation-idempotency";
import type {
  StudioSceneImageDetailResponse,
  StudioSceneImageListResponse,
} from "@/types/studio-api";

type RouteContext = { params: Promise<{ id: string; sceneId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: storyboardId, sceneId } = await context.params;
  const result = await listStudioSceneImages(storyboardId, sceneId, user);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  const body: StudioSceneImageListResponse = { images: result.images };
  return NextResponse.json(body, { status: 200 });
}

export async function POST(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id: storyboardId, sceneId } = await context.params;
  let confirmed = false;
  let clientMutationId: string | null = null;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      confirmed?: boolean;
      clientMutationId?: string;
    };
    confirmed = body.confirmed === true;
    clientMutationId =
      typeof body.clientMutationId === "string" && body.clientMutationId.trim() ?
        body.clientMutationId.trim().slice(0, 128)
      : null;
  } catch {
    /* empty body ok */
  }

  const idempotencyKey = resolveStudioGenerationIdempotencyKey({
    headerKey: request.headers.get("idempotency-key"),
    clientMutationId,
    fallbackPrefix: `scene_image:${storyboardId}:${sceneId}`,
    operationFingerprint: `scene_image:${storyboardId}:${sceneId}`,
  });

  const created = await createGenerationJob({
    ownerId: user.id,
    idempotencyKey,
    capability: "IMAGE_GENERATE",
    storyboardId,
    sceneId,
    inputSnapshot: {
      storyboardId,
      sceneId,
      action: "scene_image_generate",
    },
  });

  if (created.kind === "replay" && created.job.status === "succeeded" && created.job.outputAssetId) {
    return NextResponse.json(
      {
        image: { id: created.job.outputAssetId },
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
        actionType: "scene_generation",
        projectId: storyboardId,
        confirmed,
        relatedJobId: created.job.id,
        execute: () => generateStudioSceneImage(storyboardId, sceneId, user),
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
        result,
        creditsCharged: billed.billing.captured ? (billed.billing.estimatedCredits ?? 0) : 0,
        outputAssetId: result.image.id,
      };
    },
  });

  if (!run.ok) {
    return NextResponse.json(
      {
        error: run.job.errorMessageSafe || "Generation failed.",
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
        image: { id: run.job.outputAssetId },
        generationJob: toStudioGenerationUiContract(run.job),
        replay: true,
      },
      { status: 200 }
    );
  }

  const body: StudioSceneImageDetailResponse & {
    generationJob: ReturnType<typeof toStudioGenerationUiContract>;
  } = {
    image: run.result.image,
    generationJob: toStudioGenerationUiContract(run.job),
  };
  return NextResponse.json(body, { status: 201 });
}
