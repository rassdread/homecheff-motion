const MAX_LONGEST_SIDE = 1536;
const THUMBNAIL_LONGEST_SIDE = 400;
const TARGET_QUALITY = 0.82;

type PreprocessedImage = {
  optimizedBlob: Blob;
  thumbnailBlob: Blob;
  mimeType: string;
  /** Original pixel dimensions before downscaling (for lightweight client heuristics). */
  naturalWidth: number;
  naturalHeight: number;
};

function getOutputMimeType(inputMimeType: string): "image/webp" | "image/jpeg" {
  if (inputMimeType === "image/png" || inputMimeType === "image/webp") {
    return "image/webp";
  }
  return "image/jpeg";
}

function calculateDimensions(
  width: number,
  height: number,
  maxLongestSide: number
): { width: number; height: number } {
  const longestSide = Math.max(width, height);
  if (longestSide <= maxLongestSide) {
    return { width, height };
  }

  const scale = maxLongestSide / longestSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const sourceUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(sourceUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error("Unable to load image"));
    };
    image.src = sourceUrl;
  });
}

function blobFromCanvas(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Unable to generate blob"));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality
    );
  });
}

async function renderBlob(
  image: HTMLImageElement,
  maxLongestSide: number,
  outputMimeType: string
): Promise<Blob> {
  const dimensions = calculateDimensions(image.width, image.height, maxLongestSide);
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context is unavailable");
  }

  context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
  return blobFromCanvas(canvas, outputMimeType, TARGET_QUALITY);
}

export async function preprocessImageFile(file: File): Promise<PreprocessedImage> {
  const image = await loadImageElement(file);
  const outputMimeType = getOutputMimeType(file.type);

  const optimizedBlob = await renderBlob(image, MAX_LONGEST_SIDE, outputMimeType);
  const thumbnailBlob = await renderBlob(image, THUMBNAIL_LONGEST_SIDE, outputMimeType);

  return {
    optimizedBlob,
    thumbnailBlob,
    mimeType: outputMimeType,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
  };
}
