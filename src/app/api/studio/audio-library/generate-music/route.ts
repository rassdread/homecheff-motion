import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { runBilledProviderRoute, withEstimatedCredits } from "@/server/studio-account/studio-billed-route";
import { generateStudioMusicAsset } from "@/server/studio/generate-studio-provider-audio";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: {
    prompt?: string;
    genre?: string;
    mood?: string;
    durationSeconds?: number;
    instrumental?: boolean;
    name?: string;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  return runBilledProviderRoute({
    user,
    actionType: "music_generation",
    execute: () =>
      generateStudioMusicAsset({
        ownerId: user.id,
        prompt: typeof body.prompt === "string" ? body.prompt : "",
        genre: typeof body.genre === "string" ? body.genre : "cinematic",
        mood: typeof body.mood === "string" ? body.mood : "warm",
        durationSeconds:
          typeof body.durationSeconds === "number" ? body.durationSeconds : 30,
        instrumental: body.instrumental !== false,
        name: typeof body.name === "string" ? body.name : undefined,
      }),
    isFailure: (result) => !result.ok,
    skipCapture: (result) => result.ok && result.cacheHit === true,
    onSuccess: (result, estimatedCredits) => {
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error, code: result.code },
          { status: 502 }
        );
      }
      return NextResponse.json(
        withEstimatedCredits(
          {
            ok: true,
            asset: result.asset,
            cacheHit: result.cacheHit,
            provider: result.provider,
            providerAssetId: result.providerAssetId,
            previewUrl: result.asset.audioUrl,
            audioUrl: result.asset.audioUrl,
            durationSeconds: result.asset.durationSeconds,
          },
          estimatedCredits
        )
      );
    },
  });
}
