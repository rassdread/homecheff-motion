import { getSelectedSceneImageProviderId } from "@/server/scene-image-providers";
import type { CorrectionRecommendation } from "@/types/studio-correction";
import type { StudioSceneImageListItem } from "@/types/studio-scene-image";

export type RegenerationGuardResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export function validateSceneImageRegeneration(params: {
  source: StudioSceneImageListItem | null | undefined;
  recommendations: CorrectionRecommendation[];
  providerAvailable?: boolean;
}): RegenerationGuardResult {
  if (!params.source || params.source.status !== "completed") {
    return {
      ok: false,
      code: "NO_SOURCE_IMAGE",
      message: "Select a completed scene image to improve.",
    };
  }
  if (!params.source.generatedPrompt.trim()) {
    return {
      ok: false,
      code: "MISSING_PROMPT",
      message: "Scene prompt is missing on the source image.",
    };
  }
  if (params.recommendations.length === 0) {
    return {
      ok: false,
      code: "NO_RECOMMENDATIONS",
      message: "No correction recommendations to apply. Run consistency or vision analysis first.",
    };
  }
  if (params.providerAvailable === false) {
    return {
      ok: false,
      code: "PROVIDER_UNAVAILABLE",
      message: "Scene image provider is not available.",
    };
  }
  return { ok: true };
}

export function isSceneImageProviderAvailable(): boolean {
  const id = getSelectedSceneImageProviderId();
  if (id === "mock") {
    return true;
  }
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function regenerationCostNote(): { isMock: boolean; messageKey: string } {
  const isMock = getSelectedSceneImageProviderId() === "mock";
  return {
    isMock,
    messageKey: isMock
      ? "studio.improve.costNoteMock"
      : "studio.improve.costNoteLive",
  };
}
