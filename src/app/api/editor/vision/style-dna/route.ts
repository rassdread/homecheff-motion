import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import type { SessionUser } from "@/server/auth/session";
import { withStudioCreditGate } from "@/server/studio-account/with-studio-credit-gate";
import { readHcProjectIdFromRequest, readProductionTransactionIdFromRequest } from "@/lib/studio-production-request-headers";
import {
  resolveEditorStyleDnaBillingMode,
  resolveStyleDna,
} from "@/server/studio/resolve-style-dna";
import { recordEditorPremiumProviderCost } from "@/server/editor/editor-premium-provider-cost";
import { buildOpenAiVisionUsageMetrics } from "@/server/openai/openai-vision-usage";
import { resolveAssetVisionModel } from "@/server/studio/analyze-asset-reference-vision";
import type { StyleDnaBillingMode } from "@/types/studio-style-dna";
import { styleDnaUserMessage } from "@/types/studio-style-dna";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

export const runtime = "nodejs";

const VALID_KINDS = new Set<StudioAssetKind>(["character", "prop", "location", "world"]);

function styleDnaErrorResponse(result: Extract<
  Awaited<ReturnType<typeof resolveStyleDna>>,
  { ok: false }
>) {
  return NextResponse.json(
    {
      error: result.error,
      code: result.code,
      userMessage: result.userMessage,
    },
    { status: result.status }
  );
}

async function executeStyleDnaRoute(input: {
  user: SessionUser;
  body: {
    imageUrl?: string;
    sourceKind?: StudioAssetKind;
    sourceName?: string;
    derivationJobId?: string;
    analysisRunId?: string | null;
    analysisId?: string | null;
    sessionId?: string | null;
    projectId?: string | null;
    assetId?: string | null;
    billingMode?: StyleDnaBillingMode;
    forceRefresh?: boolean;
  };
  productionTransactionId?: string;
  hcProjectId?: string;
}) {
  const { user, body } = input;
  const sourceKind = body.sourceKind ?? "character";
  const derivationJobId = body.derivationJobId ?? crypto.randomUUID();
  const startedAt = Date.now();
  const billingMode = resolveEditorStyleDnaBillingMode({
    explicit: body.billingMode,
    analysisRunId: body.analysisRunId,
    productionTransactionId: input.productionTransactionId,
  });

  const runResolve = () =>
    resolveStyleDna(user, {
      imageUrl: body.imageUrl ?? "",
      sourceKind,
      sourceName: body.sourceName ?? "Reference",
      derivationJobId,
      skipLegacyMetering: true,
      billingMode,
      forceRefresh: body.forceRefresh,
    });

  let resolved: Awaited<ReturnType<typeof resolveStyleDna>>;
  let estimatedCredits: number | undefined;

  if (billingMode === "premium_session" || billingMode === "cache_hit") {
    resolved = await runResolve();
  } else if (billingMode === "production_contract") {
    const gated = await withStudioCreditGate({
      user,
      actionType: "vision_analysis",
      projectId: body.projectId ?? undefined,
      productionTransactionId: input.productionTransactionId,
      hcProjectId: input.hcProjectId,
      relatedJobId: derivationJobId,
      execute: runResolve,
      isFailure: (result) => !result.ok,
    });
    if ("blocked" in gated) {
      return gated.blocked;
    }
    resolved = gated.result;
    estimatedCredits = gated.estimatedCredits;
  } else {
    const gated = await withStudioCreditGate({
      user,
      actionType: "vision_analysis",
      projectId: body.projectId ?? undefined,
      relatedJobId: derivationJobId,
      execute: runResolve,
      isFailure: (result) => !result.ok,
    });
    if ("blocked" in gated) {
      return gated.blocked;
    }
    resolved = gated.result;
    estimatedCredits = gated.estimatedCredits;
  }

  const model = resolveAssetVisionModel();

  if (!resolved.ok) {
    await recordEditorPremiumProviderCost({
      userId: user.id,
      route: "style_dna",
      analysisRunId: body.analysisRunId,
      analysisId: body.analysisId,
      sessionId: body.sessionId,
      projectId: body.projectId,
      assetId: body.assetId,
      status: "failed",
      derivationJobId,
      errorCode: resolved.code,
      metrics: buildOpenAiVisionUsageMetrics({
        model,
        durationMs: Date.now() - startedAt,
        imageCount: 1,
      }),
    }).catch(() => undefined);
    return styleDnaErrorResponse(resolved);
  }

  const metrics =
    resolved.data.metrics ??
    buildOpenAiVisionUsageMetrics({
      model,
      durationMs: Date.now() - startedAt,
      imageCount: 1,
    });

  if (!resolved.cached) {
    await recordEditorPremiumProviderCost({
      userId: user.id,
      route: "style_dna",
      analysisRunId: body.analysisRunId,
      analysisId: body.analysisId,
      sessionId: body.sessionId,
      projectId: body.projectId,
      assetId: body.assetId,
      status: "completed",
      derivationJobId,
      metrics,
    }).catch(() => undefined);
  }

  return NextResponse.json({
    ok: true,
    styleDna: resolved.data.styleDna,
    visionAnalysis: resolved.data.visionAnalysis,
    cached: resolved.cached,
    billingMode: resolved.billingMode,
    ...(estimatedCredits != null ? { estimatedCredits } : {}),
  });
}

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: {
    imageUrl?: string;
    sourceKind?: StudioAssetKind;
    sourceName?: string;
    derivationJobId?: string;
    analysisRunId?: string | null;
    analysisId?: string | null;
    sessionId?: string | null;
    projectId?: string | null;
    assetId?: string | null;
    billingMode?: StyleDnaBillingMode;
    forceRefresh?: boolean;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON body.",
        code: "STYLE_DNA_INTERNAL_ERROR",
        userMessage: styleDnaUserMessage("STYLE_DNA_INTERNAL_ERROR"),
      },
      { status: 400 }
    );
  }

  const sourceKind = body.sourceKind ?? "character";
  if (!VALID_KINDS.has(sourceKind)) {
    return NextResponse.json(
      {
        error: "Invalid source kind.",
        code: "STYLE_DNA_UNSUPPORTED_IMAGE",
        userMessage: styleDnaUserMessage("STYLE_DNA_UNSUPPORTED_IMAGE"),
      },
      { status: 400 }
    );
  }

  const productionTransactionId = readProductionTransactionIdFromRequest(request);
  const hcProjectId = readHcProjectIdFromRequest(request) ?? body.projectId ?? undefined;

  return executeStyleDnaRoute({
    user,
    body,
    productionTransactionId,
    hcProjectId,
  });
}
