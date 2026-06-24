import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { PRODUCTION_TRANSACTION_HEADER } from "@/lib/studio-production-transaction";
import { renderProductionBatch } from "@/server/studio/studio-production-batch-render";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: {
    storyboardId?: string;
    sceneIndices?: number[];
    batchIndex?: number;
    productionTransactionId?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const storyboardId = body.storyboardId?.trim() ?? "";
  const sceneIndices = body.sceneIndices ?? [];
  if (!storyboardId || sceneIndices.length === 0) {
    return NextResponse.json({ error: "storyboardId and sceneIndices required" }, { status: 400 });
  }

  const productionTransactionId =
    body.productionTransactionId?.trim() ||
    request.headers.get(PRODUCTION_TRANSACTION_HEADER)?.trim() ||
    "";

  const result = await renderProductionBatch({
    viewer: user,
    storyboardId,
    sceneIndices,
    batchIndex: body.batchIndex ?? 0,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, code: result.code }, { status: result.httpStatus });
  }

  return NextResponse.json({
    ok: true,
    projectId: result.projectId,
    warnings: result.warnings,
    productionTransactionId: productionTransactionId || undefined,
  });
}
