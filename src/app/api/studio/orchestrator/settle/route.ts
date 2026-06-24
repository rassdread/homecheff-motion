import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { getHomeCheffProjectRecord, upsertHomeCheffProjectRecord } from "@/server/projects/homecheff-project-service";
import { parseHomeCheffProjectManifest } from "@/server/studio/production-transaction-validator";
import {
  estimateProductionCompletedFraction,
  settleProductionContract,
} from "@/server/studio/production-settlement";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: {
    hcProjectId?: string;
    outcome?: "complete" | "fail";
    completedFraction?: number;
    errorMessage?: string;
    providerCostEventIds?: string[];
    consumedCogsUsd?: number;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const hcProjectId = body.hcProjectId?.trim();
  if (!hcProjectId) {
    return NextResponse.json({ error: "hcProjectId required" }, { status: 400 });
  }

  const record = await getHomeCheffProjectRecord(user.id, hcProjectId);
  if (!record) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const project = parseHomeCheffProjectManifest(record);
  if (!project) {
    return NextResponse.json({ error: "Invalid project manifest" }, { status: 400 });
  }

  const outcome = body.outcome ?? "fail";
  const completedFraction =
    body.completedFraction ??
    (outcome === "complete" ? 1 : estimateProductionCompletedFraction(project));

  const result = await settleProductionContract({
    userId: user.id,
    project,
    outcome,
    completedFraction,
    errorMessage: body.errorMessage,
    providerCostEventIds: body.providerCostEventIds,
    consumedCogsUsd: body.consumedCogsUsd,
  });

  await upsertHomeCheffProjectRecord(user.id, result.project);

  return NextResponse.json({
    ok: true,
    capturedCredits: result.capturedCredits,
    refundedCredits: result.refundedCredits,
    transaction: result.transaction,
  });
}
