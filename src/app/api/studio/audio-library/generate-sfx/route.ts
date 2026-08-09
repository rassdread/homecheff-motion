import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { withEstimatedCredits } from "@/server/studio-account/studio-billed-route";
import { generateStudioSfxAsset } from "@/server/studio/generate-studio-provider-audio";
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
    category?: string;
    durationSeconds?: number;
    name?: string;
    sceneLabel?: string;
    clientMutationId?: string;
    confirmed?: boolean;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  const category = typeof body.category === "string" ? body.category : "ambience";
  const durationSeconds =
    typeof body.durationSeconds === "number" ? body.durationSeconds : 3;
  const name = typeof body.name === "string" ? body.name : undefined;
  const sceneLabel =
    typeof body.sceneLabel === "string" ? body.sceneLabel : undefined;
  const clientMutationId =
    typeof body.clientMutationId === "string" && body.clientMutationId.trim()
      ? body.clientMutationId.trim()
      : null;

  const idempotencyKey = resolveAudioRouteIdempotencyKey({
    request,
    clientMutationId,
    fallbackPrefix: `sfx_generate:${user.id}`,
    operationFingerprint: `${user.id}:${prompt.slice(0, 200)}:${category}:${durationSeconds}:${sceneLabel ?? ""}`,
  });

  return runAudioGenerationJobRoute({
    user,
    capability: "SFX_GENERATE",
    actionType: "sfx_generation",
    idempotencyKey,
    confirmed: body.confirmed === true,
    inputSnapshot: {
      action: "sfx_generate",
      prompt: prompt.slice(0, 500),
      category,
      durationSeconds,
      name: name ?? null,
      sceneLabel: sceneLabel ?? null,
      renderSemantics: "project_bed",
    },
    execute: () =>
      generateStudioSfxAsset({
        ownerId: user.id,
        prompt,
        category,
        durationSeconds,
        name,
        sceneLabel,
      }),
    isFailure: (result) => !result.ok,
    skipCapture: (result) => result.ok && result.cacheHit === true,
    getOutputAssetId: (result) => (result.ok ? result.asset.id : null),
    mapFailure: (result) => {
      if (!result.ok) {
        return { error: result.error, code: result.code };
      }
      return { error: "SFX generation failed.", code: "SFX_FAILED" };
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
