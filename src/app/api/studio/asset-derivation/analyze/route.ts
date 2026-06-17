import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { runBilledProviderRoute, withEstimatedCredits } from "@/server/studio-account/studio-billed-route";
import { extractAssetStyleDna } from "@/server/studio/extract-asset-style-dna";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

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

  return runBilledProviderRoute({
    user,
    actionType: "vision_analysis",
    relatedJobId: body.derivationJobId ?? undefined,
    execute: () =>
      extractAssetStyleDna(user, {
        imageUrl: body.imageUrl ?? "",
        sourceKind,
        sourceName: body.sourceName ?? "Reference",
        derivationJobId: body.derivationJobId ?? crypto.randomUUID(),
      }),
    isFailure: (result) => "error" in result,
    onSuccess: (result, estimatedCredits) => {
      if ("error" in result) {
        return NextResponse.json(
          { error: result.error, code: result.code },
          { status: result.status }
        );
      }
      return NextResponse.json(
        withEstimatedCredits(
          {
            ok: true,
            styleDna: result.data.styleDna,
            visionAnalysis: result.data.visionAnalysis,
          },
          estimatedCredits
        )
      );
    },
  });
}
