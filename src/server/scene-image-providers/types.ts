export type SceneImageGenerateInput = {
  prompt: string;
  sceneId: string;
  imageRecordId: string;
  ownerId: string;
  seed?: string;
  /** Server log context for OpenAI image generation diagnostics. */
  logRoute?: string;
  /** Source image URL for transform / image-edit flows. */
  sourceImageUrl?: string;
  /** Internal generation intent — image edit when transform + source image. */
  generationIntent?: import("@/types/studio-asset-image-generation").AssetGenerationIntent;
  /** Identity lock level for transform prompts (1 = default, 2 = strict). */
  identityLockLevel?: import("@/types/studio-asset-image-generation").AssetIdentityLockLevel;
  /** S2A — reference images accounted at the adapter boundary (may be unused if TEXT_ONLY). */
  referenceImages?: Array<{
    url: string;
    entityId: string;
    role: string;
    exactness?: "MUST_PRESERVE" | "SHOULD_MATCH" | "STYLE_REFERENCE_ONLY";
  }>;
};

export type SceneImageGenerateResult = {
  imageBuffer: Buffer;
  thumbnailBuffer: Buffer;
  contentType: string;
  provider: string;
  seed: string | null;
  model?: string;
  size?: string;
  /** How the image was produced. */
  generationMode?: import("@/types/studio-asset-image-generation").AssetImageGenerationMode;
};

export type SceneImageProvider = {
  readonly id: string;
  generate(input: SceneImageGenerateInput): Promise<SceneImageGenerateResult>;
};
