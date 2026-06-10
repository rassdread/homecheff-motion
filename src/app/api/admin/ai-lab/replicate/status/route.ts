import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import {
  REPLICATE_SAM3_MODEL_ID,
  fetchReplicateAccount,
  fetchReplicateSam3Model,
  isReplicateConfigured,
} from "@/server/admin/replicate-client";
import { getReplicateLabLastRun } from "@/server/admin/replicate-lab-state";

export const dynamic = "force-dynamic";

/** Admin-only Replicate connection status for the AI lab. */
export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }

  const configured = isReplicateConfigured();
  if (!configured) {
    return NextResponse.json({
      ok: false,
      configured: false,
      message: "Replicate is not configured",
      billingAvailable: false,
      modelReachable: false,
      model: REPLICATE_SAM3_MODEL_ID,
      lastTestRuntimeMs: null,
      lastTestAt: null,
      lastPredictionId: null,
    });
  }

  const [accountRes, modelRes] = await Promise.all([
    fetchReplicateAccount(),
    fetchReplicateSam3Model(),
  ]);

  const lastRun = getReplicateLabLastRun();

  return NextResponse.json({
    ok: accountRes.ok && modelRes.ok,
    configured: true,
    message: null,
    billingAvailable: accountRes.ok,
    billingError: accountRes.error,
    modelReachable: modelRes.ok,
    modelError: modelRes.error,
    model: REPLICATE_SAM3_MODEL_ID,
    modelVersion: modelRes.model?.latestVersionId ?? null,
    accountUsername: accountRes.account?.username ?? null,
    lastTestRuntimeMs: lastRun?.runtimeMs ?? null,
    lastTestAt: lastRun?.completedAt ?? null,
    lastPredictionId: lastRun?.predictionId ?? null,
    checkedAt: new Date().toISOString(),
  });
}
