/** Load a sample frame into a MediaPipe-compatible ImageData shape (Node.js). */

export type MediaPipeImageSource = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
};

export async function loadMediaPipeImageSource(imagePath: string): Promise<MediaPipeImageSource> {
  const sharp = (await import("sharp")).default;
  const { data, info } = await sharp(imagePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    data: new Uint8ClampedArray(data),
    width: info.width,
    height: info.height,
  };
}
