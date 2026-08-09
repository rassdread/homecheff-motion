import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { billProviderAction } from "@/server/studio-account/bill-provider-action";
import {
  buildFusionWorkflowCostLog,
  recordEditorFusionProviderCost,
} from "@/server/editor/editor-fusion-provider-cost";
import {
  executeFusionWizardRender,
  type FusionWizardRenderRequest,
} from "@/server/editor/editor-fusion-render-service";
import {
  FUSION_RENDER_ACTION_TYPE,
  resolveFusionRenderActionType,
  resolveFusionRenderCreditsRequired,
} from "@/server/editor/editor-fusion-render-billing";
import { normalizeFusionIntent } from "@/lib/editor-image-fusion-catalog";
import { resolveStudioGenerationIdempotencyKey } from "@/lib/studio-generation-idempotency";
import {
  createGenerationJob,
  runSynchronousGenerationJob,
  toStudioGenerationUiContract,
} from "@/server/studio-generation/generation-orchestrator";
import type { EditorFusionIntent } from "@/types/editor-instruction-studio";
import type { FusionRenderPayload } from "@/types/editor-fusion-intelligence";
import type { EditorInstructionReference, EditorInstructionSelection } from "@/types/editor-instruction-studio";
import type { LibraryFusionMetadata } from "@/types/library-consistency";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: FusionWizardRenderRequest & {
    triggerSource?: string;
    componentName?: string;
    buttonName?: string;
    fusionMetadata?: LibraryFusionMetadata | null;
    clientMutationId?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body.", code: "invalid_json" },
      { status: 400 }
    );
  }

  const workflowType = body.workflowType
    ? normalizeFusionIntent(body.workflowType as EditorFusionIntent)
    : null;
  if (!workflowType || !body.fusionRenderPayload) {
    return NextResponse.json(
      {
        ok: false,
        error: "workflowType and fusionRenderPayload are required.",
        code: "validation",
      },
      { status: 400 }
    );
  }

  const sessionId = body.sessionId?.trim();
  if (!sessionId || !body.imageUrl?.trim()) {
    return NextResponse.json(
      {
        ok: false,
        error: "sessionId and imageUrl are required.",
        code: "validation",
      },
      { status: 400 }
    );
  }

  const billingActionType = resolveFusionRenderActionType(workflowType);
  const fusionCreditsRequired = resolveFusionRenderCreditsRequired(workflowType);

  const idempotencyKey = resolveStudioGenerationIdempotencyKey({
    headerKey: request.headers.get("idempotency-key"),
    clientMutationId: body.clientMutationId,
    fallbackPrefix: `fusion_render:${sessionId}:${workflowType}`,
    operationFingerprint: `fusion_render:${sessionId}:${workflowType}`,
  });

  const created = await createGenerationJob({
    ownerId: user.id,
    idempotencyKey,
    capability: "FUSION_RENDER",
    storyboardId: body.hcProjectId?.trim() || null,
    sceneId: null,
    creditCostOverride: fusionCreditsRequired,
    inputSnapshot: {
      sessionId,
      workflowType,
      action: "fusion_render",
      scope: "user",
      hcProjectId: body.hcProjectId ?? null,
    },
  });

  if (created.kind === "replay" && created.job.status === "succeeded") {
    return NextResponse.json(
      {
        ok: true,
        replay: true,
        generationJob: toStudioGenerationUiContract(created.job),
        resultUrl: created.job.outputAssetId,
        libraryAssetId: created.job.outputAssetId,
      },
      { status: 200 }
    );
  }

  if (created.kind === "resumed" && created.job.status === "generating") {
    return NextResponse.json(
      {
        ok: false,
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
        actionType: billingActionType,
        projectId: sessionId,
        confirmed: body.confirmed,
        overrideCredits: fusionCreditsRequired,
        relatedJobId: created.job.id,
        execute: () =>
          executeFusionWizardRender({
            user,
            body: {
              workflowType,
              sessionId,
              imageUrl: body.imageUrl!.trim(),
              prompt: body.prompt?.trim() ?? "",
              fusionRenderPayload: body.fusionRenderPayload as FusionRenderPayload,
              references: body.references as EditorInstructionReference[] | undefined,
              instruction: body.instruction as Partial<EditorInstructionSelection> | undefined,
              confirmed: body.confirmed,
              hcProjectId: body.hcProjectId,
              projectTitle: body.projectTitle,
              fusionMetadata: body.fusionMetadata,
            },
          }),
        isFailure: (result) => !result.ok,
        buildCostEvent: async (result) => {
          if (!result.ok || billingActionType !== FUSION_RENDER_ACTION_TYPE) {
            return null;
          }
          const costLog = buildFusionWorkflowCostLog({
            workflowType,
            creditsCharged: fusionCreditsRequired,
            renderCostUsd: result.costEstimateUsd ?? 0.04,
            referenceCount: result.referenceImageCount,
            imageCount: result.referenceImageCount,
            status: "completed",
            provider: result.provider,
            model: result.model,
          });
          await recordEditorFusionProviderCost({
            userId: user.id,
            sessionId,
            workflowType,
            blueprintId: body.fusionRenderPayload?.blueprint?.id ?? null,
            status: "completed",
            costLog,
            provider: result.provider,
            model: result.model,
            referenceCount: result.referenceImageCount,
            providerSupportsMultiReference: result.providerSupportsMultiReference,
          });
          return null;
        },
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
      if (!result.ok) {
        return {
          ok: false as const,
          errorCode: "PROVIDER_REJECTED" as const,
          safeMessage: result.message,
        };
      }

      return {
        ok: true as const,
        result,
        creditsCharged: billed.billing.captured ? (billed.billing.estimatedCredits ?? 0) : 0,
        outputAssetId: result.libraryAssetId ?? result.resultUrl ?? null,
      };
    },
  });

  if (!run.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: run.job.errorMessageSafe || "Fusion render failed.",
        code: run.errorCode,
        generationJob: toStudioGenerationUiContract(run.job),
      },
      { status: run.errorCode === "INSUFFICIENT_CREDITS" ? 403 : 502 }
    );
  }

  if (run.replay) {
    return NextResponse.json({
      ok: true,
      replay: true,
      generationJob: toStudioGenerationUiContract(run.job),
      resultUrl: run.job.outputAssetId,
    });
  }

  const result = run.result;
  return NextResponse.json({
    ok: true,
    resultUrl: result.resultUrl,
    storageKey: result.storageKey,
    provider: result.provider,
    model: result.model,
    costEstimateUsd: result.costEstimateUsd,
    fusionRun: result.fusionRun,
    providerSupportsMultiReference: result.providerSupportsMultiReference,
    referenceImageCount: result.referenceImageCount,
    fusionCreditsCharged: result.fusionCreditsCharged,
    analysisCreditsCharged: result.analysisCreditsCharged,
    totalCreditsCharged: result.totalCreditsCharged,
    librarySaved: result.librarySaved,
    libraryAssetId: result.libraryAssetId,
    estimatedCredits: fusionCreditsRequired,
    generationJob: toStudioGenerationUiContract(run.job),
  });
}
