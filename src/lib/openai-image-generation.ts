/** OpenAI /v1/images/generations + /v1/images/edits request helpers — model-aware parameter gating. */

const OPENAI_IMAGE_GENERATIONS_URL = "https://api.openai.com/v1/images/generations";
const OPENAI_IMAGE_EDITS_URL = "https://api.openai.com/v1/images/edits";

export function resolveOpenAiImageModel(): string {
  return (
    process.env.STUDIO_SCENE_IMAGE_MODEL?.trim() ||
    process.env.OPENAI_IMAGE_MODEL?.trim() ||
    "dall-e-3"
  );
}

/** Model used for source-image edit when the primary model is text-only (e.g. dall-e-3). */
export function resolveOpenAiImageEditModel(): string {
  const primary = resolveOpenAiImageModel();
  if (openAiImageModelSupportsEdit(primary)) {
    return primary;
  }
  return (
    process.env.STUDIO_SCENE_IMAGE_EDIT_MODEL?.trim() ||
    process.env.OPENAI_IMAGE_EDIT_MODEL?.trim() ||
    "gpt-image-1"
  );
}

export function openAiImageModelSupportsEdit(model: string): boolean {
  const normalized = model.trim().toLowerCase();
  return (
    normalized.startsWith("gpt-image") ||
    normalized.startsWith("chatgpt-image") ||
    normalized.startsWith("dall-e-2")
  );
}

export function openAiImageEditSupportsInputFidelity(model: string): boolean {
  const normalized = model.trim().toLowerCase();
  if (normalized.startsWith("gpt-image-2")) {
    return false;
  }
  return normalized.startsWith("gpt-image-1") || normalized.startsWith("gpt-image-1.5");
}

/** DALL-E 2/3 accept response_format; gpt-image and unknown models must not send it. */
export function openAiImageGenerationSupportsResponseFormat(model: string): boolean {
  const normalized = model.trim().toLowerCase();
  if (normalized.startsWith("gpt-image")) {
    return false;
  }
  return normalized.startsWith("dall-e-2") || normalized.startsWith("dall-e-3");
}

export function buildOpenAiImageGenerationsBody(params: {
  model: string;
  prompt: string;
  size: string;
  n?: number;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: params.model,
    prompt: params.prompt.slice(0, 4000),
    n: params.n ?? 1,
    size: params.size,
  };
  if (openAiImageGenerationSupportsResponseFormat(params.model)) {
    body.response_format = "url";
  }
  return body;
}

/** Last-line safety net before fetch — strips response_format for gpt-image even if a helper added it. */
export function stripUnsafeOpenAiImageGenerationParams(
  body: Record<string, unknown>
): Record<string, unknown> {
  const safe = { ...body };
  const model = String(safe.model ?? "").trim().toLowerCase();
  if (model.startsWith("gpt-image")) {
    delete safe.response_format;
  }
  if (!openAiImageGenerationSupportsResponseFormat(String(safe.model ?? ""))) {
    delete safe.response_format;
  }
  return safe;
}

export function prepareOpenAiImageGenerationsBody(params: {
  model: string;
  prompt: string;
  size: string;
  n?: number;
}): Record<string, unknown> {
  return stripUnsafeOpenAiImageGenerationParams(buildOpenAiImageGenerationsBody(params));
}

export type OpenAiImageGenerationLogContext = {
  helperPath: string;
  route?: string;
  model: string;
  body: Record<string, unknown>;
};

/** Temporary production diagnostics — logs model/body keys before OpenAI fetch. */
export function logOpenAiImageGenerationRequest(context: OpenAiImageGenerationLogContext): void {
  console.info(
    "[studio-openai-image-generations]",
    JSON.stringify({
      route: context.route ?? null,
      helperPath: context.helperPath,
      model: context.model,
      bodyModel: String(context.body.model ?? ""),
      envStudioSceneImageModel: process.env.STUDIO_SCENE_IMAGE_MODEL?.trim() ?? null,
      envOpenAiImageModel: process.env.OPENAI_IMAGE_MODEL?.trim() ?? null,
      bodyKeys: Object.keys(context.body),
      includesResponseFormat: Object.prototype.hasOwnProperty.call(context.body, "response_format"),
      timestamp: new Date().toISOString(),
    })
  );
}

export async function fetchOpenAiImageGenerations(params: {
  apiKey: string;
  body: Record<string, unknown>;
  logContext?: Omit<OpenAiImageGenerationLogContext, "body" | "model"> & {
    model?: string;
  };
}): Promise<Response> {
  const model = String(params.body.model ?? params.logContext?.model ?? resolveOpenAiImageModel());
  const body = stripUnsafeOpenAiImageGenerationParams({ ...params.body, model });

  logOpenAiImageGenerationRequest({
    helperPath: params.logContext?.helperPath ?? "fetchOpenAiImageGenerations",
    route: params.logContext?.route,
    model,
    body,
  });

  return fetch(OPENAI_IMAGE_GENERATIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export type OpenAiImageEditParams = {
  model: string;
  prompt: string;
  size: string;
  imageBuffer: Buffer;
  imageFilename?: string;
  imageContentType?: string;
  inputFidelity?: "high" | "low";
  n?: number;
};

export function buildOpenAiImageEditFormData(params: OpenAiImageEditParams): FormData {
  const bytes = new Uint8Array(params.imageBuffer);
  const blob = new Blob([bytes], {
    type: params.imageContentType ?? "image/png",
  });
  const form = new FormData();
  form.append("model", params.model);
  form.append("prompt", params.prompt.slice(0, 32000));
  form.append("size", params.size);
  form.append("n", String(params.n ?? 1));
  form.append("image", blob, params.imageFilename ?? "source.png");
  if (
    params.inputFidelity &&
    openAiImageEditSupportsInputFidelity(params.model)
  ) {
    form.append("input_fidelity", params.inputFidelity);
  }
  return form;
}

export type OpenAiImageEditLogContext = {
  helperPath: string;
  route?: string;
  model: string;
  hasSourceImage: boolean;
  inputFidelity?: "high" | "low" | null;
};

export function logOpenAiImageEditRequest(context: OpenAiImageEditLogContext): void {
  console.info(
    "[studio-openai-image-edits]",
    JSON.stringify({
      route: context.route ?? null,
      helperPath: context.helperPath,
      model: context.model,
      hasSourceImage: context.hasSourceImage,
      inputFidelity: context.inputFidelity ?? null,
      timestamp: new Date().toISOString(),
    })
  );
}

export async function fetchSourceImageBuffer(imageUrl: string): Promise<{
  buffer: Buffer;
  contentType: string;
  filename: string;
}> {
  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch source image (${res.status}).`);
  }
  const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext =
    contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg"
    : contentType.includes("webp") ? "webp"
    : "png";
  return { buffer, contentType, filename: `source.${ext}` };
}

export async function fetchOpenAiImageEdits(params: {
  apiKey: string;
  edit: OpenAiImageEditParams;
  logContext?: Omit<OpenAiImageEditLogContext, "model" | "hasSourceImage" | "inputFidelity"> & {
    model?: string;
  };
}): Promise<Response> {
  const model = params.edit.model || params.logContext?.model || resolveOpenAiImageEditModel();
  const editParams: OpenAiImageEditParams = { ...params.edit, model };

  logOpenAiImageEditRequest({
    helperPath: params.logContext?.helperPath ?? "fetchOpenAiImageEdits",
    route: params.logContext?.route,
    model,
    hasSourceImage: true,
    inputFidelity: editParams.inputFidelity ?? null,
  });

  const form = buildOpenAiImageEditFormData(editParams);
  return fetch(OPENAI_IMAGE_EDITS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: form,
  });
}
