import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { generateStudioSfxAsset } from "@/server/studio/generate-studio-provider-audio";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: {
    prompt?: string;
    category?: string;
    durationSeconds?: number;
    name?: string;
    sceneLabel?: string;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const result = await generateStudioSfxAsset({
    ownerId: user.id,
    prompt: typeof body.prompt === "string" ? body.prompt : "",
    category: typeof body.category === "string" ? body.category : "ambience",
    durationSeconds:
      typeof body.durationSeconds === "number" ? body.durationSeconds : 3,
    name: typeof body.name === "string" ? body.name : undefined,
    sceneLabel: typeof body.sceneLabel === "string" ? body.sceneLabel : undefined,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    asset: result.asset,
    cacheHit: result.cacheHit,
    provider: result.provider,
    providerAssetId: result.providerAssetId,
    previewUrl: result.asset.audioUrl,
    audioUrl: result.asset.audioUrl,
    durationSeconds: result.asset.durationSeconds,
  });
}
