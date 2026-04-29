import {
  BLOB_IMAGE_THUMB_MAX_BYTES,
  BLOB_IMAGE_THUMB_MAX_LONGEST_SIDE,
  BLOB_IMAGE_WORKING_MAX_LONGEST_SIDE_START,
  getMaxWorkingImageBytesForUploadRole,
} from "@/lib/media-export-constants";

const TARGET_QUALITY_START = 0.8;
const QUALITY_FLOOR = 0.4;
const QUALITY_STEP = 0.06;
const SIDE_SCALE = 0.88;
const ABS_MIN_LONGEST_SIDE = 1024;
const EMERGENCY_MIN_LONGEST_SIDE = 720;
const MAX_ENCODE_ATTEMPTS = 28;

export type ClientImagePreprocessOptions = {
  maxWorkingBytes: number;
  maxThumbnailBytes: number;
  maxThumbnailLongestSide: number;
  maxWorkingLongestSideStart: number;
};

export function getClientImagePreprocessOptionsForRole(role: string): ClientImagePreprocessOptions {
  return {
    maxWorkingBytes: getMaxWorkingImageBytesForUploadRole(role),
    maxThumbnailBytes: BLOB_IMAGE_THUMB_MAX_BYTES,
    maxThumbnailLongestSide: BLOB_IMAGE_THUMB_MAX_LONGEST_SIDE,
    maxWorkingLongestSideStart: BLOB_IMAGE_WORKING_MAX_LONGEST_SIDE_START,
  };
}

/** Default when role is unknown (strictest). */
export function defaultClientImagePreprocessOptions(): ClientImagePreprocessOptions {
  return getClientImagePreprocessOptionsForRole("user");
}

type PreprocessedImage = {
  optimizedBlob: Blob;
  thumbnailBlob: Blob;
  mimeType: string;
  /** Original pixel dimensions before downscaling (for lightweight client heuristics). */
  naturalWidth: number;
  naturalHeight: number;
};

function getOutputMimeType(): "image/jpeg" {
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
 */
async function encodeUnderByteBudget(
  image: HTMLImageElement,
  outputMimeType: "image/jpeg",
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

  throw new Error("Image was too large. We automatically optimized it for you.");
}

export async function preprocessImageFile(
  file: File,
  options: ClientImagePreprocessOptions = defaultClientImagePreprocessOptions()
): Promise<PreprocessedImage> {
  const image = await loadImageElement(file);
  const outputMimeType = getOutputMimeType();

  const optimizedBlob = await encodeUnderByteBudget(image, outputMimeType, {
    maxLongestSideStart: options.maxWorkingLongestSideStart,
    maxBytes: options.maxWorkingBytes,
  });

  const thumbnailBlob = await encodeUnderByteBudget(image, outputMimeType, {
    maxLongestSideStart: options.maxThumbnailLongestSide,
    maxBytes: options.maxThumbnailBytes,
  });

  return {
    optimizedBlob,
    thumbnailBlob,
    mimeType: outputMimeType,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
  };
}
