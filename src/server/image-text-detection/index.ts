import { OcrProviderError } from "@/lib/ocr-provider-errors";
import { createGoogleVisionTextDetectionProvider } from "@/server/image-text-detection/google-vision-provider";
import { createOpenAiVisionTextDetectionProvider } from "@/server/image-text-detection/openai-vision-provider";
import type { ImageTextDetectionProvider } from "@/server/image-text-detection/types";

export type { ImageTextDetectionProvider, ImageTextDetectionResult } from "@/server/image-text-detection/types";

export function resolveImageTextDetectionProvider(): ImageTextDetectionProvider | null {
  const googleKey = process.env.GOOGLE_VISION_API_KEY?.trim();
  if (googleKey) {
    return createGoogleVisionTextDetectionProvider(googleKey);
  }
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  if (openAiKey) {
    return createOpenAiVisionTextDetectionProvider(openAiKey);
  }
  return null;
}

export async function detectTextBlocksFromImageUrl(imageUrl: string) {
  const provider = resolveImageTextDetectionProvider();
  if (!provider) {
    throw new OcrProviderError(
      "OCR_PROVIDER_NOT_CONFIGURED",
      "OCR is not configured. Set GOOGLE_VISION_API_KEY or OPENAI_API_KEY on the server."
    );
  }
  return provider.detectTextBlocks(imageUrl);
}
