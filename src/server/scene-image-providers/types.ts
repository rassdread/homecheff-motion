export type SceneImageGenerateInput = {
  prompt: string;
  sceneId: string;
  imageRecordId: string;
  ownerId: string;
  seed?: string;
  /** Server log context for OpenAI image generation diagnostics. */
  logRoute?: string;
};

export type SceneImageGenerateResult = {
  imageBuffer: Buffer;
  thumbnailBuffer: Buffer;
  contentType: string;
  provider: string;
  seed: string | null;
  model?: string;
  size?: string;
};

export type SceneImageProvider = {
  readonly id: string;
  generate(input: SceneImageGenerateInput): Promise<SceneImageGenerateResult>;
};
