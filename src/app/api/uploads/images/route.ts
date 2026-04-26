import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { MAX_OPTIMIZED_IMAGE_BYTES } from "@/lib/animation-upload-limits";
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

  if (
    workingImage.size > MAX_OPTIMIZED_IMAGE_BYTES ||
    thumbnailImage.size > MAX_OPTIMIZED_IMAGE_BYTES
  ) {
    return NextResponse.json(
      { error: "Optimized image exceeds 2MB limit." },
      { status: 400 }
    );
  }

  const extension = extensionFromMimeType(mimeType);
  const sanitizedFileBase = originalFileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .slice(0, 40);
  const workingPath = `motion/${clientUploadId}/working-${sanitizedFileBase}.${extension}`;
  const thumbPath = `motion/${clientUploadId}/thumb-${sanitizedFileBase}.${extension}`;

  const [workingBlob, thumbBlob] = await Promise.all([
    put(workingPath, workingImage, {
      access: "public",
      contentType: mimeType,
      addRandomSuffix: false,
    }),
    put(thumbPath, thumbnailImage, {
      access: "public",
      contentType: mimeType,
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
}
