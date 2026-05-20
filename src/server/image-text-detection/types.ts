import type { DetectedTextBlock } from "@/lib/baked-text-detection";

export type ImageTextDetectionProviderId =
  | "google_vision"
  | "openai_vision"
  | "tesseract_dev"
  | "unavailable";

export type ImageTextDetectionResult = {
  provider: ImageTextDetectionProviderId;
  blocks: DetectedTextBlock[];
  imageWidth: number;
  imageHeight: number;
};

export type ImageTextDetectionMode = "fast" | "full";

export type ImageTextDetectionOptions = {
  mode?: ImageTextDetectionMode;
};

export type ImageTextDetectionProvider = {
  id: ImageTextDetectionProviderId;
  detectTextBlocks(
    inputImageUrl: string,
    options?: ImageTextDetectionOptions
  ): Promise<ImageTextDetectionResult>;
};
