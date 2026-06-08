import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { meterAssetDerivation } from "@/server/provider-cost/studio-cost-metering";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: {
    derivationJobId?: string;
    sourceKind?: string;
    targetKind?: StudioAssetKind;
    sourceAssetId?: string | null;
    sourceAssetName?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_BODY" }, { status: 400 });
  }

  const derivationJobId = body.derivationJobId?.trim();
  if (!derivationJobId) {
    return NextResponse.json(
      { error: "derivationJobId is required.", code: "JOB_ID_REQUIRED" },
      { status: 400 }
    );
  }

  meterAssetDerivation({
    ctx: { userId: user.id, feature: "asset_derivation", relatedJobId: derivationJobId },
    phase: "accept",
    status: "completed",
    sourceKind: body.sourceKind,
    targetKind: body.targetKind,
    sourceAssetId: body.sourceAssetId,
    sourceAssetName: body.sourceAssetName,
    derivationAccepted: true,
  });

  return NextResponse.json({ ok: true });
}
