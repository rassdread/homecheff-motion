import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { BLOB_IMAGE_THUMB_MAX_BYTES, getMaxWorkingImageBytesForUploadRole } from "@/lib/media-export-constants";
import type { UploadImageResponse } from "@/types/animation-api";
import { requireActiveUser } from "@/server/auth/permissions";
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function extensionFromMimeType(mimeType: string): string {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  return "webp";
}

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const formData = await request.formData();
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
    return NextResponse.json(
      { error: "Missing required upload fields." },
      { status: 400 }
    );
  }

  const parsedSizeBytes = Number(sizeBytes);
  if (!Number.isFinite(parsedSizeBytes) || parsedSizeBytes <= 0) {
    return NextResponse.json(
      { error: "Invalid sizeBytes value." },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: "Unsupported image type." },
      { status: 400 }
    );
  }

  try {
    const maxWorking = getMaxWorkingImageBytesForUploadRole(user.role);
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

    console.info("[hc-instant-video]", {
      phase: "upload_image_optimized",
      originalWorkingBytes: workingInputBuffer.length,
      processedWorkingBytes: workingProcessed.buffer.length,
      finalWorkingQuality: workingProcessed.qualityUsed,
      originalThumbBytes: thumbInputBuffer.length,
      processedThumbBytes: thumbProcessed.buffer.length,
      finalThumbQuality: thumbProcessed.qualityUsed,
    });

    const extension = extensionFromMimeType("image/jpeg");
    const sanitizedFileBase = originalFileName
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "-")
      .slice(0, 40);
    const workingPath = `motion/${clientUploadId}/working-${sanitizedFileBase}.${extension}`;
    const thumbPath = `motion/${clientUploadId}/thumb-${sanitizedFileBase}.${extension}`;

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

    const response: UploadImageResponse = {
      workingImageUrl: workingBlob.url,
      thumbnailUrl: thumbBlob.url,
      workingStorageKey: workingBlob.pathname,
      thumbnailStorageKey: thumbBlob.pathname,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image upload processing failed.";
    const status = message.includes("too large") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
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
