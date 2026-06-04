import { NextResponse } from "next/server";
import { resolveProjectVideoDownload } from "@/server/animation-projects/resolve-video-download";
import {
  getAnimationProjectById,
  getAnimationProjectByIdForViewer,
} from "@/server/animation-projects/queries";
import { requireActiveUser } from "@/server/auth/permissions";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseSegmentOrder(raw: string | null): number | undefined {
  if (raw == null || raw.trim() === "") {
    return undefined;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 0) {
    return Number.NaN;
  }
  return n;
}

export async function GET(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id } = await context.params;
  const searchParams = new URL(request.url).searchParams;
  const segmentOrder = parseSegmentOrder(searchParams.get("segment"));
  if (Number.isNaN(segmentOrder)) {
    return NextResponse.json({ error: "Invalid segment index." }, { status: 400 });
  }
  const languageCode = searchParams.get("lang")?.trim() || undefined;
  const variant = searchParams.get("variant")?.trim() || undefined;

  const viewerProject = await getAnimationProjectByIdForViewer(id, user);
  if (!viewerProject) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const project = await getAnimationProjectById(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const resolved = resolveProjectVideoDownload(
    project,
    segmentOrder,
    languageCode,
    variant,
    searchParams.get("exportId")?.trim() || undefined
  );
  if (!resolved) {
    return NextResponse.json({ error: "Video not available for download." }, { status: 404 });
  }

  if (resolved.inlineBody != null) {
    return new NextResponse(resolved.inlineBody, {
      status: 200,
      headers: {
        "Content-Type": resolved.contentType ?? "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${resolved.filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  let upstream: Response;
  try {
    upstream = await fetch(resolved.sourceUrl, {
      signal: AbortSignal.timeout(120_000),
      redirect: "follow",
    });
  } catch {
    return NextResponse.json({ error: "Could not fetch video from storage." }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `Upstream video unavailable (HTTP ${upstream.status}).` },
      { status: 502 }
    );
  }

  const contentType = upstream.headers.get("content-type")?.trim() || "video/mp4";
  const contentLength = upstream.headers.get("content-length");

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${resolved.filename}"`,
      ...(contentLength ? { "Content-Length": contentLength } : {}),
      "Cache-Control": "private, no-store",
    },
  });
}
