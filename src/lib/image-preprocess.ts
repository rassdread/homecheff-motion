import { MAX_OPTIMIZED_IMAGE_BYTES } from "@/lib/animation-upload-limits";

const MAX_LONGEST_SIDE_START = 1536;
const THUMBNAIL_LONGEST_SIDE = 400;
const TARGET_QUALITY_START = 0.82;
const QUALITY_FLOOR = 0.56;
const QUALITY_STEP = 0.06;
const SIDE_SCALE = 0.88;
const ABS_MIN_LONGEST_SIDE = 960;
const EMERGENCY_MIN_LONGEST_SIDE = 720;
const MAX_ENCODE_ATTEMPTS = 28;

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

async function renderBlobOnce(
  image: HTMLImageElement,
  maxLongestSide: number,
  outputMimeType: string,
  quality: number
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
  return blobFromCanvas(canvas, outputMimeType, quality);
}

/**
 * Encode canvas output under a byte budget by lowering quality, then longest side,
 * in steps — same idea as HomeCheff `compressDataUrl` retries, without data-url churn.
 * Output is always a full valid image blob (no partial/corrupt uploads).
 */
async function encodeUnderByteBudget(
  image: HTMLImageElement,
  outputMimeType: "image/webp" | "image/jpeg",
  options: {
    maxLongestSideStart: number;
    maxBytes: number;
  }
): Promise<Blob> {
  const { maxLongestSideStart, maxBytes } = options;
  let quality = TARGET_QUALITY_START;
  let longestSide = maxLongestSideStart;

  for (let attempt = 0; attempt < MAX_ENCODE_ATTEMPTS; attempt++) {
    const blob = await renderBlobOnce(image, longestSide, outputMimeType, quality);
    if (blob.size <= maxBytes) {
      return blob;
    }

    if (quality > QUALITY_FLOOR + 0.001) {
      quality = Math.max(QUALITY_FLOOR, quality - QUALITY_STEP);
      continue;
    }

    if (longestSide > ABS_MIN_LONGEST_SIDE) {
      longestSide = Math.max(ABS_MIN_LONGEST_SIDE, Math.floor(longestSide * SIDE_SCALE));
      quality = Math.min(TARGET_QUALITY_START, quality + 0.12);
      continue;
    }

    if (longestSide > EMERGENCY_MIN_LONGEST_SIDE) {
      longestSide = Math.max(EMERGENCY_MIN_LONGEST_SIDE, Math.floor(longestSide * SIDE_SCALE));
      quality = Math.min(TARGET_QUALITY_START, quality + 0.1);
      continue;
    }

    quality = Math.max(QUALITY_FLOOR, quality - 0.04);
  }

  for (const side of [EMERGENCY_MIN_LONGEST_SIDE, 640, 512] as const) {
    const blob = await renderBlobOnce(image, side, outputMimeType, QUALITY_FLOOR);
    if (blob.size <= maxBytes) {
      return blob;
    }
  }

  throw new Error("Image remains too large after compression");
}

export async function preprocessImageFile(file: File): Promise<PreprocessedImage> {
  const image = await loadImageElement(file);
  const outputMimeType = getOutputMimeType(file.type);

  const optimizedBlob = await encodeUnderByteBudget(image, outputMimeType, {
    maxLongestSideStart: MAX_LONGEST_SIDE_START,
    maxBytes: MAX_OPTIMIZED_IMAGE_BYTES,
  });

  const thumbnailBlob = await encodeUnderByteBudget(image, outputMimeType, {
    maxLongestSideStart: THUMBNAIL_LONGEST_SIDE,
    maxBytes: MAX_OPTIMIZED_IMAGE_BYTES,
  });

  return {
    optimizedBlob,
    thumbnailBlob,
    mimeType: outputMimeType,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
  };
}
