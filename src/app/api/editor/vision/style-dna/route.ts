import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import type { SessionUser } from "@/server/auth/session";
import { withStudioCreditGate } from "@/server/studio-account/with-studio-credit-gate";
import { readHcProjectIdFromRequest, readProductionTransactionIdFromRequest } from "@/lib/studio-production-request-headers";
import {
  classifyStyleDnaImageUrl,
  resolveEditorStyleDnaBillingMode,
  resolveStyleDna,
} from "@/server/studio/resolve-style-dna";
import { recordEditorPremiumProviderCost } from "@/server/editor/editor-premium-provider-cost";
import { buildOpenAiVisionUsageMetrics } from "@/server/openai/openai-vision-usage";
import { resolveAssetVisionModel } from "@/server/studio/analyze-asset-reference-vision";
import {
  buildStyleDnaRouteDebug,
  isStyleDnaAdminDebugUser,
  STYLE_DNA_ROUTE_VERSION,
} from "@/server/studio/style-dna-route-debug";
import type { StyleDnaBillingMode } from "@/types/studio-style-dna";
import { styleDnaUserMessage } from "@/types/studio-style-dna";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

export const runtime = "nodejs";

const VALID_KINDS = new Set<StudioAssetKind>(["character", "prop", "location", "world"]);

function styleDnaErrorResponse(
  result: Extract<Awaited<ReturnType<typeof resolveStyleDna>>, { ok: false }>,
  user: SessionUser,
  debugBase: Omit<
    Parameters<typeof buildStyleDnaRouteDebug>[0],
    "cacheStatus" | "errorCode" | "creditMode"
  >
) {
  const creditMode =
    debugBase.billingMode === "premium_session"
      ? "premium_session"
      : debugBase.billingMode === "production_contract"
        ? "production_contract"
        : "standalone";

  return NextResponse.json(
    {
      error: result.error,
      code: result.code,
      userMessage: result.userMessage,
      ...(isStyleDnaAdminDebugUser(user)
        ? {
            debug: buildStyleDnaRouteDebug({
              ...debugBase,
              cacheStatus: "miss",
              creditMode,
              errorCode: result.code,
            }),
          }
        : {}),
    },
    {
      status: result.status,
      headers: { "X-Style-Dna-Route-Version": STYLE_DNA_ROUTE_VERSION },
    }
  );
}

function unexpectedStyleDnaErrorResponse(
  user: SessionUser,
  error: unknown,
  debugBase: Omit<
    Parameters<typeof buildStyleDnaRouteDebug>[0],
    "cacheStatus" | "errorCode" | "creditMode"
  >
) {
  const message = error instanceof Error ? error.message : "Style DNA route failed.";
  console.error("[style-dna] unhandled route error", {
    routeVersion: STYLE_DNA_ROUTE_VERSION,
    billingMode: debugBase.billingMode,
    imageUrlType: debugBase.imageUrlType,
    message,
    stack: error instanceof Error ? error.stack : undefined,
  });

  return NextResponse.json(
    {
      error: message,
      code: "STYLE_DNA_INTERNAL_ERROR",
      userMessage: styleDnaUserMessage("STYLE_DNA_INTERNAL_ERROR"),
      ...(isStyleDnaAdminDebugUser(user)
        ? {
            debug: buildStyleDnaRouteDebug({
              ...debugBase,
              cacheStatus: "miss",
              creditMode:
                debugBase.billingMode === "premium_session" ? "premium_session" : "standalone",
              errorCode: "STYLE_DNA_INTERNAL_ERROR",
            }),
          }
        : {}),
    },
    {
      status: 500,
      headers: { "X-Style-Dna-Route-Version": STYLE_DNA_ROUTE_VERSION },
    }
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
  const imageUrl = body.imageUrl ?? "";
  const imageUrlType = classifyStyleDnaImageUrl(imageUrl);
  const billingMode = resolveEditorStyleDnaBillingMode({
    explicit: body.billingMode,
    analysisRunId: body.analysisRunId,
    sessionId: body.sessionId,
    productionTransactionId: input.productionTransactionId,
  });

  const debugBase = {
    billingMode,
    sourceKind,
    hasImageUrl: Boolean(imageUrl.trim()),
    imageUrlType,
  };

  const runResolve = () =>
    resolveStyleDna(user, {
      imageUrl,
      sourceKind,
      sourceName: body.sourceName ?? "Reference",
      derivationJobId,
      skipLegacyMetering: true,
      billingMode,
      forceRefresh: body.forceRefresh,
    });

  let resolved: Awaited<ReturnType<typeof resolveStyleDna>>;
  let estimatedCredits: number | undefined;

  if (billingMode === "premium_session") {
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
    return styleDnaErrorResponse(resolved, user, debugBase);
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

  const creditMode = resolved.cached
    ? "cache_hit"
    : billingMode === "premium_session"
      ? "premium_session"
      : billingMode === "production_contract"
        ? "production_contract"
        : "standalone";

  return NextResponse.json(
    {
      ok: true,
      styleDna: resolved.data.styleDna,
      visionAnalysis: resolved.data.visionAnalysis,
      cached: resolved.cached,
      billingMode: resolved.billingMode,
      ...(estimatedCredits != null ? { estimatedCredits } : {}),
      ...(isStyleDnaAdminDebugUser(user)
        ? {
            debug: buildStyleDnaRouteDebug({
              ...debugBase,
              cacheStatus: resolved.cached ? "hit" : "miss",
              creditMode,
            }),
          }
        : {}),
    },
    { headers: { "X-Style-Dna-Route-Version": STYLE_DNA_ROUTE_VERSION } }
  );
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
      {
        status: 400,
        headers: { "X-Style-Dna-Route-Version": STYLE_DNA_ROUTE_VERSION },
      }
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
      {
        status: 400,
        headers: { "X-Style-Dna-Route-Version": STYLE_DNA_ROUTE_VERSION },
      }
    );
  }

  const productionTransactionId = readProductionTransactionIdFromRequest(request);
  const hcProjectId = readHcProjectIdFromRequest(request) ?? body.projectId ?? undefined;
  const debugBase = {
    billingMode: resolveEditorStyleDnaBillingMode({
      explicit: body.billingMode,
      analysisRunId: body.analysisRunId,
      sessionId: body.sessionId,
      productionTransactionId,
    }),
    sourceKind,
    hasImageUrl: Boolean(body.imageUrl?.trim()),
    imageUrlType: classifyStyleDnaImageUrl(body.imageUrl),
  };

  try {
    return await executeStyleDnaRoute({
      user,
      body,
      productionTransactionId,
      hcProjectId,
    });
  } catch (error) {
    return unexpectedStyleDnaErrorResponse(user, error, debugBase);
  }
}
