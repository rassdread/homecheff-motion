import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { analyzeIllustrationPartsTracked } from "@/server/editor/illustration-part-analysis";
import { recordEditorPremiumProviderCost } from "@/server/editor/editor-premium-provider-cost";
import { buildOpenAiVisionUsageMetrics } from "@/server/openai/openai-vision-usage";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { ObjectDetection } from "@/server/animation-export/local-vision/object-detector-types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: {
    imageUrl?: string;
    vision?: AssetVisionAnalysis;
    detections?: ObjectDetection[];
    analysisRunId?: string | null;
    analysisId?: string | null;
    sessionId?: string | null;
    projectId?: string | null;
    assetId?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const imageUrl = body.imageUrl?.trim();
  if (!imageUrl || !body.vision) {
    return NextResponse.json({ error: "imageUrl and vision are required." }, { status: 400 });
  }

  const tracked = await analyzeIllustrationPartsTracked({
    imageUrl,
    vision: body.vision,
    detections: body.detections ?? [],
  });

  const metrics =
    tracked.metrics ??
    buildOpenAiVisionUsageMetrics({
      model: process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o-mini",
      durationMs: 0,
      imageCount: 1,
    });

  await recordEditorPremiumProviderCost({
    userId: user.id,
    route: "vision_parts",
    analysisRunId: body.analysisRunId,
    analysisId: body.analysisId,
    sessionId: body.sessionId,
    projectId: body.projectId,
    assetId: body.assetId,
    status: tracked.errorCode ? "failed" : "completed",
    errorCode: tracked.errorCode,
    metrics,
  }).catch(() => undefined);

  return NextResponse.json({ ok: true, analysis: tracked.analysis });
}
