import {
  fetchOpenAiImageEdits,
  fetchSourceImageBuffer,
  openAiImageModelSupportsEdit,
  resolveOpenAiImageEditModel,
} from "@/lib/openai-image-generation";
import { recordEditorVisionMetric } from "@/lib/editor-vision-metrics";
import { validateEditorSegmentImageSource } from "@/server/editor/editor-image-ownership";
import { editorMaskStoragePath } from "@/server/editor/editor-mask-storage";
import { uploadPublicBlob } from "@/lib/vercel-blob-config";
import sharp from "sharp";

type OpenAiImageResponse = {
  data?: Array<{ url?: string; b64_json?: string }>;
  error?: { message?: string };
};

export type EditorMaskedEditResult =
  | { ok: true; resultUrl: string; storageKey: string; jobId: string }
  | { ok: false; code: "VALIDATION" | "OPENAI" | "STORAGE" | "UNAVAILABLE"; message: string; jobId: string };

async function extractOpenAiImageBuffer(payload: OpenAiImageResponse): Promise<Buffer | null> {
  const item = payload.data?.[0];
  if (item?.b64_json) {
    return Buffer.from(item.b64_json, "base64");
  }
  if (item?.url) {
    const res = await fetch(item.url, { cache: "no-store" });
    if (res.ok) {
      return Buffer.from(await res.arrayBuffer());
    }
  }
  return null;
}

/** OpenAI edits: transparent mask regions are inpainted. Invert selection mask accordingly. */
export async function buildOpenAiInpaintMaskBuffer(maskBuffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(maskBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const alphaIdx = channels - 1;
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += channels) {
    const alpha = data[i + alphaIdx] ?? 0;
    const isObject = alpha > 24;
    const value = isObject ? 0 : 255;
    out[i] = value;
    out[i + 1] = value;
    out[i + 2] = value;
    out[i + alphaIdx] = 255;
  }
  return sharp(out, {
    raw: { width: info.width, height: info.height, channels },
  })
    .png()
    .toBuffer();
}

function resolveOpenAiEditSize(width: number, height: number): string {
  const ratio = width / height;
  if (ratio > 1.2) {
    return "1536x1024";
  }
  if (ratio < 0.8) {
    return "1024x1536";
  }
  return "1024x1024";
}

export async function executeEditorMaskedRemove(params: {
  userId: string;
  sessionId: string;
  layerId: string;
  imageUrl: string;
  maskUrl: string;
  objectLabel: string;
  backgroundStorageKey?: string;
  jobId: string;
}): Promise<EditorMaskedEditResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, code: "UNAVAILABLE", message: "OpenAI is not configured.", jobId: params.jobId };
  }

  const validated = validateEditorSegmentImageSource({
    imageUrl: params.imageUrl,
    backgroundStorageKey: params.backgroundStorageKey,
    userId: params.userId,
  });
  if (!validated.ok) {
    return { ok: false, code: "VALIDATION", message: validated.error, jobId: params.jobId };
  }
  if (validated.source !== "url" || !validated.imageUrl) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Masked edits require an HTTP image URL.",
      jobId: params.jobId,
    };
  }

  const editModel = resolveOpenAiImageEditModel();
  if (!openAiImageModelSupportsEdit(editModel)) {
    return {
      ok: false,
      code: "UNAVAILABLE",
      message: "Image edit model does not support masked edits.",
      jobId: params.jobId,
    };
  }

  try {
    const source = await fetchSourceImageBuffer(validated.imageUrl);
    const maskRes = await fetch(params.maskUrl, { cache: "no-store" });
    if (!maskRes.ok) {
      return { ok: false, code: "VALIDATION", message: "Could not load mask.", jobId: params.jobId };
    }
    const maskBuffer = Buffer.from(await maskRes.arrayBuffer());
    const openAiMask = await buildOpenAiInpaintMaskBuffer(maskBuffer);
    const meta = await sharp(source.buffer).metadata();
    const size = resolveOpenAiEditSize(meta.width ?? 1024, meta.height ?? 1024);

    const prompt = `Remove the ${params.objectLabel} from this image. Fill the removed area naturally, preserving lighting, perspective, and surrounding details. Seamless inpainting with no artifacts.`;

    const res = await fetchOpenAiImageEdits({
      apiKey,
      edit: {
        model: editModel,
        prompt,
        size,
        imageBuffer: source.buffer,
        imageFilename: source.filename,
        imageContentType: source.contentType,
        maskBuffer: openAiMask,
        maskFilename: "mask.png",
        inputFidelity: "high",
        n: 1,
      },
      logContext: {
        helperPath: "executeEditorMaskedRemove",
        route: "/api/editor/edit/remove",
        model: editModel,
      },
    });

    const payload = (await res.json()) as OpenAiImageResponse;
    if (!res.ok) {
      recordEditorVisionMetric({ type: "openai_edit", success: false, operation: "remove" });
      return {
        ok: false,
        code: "OPENAI",
        message: payload.error?.message ?? `OpenAI edit failed (${res.status}).`,
        jobId: params.jobId,
      };
    }

    const resultBuffer = await extractOpenAiImageBuffer(payload);
    if (!resultBuffer) {
      recordEditorVisionMetric({ type: "openai_edit", success: false, operation: "remove" });
      return { ok: false, code: "OPENAI", message: "OpenAI returned no image.", jobId: params.jobId };
    }

    const storagePath = editorMaskStoragePath({
      userId: params.userId,
      sessionId: params.sessionId,
      objectId: `${params.layerId}-remove`,
      kind: "cutout",
    }).replace("/cutouts/", "/edits/");

    const uploaded = await uploadPublicBlob({
      pathname: storagePath,
      body: resultBuffer,
      contentType: "image/png",
      addRandomSuffix: false,
      allowOverwrite: true,
      context: { uploadTarget: storagePath, provider: "editor-masked-remove" },
    });

    recordEditorVisionMetric({ type: "openai_edit", success: true, operation: "remove" });
    return {
      ok: true,
      resultUrl: uploaded.url,
      storageKey: storagePath,
      jobId: params.jobId,
    };
  } catch (error) {
    recordEditorVisionMetric({ type: "openai_edit", success: false, operation: "remove" });
    return {
      ok: false,
      code: "OPENAI",
      message: error instanceof Error ? error.message : "Masked remove failed.",
      jobId: params.jobId,
    };
  }
}

export async function executeEditorMaskedReplace(params: {
  userId: string;
  sessionId: string;
  layerId: string;
  imageUrl: string;
  maskUrl: string;
  objectLabel: string;
  prompt: string;
  backgroundStorageKey?: string;
  jobId: string;
}): Promise<EditorMaskedEditResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, code: "UNAVAILABLE", message: "OpenAI is not configured.", jobId: params.jobId };
  }

  const validated = validateEditorSegmentImageSource({
    imageUrl: params.imageUrl,
    backgroundStorageKey: params.backgroundStorageKey,
    userId: params.userId,
  });
  if (!validated.ok) {
    return { ok: false, code: "VALIDATION", message: validated.error, jobId: params.jobId };
  }
  if (validated.source !== "url" || !validated.imageUrl) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Masked edits require an HTTP image URL.",
      jobId: params.jobId,
    };
  }

  const editModel = resolveOpenAiImageEditModel();
  if (!openAiImageModelSupportsEdit(editModel)) {
    return {
      ok: false,
      code: "UNAVAILABLE",
      message: "Image edit model does not support masked edits.",
      jobId: params.jobId,
    };
  }

  try {
    const source = await fetchSourceImageBuffer(validated.imageUrl);
    const maskRes = await fetch(params.maskUrl, { cache: "no-store" });
    if (!maskRes.ok) {
      return { ok: false, code: "VALIDATION", message: "Could not load mask.", jobId: params.jobId };
    }
    const maskBuffer = Buffer.from(await maskRes.arrayBuffer());
    const openAiMask = await buildOpenAiInpaintMaskBuffer(maskBuffer);
    const meta = await sharp(source.buffer).metadata();
    const size = resolveOpenAiEditSize(meta.width ?? 1024, meta.height ?? 1024);

    const prompt = `${params.prompt.trim()}. Replace only the ${params.objectLabel} region. Preserve lighting, perspective, shadows, and composition of the surrounding image.`;

    const res = await fetchOpenAiImageEdits({
      apiKey,
      edit: {
        model: editModel,
        prompt,
        size,
        imageBuffer: source.buffer,
        imageFilename: source.filename,
        imageContentType: source.contentType,
        maskBuffer: openAiMask,
        maskFilename: "mask.png",
        inputFidelity: "high",
        n: 1,
      },
      logContext: {
        helperPath: "executeEditorMaskedReplace",
        route: "/api/editor/edit/replace",
        model: editModel,
      },
    });

    const payload = (await res.json()) as OpenAiImageResponse;
    if (!res.ok) {
      recordEditorVisionMetric({ type: "openai_edit", success: false, operation: "replace" });
      return {
        ok: false,
        code: "OPENAI",
        message: payload.error?.message ?? `OpenAI edit failed (${res.status}).`,
        jobId: params.jobId,
      };
    }

    const resultBuffer = await extractOpenAiImageBuffer(payload);
    if (!resultBuffer) {
      recordEditorVisionMetric({ type: "openai_edit", success: false, operation: "replace" });
      return { ok: false, code: "OPENAI", message: "OpenAI returned no image.", jobId: params.jobId };
    }

    const storagePath = editorMaskStoragePath({
      userId: params.userId,
      sessionId: params.sessionId,
      objectId: `${params.layerId}-replace`,
      kind: "cutout",
    }).replace("/cutouts/", "/edits/");

    const uploaded = await uploadPublicBlob({
      pathname: storagePath,
      body: resultBuffer,
      contentType: "image/png",
      addRandomSuffix: false,
      allowOverwrite: true,
      context: { uploadTarget: storagePath, provider: "editor-masked-replace" },
    });

    recordEditorVisionMetric({ type: "openai_edit", success: true, operation: "replace" });
    return {
      ok: true,
      resultUrl: uploaded.url,
      storageKey: storagePath,
      jobId: params.jobId,
    };
  } catch (error) {
    recordEditorVisionMetric({ type: "openai_edit", success: false, operation: "replace" });
    return {
      ok: false,
      code: "OPENAI",
      message: error instanceof Error ? error.message : "Masked replace failed.",
      jobId: params.jobId,
    };
  }
}
