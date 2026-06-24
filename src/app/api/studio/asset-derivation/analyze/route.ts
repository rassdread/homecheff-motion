import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { runBilledProviderRoute, withEstimatedCredits } from "@/server/studio-account/studio-billed-route";
import { resolveStyleDna } from "@/server/studio/resolve-style-dna";
import { readStyleDnaCache } from "@/server/studio/style-dna-cache";
import { styleDnaUserMessage } from "@/types/studio-style-dna";
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

  const derivationJobId = body.derivationJobId ?? crypto.randomUUID();
  const imageUrl = body.imageUrl?.trim() ?? "";

  if (imageUrl && !body.forceRefresh) {
    const cached = readStyleDnaCache(imageUrl, sourceKind);
    if (cached) {
      return NextResponse.json(
        withEstimatedCredits(
          {
            ok: true,
            styleDna: cached.styleDna,
            visionAnalysis: cached.visionAnalysis,
            cached: true,
          },
          0
        )
      );
    }
  }

  return runBilledProviderRoute({
    user,
    actionType: "vision_analysis",
    relatedJobId: derivationJobId,
    execute: () =>
      resolveStyleDna(user, {
        imageUrl: body.imageUrl ?? "",
        sourceKind,
        sourceName: body.sourceName ?? "Reference",
        derivationJobId,
        billingMode: "standalone",
        forceRefresh: body.forceRefresh,
      }),
    isFailure: (result) => !result.ok,
    onSuccess: (result, estimatedCredits) => {
      if (!result.ok) {
        return NextResponse.json(
          {
            error: result.error,
            code: result.code,
            userMessage: result.userMessage,
          },
          { status: result.status }
        );
      }
      return NextResponse.json(
        withEstimatedCredits(
          {
            ok: true,
            styleDna: result.data.styleDna,
            visionAnalysis: result.data.visionAnalysis,
            cached: result.cached,
          },
          result.cached ? 0 : estimatedCredits
        )
      );
    },
  });
}
