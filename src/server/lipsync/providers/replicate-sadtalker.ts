/**
 * Replicate SadTalker — photo + audio → talking-head video (true audio-driven lipsync).
 * Uses existing REPLICATE_API_TOKEN + prediction poll pattern.
 */

import {
  createReplicatePrediction,
  getReplicatePrediction,
  isReplicateConfigured,
  waitForReplicatePrediction,
} from "@/server/admin/replicate-client";

const MODEL_PATH = "cjwbw/sadtalker";
let cachedVersionId: { id: string; at: number } | null = null;

async function resolveSadTalkerVersionId(): Promise<string | null> {
  if (cachedVersionId && Date.now() - cachedVersionId.at < 30 * 60_000) {
    return cachedVersionId.id;
  }
  const token = process.env.REPLICATE_API_TOKEN?.trim();
  if (!token) return null;
  const res = await fetch(`https://api.replicate.com/v1/models/${MODEL_PATH}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { latest_version?: { id?: string } };
  const id = body.latest_version?.id?.trim() || null;
  if (id) cachedVersionId = { id, at: Date.now() };
  return id;
}

export async function runReplicateSadTalkerLipsync(input: {
  imageUrl: string;
  audioUrl: string;
}): Promise<
  | {
      ok: true;
      providerJobId: string;
      videoUrl: string;
      durationSeconds: number | null;
      rawMeta?: Record<string, unknown>;
    }
  | { ok: false; code: string; message: string }
> {
  if (!isReplicateConfigured()) {
    return { ok: false, code: "REPLICATE_NOT_CONFIGURED", message: "Replicate is not configured." };
  }

  const version = await resolveSadTalkerVersionId();
  if (!version) {
    return {
      ok: false,
      code: "SADTALKER_VERSION_UNAVAILABLE",
      message: "Could not resolve SadTalker model version.",
    };
  }

  const created = await createReplicatePrediction({
    version,
    input: {
      source_image: input.imageUrl,
      driven_audio: input.audioUrl,
      still_mode: false,
      use_enhancer: false,
      preprocess: "crop",
      size_of_image: 256,
      pose_style: 0,
      expression_scale: 1.0,
      use_eyeblink: true,
      facerender: "facevid2vid",
    },
  });

  if (!created.ok) {
    return { ok: false, code: "SADTALKER_SUBMIT_FAILED", message: created.error };
  }

  const waited = await waitForReplicatePrediction(created.prediction.id, {
    timeoutMs: 420_000,
    pollIntervalMs: 3_000,
  });

  if (!waited.ok) {
    return { ok: false, code: "SADTALKER_FAILED", message: waited.error };
  }

  const output = waited.prediction.output;
  const videoUrl =
    typeof output === "string"
      ? output
      : Array.isArray(output)
        ? String(output[0] ?? "")
        : typeof output === "object" && output && "url" in output
          ? String((output as { url?: unknown }).url ?? "")
          : "";

  if (!videoUrl.startsWith("http")) {
    // Refresh once more in case output shape lagged
    const again = await getReplicatePrediction(created.prediction.id);
    const out2 = again?.output;
    const url2 =
      typeof out2 === "string"
        ? out2
        : Array.isArray(out2)
          ? String(out2[0] ?? "")
          : "";
    if (!url2.startsWith("http")) {
      return {
        ok: false,
        code: "SADTALKER_NO_OUTPUT",
        message: "SadTalker finished without a video URL.",
      };
    }
    return {
      ok: true,
      providerJobId: created.prediction.id,
      videoUrl: url2,
      durationSeconds: null,
      rawMeta: { status: again?.status, metrics: again?.metrics },
    };
  }

  return {
    ok: true,
    providerJobId: created.prediction.id,
    videoUrl,
    durationSeconds: null,
    rawMeta: {
      status: waited.prediction.status,
      metrics: waited.prediction.metrics,
    },
  };
}
