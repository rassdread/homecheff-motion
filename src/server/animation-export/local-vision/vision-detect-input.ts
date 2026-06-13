import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export type VisionDetectImageInput = {
  imageUrl?: string;
  imagePath?: string;
  imageBase64?: string;
};

export async function resolveVisionDetectTempPath(
  input: VisionDetectImageInput
): Promise<{ tempPath: string; cleanup: boolean }> {
  const existingPath = input.imagePath?.trim();
  if (existingPath) {
    return { tempPath: existingPath, cleanup: false };
  }

  const imageUrl = input.imageUrl?.trim();
  if (imageUrl) {
    const res = await fetch(imageUrl, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Could not fetch image (${res.status}).`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "image/png";
    const ext =
      contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";
    const tempPath = path.join(os.tmpdir(), `hc-vision-detect-${Date.now()}.${ext}`);
    await fs.writeFile(tempPath, buffer);
    return { tempPath, cleanup: true };
  }

  const imageBase64 = input.imageBase64?.trim();
  if (imageBase64) {
    const normalized = imageBase64.replace(/^data:image\/[a-z+]+;base64,/, "");
    const buffer = Buffer.from(normalized, "base64");
    const tempPath = path.join(os.tmpdir(), `hc-vision-detect-${Date.now()}.png`);
    await fs.writeFile(tempPath, buffer);
    return { tempPath, cleanup: true };
  }

  throw new Error("imageUrl, imagePath, or imageBase64 is required.");
}

export async function withVisionDetectTempPath<T>(
  input: VisionDetectImageInput,
  run: (tempPath: string) => Promise<T>
): Promise<T> {
  const { tempPath, cleanup } = await resolveVisionDetectTempPath(input);
  try {
    return await run(tempPath);
  } finally {
    if (cleanup) {
      await fs.unlink(tempPath).catch(() => undefined);
    }
  }
}
