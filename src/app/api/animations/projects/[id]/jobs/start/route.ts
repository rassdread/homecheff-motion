import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { getAnimationProjectByIdForOwner } from "@/server/animation-projects/queries";
import { resolveStudioGenerationIdempotencyKey } from "@/lib/studio-generation-idempotency";
import {
  beginAsyncGenerationJob,
  createGenerationJob,
  failGenerationJob,
  toStudioGenerationUiContract,
} from "@/server/studio-generation/generation-orchestrator";
import { createViduMotionAdapter } from "@/server/studio-generation/vidu-motion-adapter";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Accept video/motion generation quickly: create canonical GenerationJob, start provider, return job id.
 * Does not hold the HTTP request open for the full Vidu generation.
 * Credits for motion_render are charged at Motion project create — this job tracks execution only
 * and must not create a second charge.
 */
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }
  const project = await getAnimationProjectByIdForOwner(id, user.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  let clientMutationId: string | null = null;
  try {
    const body = (await request.json().catch(() => ({}))) as { clientMutationId?: string };
    clientMutationId =
      typeof body.clientMutationId === "string" && body.clientMutationId.trim() ?
        body.clientMutationId.trim().slice(0, 128)
      : null;
  } catch {
    /* empty ok */
  }

  const idempotencyKey = resolveStudioGenerationIdempotencyKey({
    headerKey: request.headers.get("idempotency-key"),
    clientMutationId,
    fallbackPrefix: `video_generate:${id}`,
    operationFingerprint: `video_generate:${id}`,
  });

  const created = await createGenerationJob({
    ownerId: user.id,
    idempotencyKey,
    capability: "VIDEO_GENERATE",
    storyboardId: project.studioSourceStoryboardId ?? null,
    sceneId: null,
    inputSnapshot: {
      animationProjectId: id,
      studioSourceStoryboardId: project.studioSourceStoryboardId ?? null,
      action: "video_generate",
      scope: "project",
      billingNote: "motion_render charged at project create; job tracks execution",
    },
  });

  if (created.kind === "replay" || (created.kind === "resumed" && created.job.providerJobId)) {
    return NextResponse.json(
      {
        projectId: id,
        generationJob: toStudioGenerationUiContract(created.job),
        resumed: created.kind !== "replay",
        replay: created.kind === "replay",
      },
      { status: 200 }
    );
  }

  try {
    const adapter = createViduMotionAdapter();
    const started = await adapter.start({
      generationJobId: created.job.id,
      idempotencyKey,
      payload: { animationProjectId: id },
    });
    const providerJobId = started.providerJobId ?? `motion_project:${id}`;
    const job = await beginAsyncGenerationJob({
      job: created.job,
      providerJobId,
      metadata: {
        animationProjectId: id,
        studioSourceStoryboardId: project.studioSourceStoryboardId ?? null,
        ...(started.syncResult?.metadata ?? {}),
        billingPhase: "project_create",
        chargeOnThisJob: false,
      },
    });

    return NextResponse.json(
      {
        projectId: id,
        startedCount:
          typeof started.syncResult?.metadata?.providerJobIds === "object" &&
          Array.isArray(started.syncResult.metadata.providerJobIds)
            ? started.syncResult.metadata.providerJobIds.length
            : 1,
        generationJob: toStudioGenerationUiContract(job),
      },
      { status: 200 }
    );
  } catch (error) {
    await failGenerationJob(
      created.job.id,
      "PROVIDER_REJECTED",
      error instanceof Error ? error.message : "Unable to start jobs."
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to start jobs." },
      { status: 400 }
    );
  }
}
