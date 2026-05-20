import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import sharp from "sharp";
import {
  buildImageUploadErrorBody,
  classifyImageUploadFailure,
  createImageUploadRequestId,
  isBlobTokenConfigured,
  logInstantImages,
  logInstantImagesError,
} from "@/lib/instant-image-upload-errors";
import { BLOB_IMAGE_THUMB_MAX_BYTES, getMaxWorkingImageBytesForUploadRole } from "@/lib/media-export-constants";
import type { UploadImageResponse } from "@/types/animation-api";
import { requireActiveUser } from "@/server/auth/permissions";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function extensionFromMimeType(mimeType: string): string {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  return "webp";
}

function uploadErrorResponse(
  requestId: string,
  code: ReturnType<typeof classifyImageUploadFailure>["code"],
  httpStatus: number,
  logMessage: string,
  extra?: Record<string, unknown>
) {
  logInstantImagesError(requestId, code, logMessage, extra);
  return NextResponse.json(buildImageUploadErrorBody({ code, requestId }), { status: httpStatus });
}

export async function POST(request: Request) {
  const requestId = createImageUploadRequestId();
  logInstantImages("start", requestId);

  try {
    const user = await requireActiveUser();
    if (user instanceof NextResponse) {
      return user;
    }

    if (!isBlobTokenConfigured()) {
      return uploadErrorResponse(
        requestId,
        "BLOB_UPLOAD_FAILED",
        503,
        "BLOB_READ_WRITE_TOKEN is not configured."
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      const classified = classifyImageUploadFailure(error);
      return uploadErrorResponse(requestId, classified.code, classified.httpStatus, classified.logMessage, {
        phase: "formData",
      });
    }

    const workingImage = formData.get("workingImage");
    const thumbnailImage = formData.get("thumbnailImage");
    const originalFileName = formData.get("originalFileName");
    const mimeType = formData.get("mimeType");
    const sizeBytes = formData.get("sizeBytes");
    const clientUploadId = formData.get("clientUploadId");

    if (
      !(workingImage instanceof File) ||
      !(thumbnailImage instanceof File) ||
      typeof originalFileName !== "string" ||
      typeof mimeType !== "string" ||
      typeof sizeBytes !== "string" ||
      typeof clientUploadId !== "string"
    ) {
      return uploadErrorResponse(
        requestId,
        "IMAGE_UPLOAD_FAILED",
        400,
        "Missing required upload fields."
      );
    }

    const parsedSizeBytes = Number(sizeBytes);
    if (!Number.isFinite(parsedSizeBytes) || parsedSizeBytes <= 0) {
      return uploadErrorResponse(requestId, "IMAGE_UPLOAD_FAILED", 400, "Invalid sizeBytes value.");
    }

    if (!ALLOWED_TYPES.has(mimeType)) {
      return uploadErrorResponse(requestId, "IMAGE_UPLOAD_FAILED", 400, `Unsupported mime type: ${mimeType}`);
    }

    const maxWorking = getMaxWorkingImageBytesForUploadRole(user.role);

    logInstantImages("processing-start", requestId, {
      clientUploadId,
      mimeType,
      sizeBytes: parsedSizeBytes,
    });

    const [workingInputBuffer, thumbInputBuffer] = await Promise.all([
      Buffer.from(await workingImage.arrayBuffer()),
      Buffer.from(await thumbnailImage.arrayBuffer()),
    ]);

    const workingProcessed = await normalizeJpegUnderByteLimit(workingInputBuffer, {
      maxBytes: maxWorking,
      maxWidth: 1280,
      fallbackWidth: 1024,
    });
    const thumbProcessed = await normalizeJpegUnderByteLimit(thumbInputBuffer, {
      maxBytes: BLOB_IMAGE_THUMB_MAX_BYTES,
      maxWidth: 400,
      fallbackWidth: 320,
    });

    logInstantImages("processing-complete", requestId, {
      originalWorkingBytes: workingInputBuffer.length,
      processedWorkingBytes: workingProcessed.buffer.length,
      processedThumbBytes: thumbProcessed.buffer.length,
    });

    const extension = extensionFromMimeType("image/jpeg");
    const sanitizedFileBase = originalFileName
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "-")
      .slice(0, 40);
    const workingPath = `motion/${clientUploadId}/working-${sanitizedFileBase}.${extension}`;
    const thumbPath = `motion/${clientUploadId}/thumb-${sanitizedFileBase}.${extension}`;

    logInstantImages("blob-upload-start", requestId, { workingPath, thumbPath });

    const [workingBlob, thumbBlob] = await Promise.all([
      put(workingPath, workingProcessed.buffer, {
        access: "public",
        contentType: "image/jpeg",
        addRandomSuffix: false,
      }),
      put(thumbPath, thumbProcessed.buffer, {
        access: "public",
        contentType: "image/jpeg",
        addRandomSuffix: false,
      }),
    ]);

    logInstantImages("blob-upload-complete", requestId, {
      workingUrl: workingBlob.url,
      thumbUrl: thumbBlob.url,
    });

    const response: UploadImageResponse = {
      workingImageUrl: workingBlob.url,
      thumbnailUrl: thumbBlob.url,
      workingStorageKey: workingBlob.pathname,
      thumbnailStorageKey: thumbBlob.pathname,
    };

    logInstantImages("complete", requestId);
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const classified = classifyImageUploadFailure(error);
    return uploadErrorResponse(requestId, classified.code, classified.httpStatus, classified.logMessage);
  }
}

type NormalizeOptions = {
  maxBytes: number;
  maxWidth: number;
  fallbackWidth: number;
};

async function normalizeJpegUnderByteLimit(
  inputBuffer: Buffer,
  options: NormalizeOptions
): Promise<{ buffer: Buffer; qualityUsed: number }> {
  let quality = 80;
  let output: Uint8Array = new Uint8Array(0);
  while (quality >= 40) {
    output = await sharp(inputBuffer)
      .rotate()
      .resize({ width: options.maxWidth, withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality, progressive: true, mozjpeg: true })
      .toBuffer();

    if (output.byteLength <= options.maxBytes) {
      return { buffer: Buffer.from(output), qualityUsed: quality };
    }
    quality -= 10;
  }

  quality = 80;
  while (quality >= 40) {
    output = await sharp(inputBuffer)
      .rotate()
      .resize({ width: options.fallbackWidth, withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality, progressive: true, mozjpeg: true })
      .toBuffer();

    if (output.byteLength <= options.maxBytes) {
      return { buffer: Buffer.from(output), qualityUsed: quality };
    }
    quality -= 10;
  }

  throw new Error("Image was too large. We automatically optimized it for you.");
}
