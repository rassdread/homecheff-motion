import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { withEstimatedCredits } from "@/server/studio-account/studio-billed-route";
import { generateStudioMusicAsset } from "@/server/studio/generate-studio-provider-audio";
import { listUserAudioLibraryAssets } from "@/server/studio/studio-user-audio-library-blob";
import { findUserAudioLibraryAsset } from "@/lib/studio-user-audio-library-find";
import {
  resolveAudioRouteIdempotencyKey,
  runAudioGenerationJobRoute,
} from "@/server/studio-generation/run-audio-generation-job-route";

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
    clientMutationId?: string;
    confirmed?: boolean;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  const genre = typeof body.genre === "string" ? body.genre : "cinematic";
  const mood = typeof body.mood === "string" ? body.mood : "warm";
  const durationSeconds =
    typeof body.durationSeconds === "number" ? body.durationSeconds : 30;
  const instrumental = body.instrumental !== false;
  const name = typeof body.name === "string" ? body.name : undefined;
  const clientMutationId =
    typeof body.clientMutationId === "string" && body.clientMutationId.trim()
      ? body.clientMutationId.trim()
      : null;

  const idempotencyKey = resolveAudioRouteIdempotencyKey({
    request,
    clientMutationId,
    fallbackPrefix: `music_generate:${user.id}`,
  });

  return runAudioGenerationJobRoute({
    user,
    capability: "MUSIC_GENERATE",
    actionType: "music_generation",
    idempotencyKey,
    confirmed: body.confirmed === true,
    inputSnapshot: {
      action: "music_generate",
      prompt: prompt.slice(0, 500),
      genre,
      mood,
      durationSeconds,
      instrumental,
      name: name ?? null,
    },
    execute: () =>
      generateStudioMusicAsset({
        ownerId: user.id,
        prompt,
        genre,
        mood,
        durationSeconds,
        instrumental,
        name,
      }),
    isFailure: (result) => !result.ok,
    skipCapture: (result) => result.ok && result.cacheHit === true,
    getOutputAssetId: (result) => (result.ok ? result.asset.id : null),
    mapFailure: (result) => {
      if (!result.ok) {
        return { error: result.error, code: result.code };
      }
      return { error: "Music generation failed.", code: "MUSIC_FAILED" };
    },
    mapSuccess: (result, estimatedCredits) => {
      if (!result.ok) {
        return { error: result.error };
      }
      return withEstimatedCredits(
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
      ) as unknown as Record<string, unknown>;
    },
    mapReplay: async (job) => {
      const library = await listUserAudioLibraryAssets(user.id);
      const asset = findUserAudioLibraryAsset(library, job.outputAssetId);
      if (!asset) {
        return { assetId: job.outputAssetId };
      }
      return {
        asset,
        cacheHit: true,
        provider: "library_replay",
        providerAssetId: asset.id,
        previewUrl: asset.audioUrl,
        audioUrl: asset.audioUrl,
        durationSeconds: asset.durationSeconds,
      };
    },
  });
}
