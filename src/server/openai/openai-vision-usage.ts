import { estimateOpenAiVisionCostUsd } from "@/lib/studio-cost-estimates";

export type OpenAiVisionCostSource = "token_usage" | "flat_estimate";

export type OpenAiVisionUsageMetrics = {
  model: string;
  durationMs: number;
  imageCount: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  costSource: OpenAiVisionCostSource;
  estimatedCostUsd: number;
  actualCostUsd?: number;
};

export function parseOpenAiChatCompletionUsage(body: {
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}): Pick<OpenAiVisionUsageMetrics, "inputTokens" | "outputTokens" | "totalTokens"> {
  const usage = body.usage;
  if (!usage) {
    return {};
  }
  return {
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
  };
}

export function buildOpenAiVisionUsageMetrics(input: {
  model: string;
  durationMs: number;
  imageCount: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}): OpenAiVisionUsageMetrics {
  const hasTokenUsage =
    typeof input.inputTokens === "number" ||
    typeof input.outputTokens === "number" ||
    typeof input.totalTokens === "number";

  const estimatedCostUsd = estimateOpenAiVisionCostUsd(input.imageCount);

  return {
    model: input.model,
    durationMs: input.durationMs,
    imageCount: input.imageCount,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    totalTokens: input.totalTokens,
    costSource: hasTokenUsage ? "token_usage" : "flat_estimate",
    estimatedCostUsd,
    actualCostUsd: hasTokenUsage ? estimatedCostUsd : undefined,
  };
}
