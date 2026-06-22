import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { withStudioCreditGate } from "@/server/studio-account/with-studio-credit-gate";
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

  const gated = await withStudioCreditGate({
    user,
    actionType: billingActionType,
    projectId: sessionId,
    confirmed: body.confirmed,
    overrideCredits: fusionCreditsRequired,
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

  if ("blocked" in gated) {
    return gated.blocked;
  }

  const result = gated.result;
  if (!result.ok) {
    const status =
      result.code === "validation" || result.code === "ownership"
        ? 400
        : result.code === "analysis_failed"
          ? 422
          : 502;
    return NextResponse.json(
      {
        ok: false,
        error: result.message,
        code: result.code === "analysis_failed" ? "ANALYSIS" : result.code.toUpperCase(),
      },
      { status }
    );
  }

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
    estimatedCredits: gated.estimatedCredits,
  });
}
