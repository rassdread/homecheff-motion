/** OpenAI /v1/images/generations request helpers — model-aware parameter gating. */

export function resolveOpenAiImageModel(): string {
  return process.env.STUDIO_SCENE_IMAGE_MODEL?.trim() || "dall-e-3";
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
