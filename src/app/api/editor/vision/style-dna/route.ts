import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { extractAssetStyleDna } from "@/server/studio/extract-asset-style-dna";
import { recordEditorPremiumProviderCost } from "@/server/editor/editor-premium-provider-cost";
import { buildOpenAiVisionUsageMetrics } from "@/server/openai/openai-vision-usage";
import { resolveAssetVisionModel } from "@/server/studio/analyze-asset-reference-vision";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

export const runtime = "nodejs";

const VALID_KINDS = new Set<StudioAssetKind>(["character", "prop", "location", "world"]);

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
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_BODY" }, { status: 400 });
  }

  const sourceKind = body.sourceKind ?? "character";
  if (!VALID_KINDS.has(sourceKind)) {
    return NextResponse.json({ error: "Invalid source kind.", code: "INVALID_KIND" }, { status: 400 });
  }

  const derivationJobId = body.derivationJobId ?? crypto.randomUUID();
  const startedAt = Date.now();
  const result = await extractAssetStyleDna(user, {
    imageUrl: body.imageUrl ?? "",
    sourceKind,
    sourceName: body.sourceName ?? "Reference",
    derivationJobId,
    skipLegacyMetering: true,
  });

  const model = resolveAssetVisionModel();

  if ("error" in result) {
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
      errorCode: result.code,
      metrics: buildOpenAiVisionUsageMetrics({
        model,
        durationMs: Date.now() - startedAt,
        imageCount: 1,
      }),
    }).catch(() => undefined);
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status }
    );
  }

  const metrics =
    result.data.metrics ??
    buildOpenAiVisionUsageMetrics({
      model,
      durationMs: Date.now() - startedAt,
      imageCount: 1,
    });

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

  return NextResponse.json({
    ok: true,
    styleDna: result.data.styleDna,
    visionAnalysis: result.data.visionAnalysis,
  });
}
