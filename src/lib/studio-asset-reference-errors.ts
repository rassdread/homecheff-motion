/** Map raw provider errors to user-safe messages (admin may see raw). */

export type AssetReferenceErrorPresentation = {
  userMessage: string;
  userMessageKey: "studio.assetCreation.reference.generateFailedUser";
  providerMessage: string;
  code: string;
};

export function presentAssetReferenceGenerationError(raw: string): AssetReferenceErrorPresentation {
  const providerMessage = raw.trim() || "Asset reference generation failed.";
  const lower = providerMessage.toLowerCase();

  if (lower.includes("response_format") || lower.includes("unknown parameter")) {
    return {
      userMessageKey: "studio.assetCreation.reference.generateFailedUser",
      userMessage: "",
      providerMessage,
      code: "PROVIDER_PARAMETER",
    };
  }

  if (lower.includes("content_policy") || lower.includes("safety")) {
    return {
      userMessageKey: "studio.assetCreation.reference.generateFailedUser",
      userMessage: "",
      providerMessage,
      code: "CONTENT_POLICY",
    };
  }

  if (lower.includes("rate limit") || lower.includes("429")) {
    return {
      userMessageKey: "studio.assetCreation.reference.generateFailedUser",
      userMessage: "",
      providerMessage,
      code: "RATE_LIMIT",
    };
  }

  return {
    userMessageKey: "studio.assetCreation.reference.generateFailedUser",
    userMessage: "",
    providerMessage,
    code: "GENERATION_FAILED",
  };
}
