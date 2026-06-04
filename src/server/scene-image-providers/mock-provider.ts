import { createHash } from "node:crypto";
import type { SceneImageGenerateInput, SceneImageGenerateResult, SceneImageProvider } from "@/server/scene-image-providers/types";

/** Minimal 1×1 PNG (valid image bytes for blob upload). */
const MIN_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

async function tryResizeWithSharp(buffer: Buffer, size: number): Promise<Buffer | null> {
  try {
    const sharp = (await import("sharp")).default;
    return await sharp(buffer)
      .resize(size, size, { fit: "cover" })
      .png()
      .toBuffer();
  } catch {
    return null;
  }
}

export class MockSceneImageProvider implements SceneImageProvider {
  readonly id = "mock";

  async generate(input: SceneImageGenerateInput): Promise<SceneImageGenerateResult> {
    const hash = createHash("sha256")
      .update(`${input.sceneId}:${input.imageRecordId}:${input.prompt.slice(0, 200)}`)
      .digest("hex")
      .slice(0, 12);
    const seed = input.seed ?? hash;

    const imageBuffer = (await tryResizeWithSharp(MIN_PNG, 512)) ?? MIN_PNG;
    const thumbnailBuffer = (await tryResizeWithSharp(MIN_PNG, 128)) ?? MIN_PNG;

    return {
      imageBuffer,
      thumbnailBuffer,
      contentType: "image/png",
      provider: this.id,
      seed,
      model: "mock-placeholder",
      size: "512x512",
    };
  }
}
