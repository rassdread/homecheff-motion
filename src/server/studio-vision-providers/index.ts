import { MockStudioVisionProvider } from "@/server/studio-vision-providers/mock-vision-provider";
import { OpenAiStudioVisionProvider } from "@/server/studio-vision-providers/openai-vision-provider";
import type { StudioVisionProvider } from "@/server/studio-vision-providers/types";

export * from "@/server/studio-vision-providers/types";

export type StudioVisionProviderId = "openai" | "mock";

export function getSelectedStudioVisionProviderId(): StudioVisionProviderId {
  const forced = process.env.STUDIO_VISION_PROVIDER?.trim().toLowerCase();
  if (forced === "openai" || forced === "mock") {
    return forced;
  }
  if (process.env.OPENAI_API_KEY?.trim()) {
    return "openai";
  }
  return "mock";
}

export function getStudioVisionProvider(): StudioVisionProvider {
  if (getSelectedStudioVisionProviderId() === "openai") {
    return new OpenAiStudioVisionProvider();
  }
  return new MockStudioVisionProvider();
}
