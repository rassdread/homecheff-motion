/** OpenAI /v1/images/generations request helpers — model-aware parameter gating. */

const OPENAI_IMAGE_GENERATIONS_URL = "https://api.openai.com/v1/images/generations";

export function resolveOpenAiImageModel(): string {
  return (
    process.env.STUDIO_SCENE_IMAGE_MODEL?.trim() ||
    process.env.OPENAI_IMAGE_MODEL?.trim() ||
    "dall-e-3"
  );
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
