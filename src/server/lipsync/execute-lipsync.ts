/**
 * Canonical true lip-sync execution — photo/video + speech audio → synced MP4.
 */

import { uploadPublicBlob } from "@/lib/vercel-blob-config";
import {
  estimateLipsyncReservedUsd,
  getLipsyncProviderId,
  type LipsyncProviderId,
} from "@/lib/lipsync/config";
import { runHedraAvatarLipsync } from "@/server/lipsync/providers/hedra-avatar";
import { runReplicateSadTalkerLipsync } from "@/server/lipsync/providers/replicate-sadtalker";

export type ExecuteLipSyncInput = {
  ownerId: string;
  projectId: string;
  /** Publicly reachable image URL (https). */
  imageUrl: string;
  /** Publicly reachable speech audio URL (https). */
  audioUrl: string;
  durationSeconds?: number;
  aspectRatio?: "9:16" | "1:1" | "16:9";
  locale?: string;
  behaviorPrompt?: string | null;
};

export type ExecuteLipSyncResult = {
  ok: true;
  provider: LipsyncProviderId;
  providerJobId: string;
  videoUrl: string;
  durationSeconds: number | null;
  reservedCostUsd: number;
  rawMeta?: Record<string, unknown>;
};

export type ExecuteLipSyncFailure = {
  ok: false;
  code: string;
  message: string;
  provider: LipsyncProviderId;
};

export async function executeLipSync(
  input: ExecuteLipSyncInput,
): Promise<ExecuteLipSyncResult | ExecuteLipSyncFailure> {
  const provider = getLipsyncProviderId();
  if (provider === "none") {
    return {
      ok: false,
      code: "LIPSYNC_NOT_CONFIGURED",
      message: "True lip-sync is not configured.",
      provider,
    };
  }

  if (!input.imageUrl.startsWith("http")) {
    return {
      ok: false,
      code: "IMAGE_URL_REQUIRED",
      message: "A public image URL is required for lip-sync.",
      provider,
    };
  }
  if (!input.audioUrl.startsWith("http")) {
    return {
      ok: false,
      code: "AUDIO_URL_REQUIRED",
      message: "A public speech audio URL is required for lip-sync.",
      provider,
    };
  }

  const reservedCostUsd = estimateLipsyncReservedUsd({
    provider,
    durationSeconds: input.durationSeconds ?? 15,
  });

  try {
    const raw =
      provider === "hedra_avatar"
        ? await runHedraAvatarLipsync({
            imageUrl: input.imageUrl,
            audioUrl: input.audioUrl,
            aspectRatio: input.aspectRatio ?? "9:16",
            durationSeconds: input.durationSeconds,
            behaviorPrompt: input.behaviorPrompt,
          })
        : await runReplicateSadTalkerLipsync({
            imageUrl: input.imageUrl,
            audioUrl: input.audioUrl,
          });

    if (!raw.ok) {
      return {
        ok: false,
        code: raw.code,
        message: raw.message,
        provider,
      };
    }

    // Persist to our blob so provider URLs (48h retention) don't expire.
    const mirrored = await mirrorVideoToBlob({
      ownerId: input.ownerId,
      projectId: input.projectId,
      sourceUrl: raw.videoUrl,
    });

    return {
      ok: true,
      provider,
      providerJobId: raw.providerJobId,
      videoUrl: mirrored,
      durationSeconds: raw.durationSeconds,
      reservedCostUsd,
      rawMeta: raw.rawMeta,
    };
  } catch (error) {
    return {
      ok: false,
      code: "LIPSYNC_PROVIDER_ERROR",
      message: error instanceof Error ? error.message : "Lip-sync provider failed.",
      provider,
    };
  }
}

async function mirrorVideoToBlob(input: {
  ownerId: string;
  projectId: string;
  sourceUrl: string;
}): Promise<string> {
  const res = await fetch(input.sourceUrl, { signal: AbortSignal.timeout(180_000) });
  if (!res.ok) return input.sourceUrl;
  const buf = Buffer.from(await res.arrayBuffer());
  const pathname = `studio/${input.ownerId}/lipsync/${input.projectId}/${Date.now()}.mp4`;
  try {
    const uploaded = await uploadPublicBlob({
      pathname,
      body: buf,
      contentType: "video/mp4",
      allowOverwrite: true,
      context: { uploadTarget: pathname, provider: "studio_lipsync" },
    });
    return uploaded.url;
  } catch {
    return input.sourceUrl;
  }
}
