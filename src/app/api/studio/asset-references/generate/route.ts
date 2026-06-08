import { NextResponse } from "next/server";
import {
  generateAssetReference,
  isAssetReferenceGenerationAvailable,
} from "@/server/studio/studio-asset-reference-service";
import { requireActiveUser } from "@/server/auth/permissions";
import { resolveOpenAiImageModel } from "@/lib/openai-image-generation";
import { getSelectedSceneImageProviderId } from "@/server/scene-image-providers";
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
    sourceReference?: {
      name: string;
      imageUrl?: string;
      transformLabel?: string;
      userPrompt?: string;
      preserveHint?: string;
      changeHint?: string;
      forbiddenHint?: string;
      visionHint?: string;
    };
    identityAudit?: import("@/types/studio-asset-identity-generation-audit").AssetIdentityGenerationAudit;
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

  console.info(
    "[asset-references/generate]",
    JSON.stringify({
      route: "/api/studio/asset-references/generate",
      helperPath: "POST route→generateAssetReference",
      model: resolveOpenAiImageModel(),
      providerId: getSelectedSceneImageProviderId(),
      envStudioSceneImageModel: process.env.STUDIO_SCENE_IMAGE_MODEL?.trim() ?? null,
      envOpenAiImageModel: process.env.OPENAI_IMAGE_MODEL?.trim() ?? null,
      generationId: body.generationId ?? null,
      kind,
      hasSourceImage: Boolean(body.sourceReference?.imageUrl?.trim()),
      sourceImageUrl: body.sourceReference?.imageUrl ?? null,
      identityAudit: body.identityAudit ?? null,
    })
  );

  const result = await generateAssetReference(user, {
    kind,
    summaryPrompt: body.summaryPrompt ?? "",
    choices: body.choices ?? {},
    customTexts: body.customTexts ?? {},
    generationId: body.generationId ?? "",
    sourceReference: body.sourceReference,
    derivation: body.derivation,
    identityAudit: body.identityAudit,
  });

  if ("error" in result) {
    return NextResponse.json(
      {
        error: result.error,
        code: result.code,
        providerMessage: result.providerMessage ?? null,
      },
      { status: result.status }
    );
  }

  return NextResponse.json({ ok: true, ...result.data });
}
