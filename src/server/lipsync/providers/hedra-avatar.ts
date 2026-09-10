/**
 * Hedra Avatar v3 — photo + audio → talking avatar with true lipsync + motion.
 * Requires HEDRA_API_KEY and a funded Hedra API wallet.
 */

export async function runHedraAvatarLipsync(input: {
  imageUrl: string;
  audioUrl: string;
  aspectRatio: "9:16" | "1:1" | "16:9";
  durationSeconds?: number;
  behaviorPrompt?: string | null;
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
  const key = process.env.HEDRA_API_KEY?.trim();
  if (!key) {
    return { ok: false, code: "HEDRA_NOT_CONFIGURED", message: "Hedra is not configured." };
  }

  const startImageAsset = await uploadHedraFile(key, input.imageUrl, "image");
  if (!startImageAsset.ok) return startImageAsset;
  const audioAsset = await uploadHedraFile(key, input.audioUrl, "audio");
  if (!audioAsset.ok) return audioAsset;

  const body: Record<string, unknown> = {
    input: {
      aspect_ratio: input.aspectRatio,
      resolution: "720p",
      start_image: startImageAsset.assetId,
      audio: audioAsset.assetId,
      prompt:
        input.behaviorPrompt?.trim() ||
        "Natural talking head, subtle motion, friendly expression, looking at camera.",
    },
  };
  if (input.durationSeconds && input.durationSeconds > 0) {
    (body.input as Record<string, unknown>).duration_ms = Math.round(
      input.durationSeconds * 1000,
    );
  }

  const submit = await fetch("https://api.hedra.com/v3/models/hedra-avatar", {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  const submitJson = (await submit.json().catch(() => ({}))) as {
    job_id?: string;
    error?: string;
    message?: string;
  };
  if (!submit.ok || !submitJson.job_id) {
    return {
      ok: false,
      code: submit.status === 402 ? "HEDRA_INSUFFICIENT_BALANCE" : "HEDRA_SUBMIT_FAILED",
      message: submitJson.error || submitJson.message || "Hedra job submit failed.",
    };
  }

  const jobId = submitJson.job_id;
  const deadline = Date.now() + 420_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    const statusRes = await fetch(`https://api.hedra.com/v3/jobs/${jobId}/status`, {
      headers: { Authorization: `Key ${key}` },
      signal: AbortSignal.timeout(30_000),
    });
    const statusJson = (await statusRes.json().catch(() => ({}))) as {
      status?: string;
      error?: string;
    };
    const status = (statusJson.status || "").toUpperCase();
    if (status === "FAILED" || status === "ERROR" || status === "CANCELLED") {
      return {
        ok: false,
        code: "HEDRA_JOB_FAILED",
        message: statusJson.error || `Hedra job ${status}`,
      };
    }
    if (status === "COMPLETED" || status === "SUCCEEDED" || status === "SUCCESS") {
      const jobRes = await fetch(`https://api.hedra.com/v3/jobs/${jobId}`, {
        headers: { Authorization: `Key ${key}` },
        signal: AbortSignal.timeout(30_000),
      });
      const jobJson = (await jobRes.json().catch(() => ({}))) as {
        outputs?: Array<{ url?: string }>;
      };
      const videoUrl = jobJson.outputs?.find((o) => o.url)?.url;
      if (!videoUrl) {
        return { ok: false, code: "HEDRA_NO_OUTPUT", message: "Hedra completed without video." };
      }
      return {
        ok: true,
        providerJobId: jobId,
        videoUrl,
        durationSeconds: input.durationSeconds ?? null,
        rawMeta: { status },
      };
    }
  }

  return { ok: false, code: "HEDRA_TIMEOUT", message: "Hedra job timed out." };
}

async function uploadHedraFile(
  key: string,
  sourceUrl: string,
  kind: "image" | "audio",
): Promise<{ ok: true; assetId: string } | { ok: false; code: string; message: string }> {
  const fileRes = await fetch(sourceUrl, { signal: AbortSignal.timeout(120_000) });
  if (!fileRes.ok) {
    return { ok: false, code: "HEDRA_SOURCE_FETCH_FAILED", message: `Could not fetch ${kind}.` };
  }
  const buf = Buffer.from(await fileRes.arrayBuffer());
  const contentType =
    fileRes.headers.get("content-type") ||
    (kind === "image" ? "image/jpeg" : "audio/mpeg");
  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(buf)], { type: contentType }),
    kind === "image" ? "face.jpg" : "speech.mp3",
  );

  const up = await fetch("https://api.hedra.com/v3/files", {
    method: "POST",
    headers: { Authorization: `Key ${key}` },
    body: form,
    signal: AbortSignal.timeout(120_000),
  });
  const upJson = (await up.json().catch(() => ({}))) as {
    id?: string;
    asset_id?: string;
    error?: string;
  };
  const assetId = upJson.id || upJson.asset_id;
  if (!up.ok || !assetId) {
    return {
      ok: false,
      code: "HEDRA_UPLOAD_FAILED",
      message: upJson.error || `Hedra ${kind} upload failed.`,
    };
  }
  return { ok: true, assetId };
}
