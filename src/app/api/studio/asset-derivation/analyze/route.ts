import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
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

  const result = await extractAssetStyleDna(user, {
    imageUrl: body.imageUrl ?? "",
    sourceKind,
    sourceName: body.sourceName ?? "Reference",
    derivationJobId: body.derivationJobId ?? crypto.randomUUID(),
  });

  if ("error" in result) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status }
    );
  }

  return NextResponse.json({ ok: true, styleDna: result.data });
}
