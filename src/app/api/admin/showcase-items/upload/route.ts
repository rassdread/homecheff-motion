import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import {
  validateShowcaseUpload,
  type ShowcaseUploadSlot,
} from "@/lib/showcase-media-rules";
import { isBlobTokenConfigured, uploadPublicBlob } from "@/lib/vercel-blob-config";

function extensionFromMime(mimeType: string): string {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "video/mp4") return "mp4";
  if (mimeType === "video/webm") return "webm";
  return "bin";
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }

  if (!isBlobTokenConfigured()) {
    return NextResponse.json({ error: "admin.showcase.errors.blobNotConfigured" }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "admin.showcase.errors.uploadFailed" }, { status: 400 });
  }

  const file = formData.get("file");
  const slotRaw = formData.get("slot");
  const slot: ShowcaseUploadSlot =
    slotRaw === "thumbnail" || slotRaw === "poster" ? slotRaw : "media";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "admin.showcase.errors.fileRequired" }, { status: 400 });
  }

  const mimeType = file.type || "application/octet-stream";
  const validation = validateShowcaseUpload({
    mimeType,
    sizeBytes: file.size,
    slot,
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.errorKey }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = extensionFromMime(mimeType);
  const uploadId = randomUUID();
  const pathname = `showcase/${slot}/${uploadId}.${ext}`;

  try {
    const blob = await uploadPublicBlob({
      pathname,
      body: bytes,
      contentType: mimeType,
      addRandomSuffix: false,
      context: {
        uploadTarget: pathname,
        provider: "vercel-blob",
        requestId: uploadId,
      },
    });
    return NextResponse.json(
      {
        ok: true,
        url: blob.url,
        pathname: blob.pathname,
        mimeType,
        slot,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "admin.showcase.errors.uploadFailed" }, { status: 500 });
  }
}
