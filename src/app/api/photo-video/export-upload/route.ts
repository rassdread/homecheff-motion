import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireActiveUser } from "@/server/auth/permissions";
import { PHOTO_VIDEO_EXPORT_BLOB_TTL_SEC, PHOTO_VIDEO_EXPORT_MAX_BYTES } from "@/lib/photo-video/export-handoff";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("px4a-export/")) {
          throw new Error("Invalid pathname");
        }
        return {
          allowedContentTypes: ["video/mp4", "video/quicktime"],
          maximumSizeInBytes: PHOTO_VIDEO_EXPORT_MAX_BYTES,
          addRandomSuffix: true,
          validUntil: Date.now() + PHOTO_VIDEO_EXPORT_BLOB_TTL_SEC * 1000,
          cacheControlMaxAge: PHOTO_VIDEO_EXPORT_BLOB_TTL_SEC,
          tokenPayload: JSON.stringify({ userId: user.id, kind: "px4a-export" }),
        };
      },
      onUploadCompleted: async () => undefined,
    });
    return NextResponse.json(json);
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 400 });
  }
}
