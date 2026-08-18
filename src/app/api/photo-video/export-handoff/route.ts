import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  createExportAttachPayload,
  homecheffExportAttachAction,
  isExportAttachTokenSizeOk,
} from "@/lib/photo-video/export-attach-payload";
import { signExportAttachPayload, studioItemHandoffSecrets } from "@/lib/photo-video/export-attach-crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const secrets = studioItemHandoffSecrets();
  const secret = secrets[0];
  if (!secret) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let videoUrl = "";
  let durationSeconds = 0;
  let thumbnailUrl: string | null = null;
  try {
    const body = (await request.json()) as {
      videoUrl?: unknown;
      durationSeconds?: unknown;
      thumbnailUrl?: unknown;
    };
    videoUrl = typeof body.videoUrl === "string" ? body.videoUrl : "";
    durationSeconds = typeof body.durationSeconds === "number" ? body.durationSeconds : Number(body.durationSeconds);
    thumbnailUrl = typeof body.thumbnailUrl === "string" ? body.thumbnailUrl : null;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const payload = createExportAttachPayload({
    centralUserId: user.id,
    videoUrl,
    durationSeconds,
    thumbnailUrl,
  });
  if (!payload) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const token = signExportAttachPayload(payload, secret);
  if (!isExportAttachTokenSizeOk(token)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  return NextResponse.json({
    action: homecheffExportAttachAction(),
    token,
  });
}
