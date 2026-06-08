import { NextResponse } from "next/server";
import {
  generateAssetReference,
  isAssetReferenceGenerationAvailable,
} from "@/server/studio/studio-asset-reference-service";
import { requireActiveUser } from "@/server/auth/permissions";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

const VALID_KINDS = new Set<StudioAssetKind>(["character", "prop", "location"]);

export async function GET() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }
  return NextResponse.json({
    ok: true,
    available: isAssetReferenceGenerationAvailable(),
  });
}

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: {
    kind?: StudioAssetKind;
    summaryPrompt?: string;
    choices?: Record<string, string>;
    customTexts?: Record<string, string>;
    generationId?: string;
    derivation?: {
      styleDna: import("@/types/studio-asset-derivation").AssetStyleDna;
      sourceName: string;
      sourceKind: string;
      sourceAssetId?: string | null;
    };
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_BODY" }, { status: 400 });
  }

  const kind = body.kind;
  if (!kind || !VALID_KINDS.has(kind)) {
    return NextResponse.json(
      { error: "kind must be character, prop, or location.", code: "INVALID_KIND" },
      { status: 400 }
    );
  }

  const result = await generateAssetReference(user, {
    kind,
    summaryPrompt: body.summaryPrompt ?? "",
    choices: body.choices ?? {},
    customTexts: body.customTexts ?? {},
    generationId: body.generationId ?? "",
    derivation: body.derivation,
  });

  if ("error" in result) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status }
    );
  }

  return NextResponse.json({ ok: true, ...result.data });
}
