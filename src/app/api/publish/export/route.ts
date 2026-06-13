import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  mapPublishFormatToActionType,
  withStudioCreditGate,
} from "@/server/studio-account/with-studio-credit-gate";
import { loadPublishProjectFromBody } from "@/server/publish/publish-export-body";
import { exportPublishProjectVideo } from "@/server/publish/publish-video-export-service";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const project = await loadPublishProjectFromBody(request);
  if (!project) {
    return NextResponse.json({ error: "Invalid publish project" }, { status: 400 });
  }

  const gated = await withStudioCreditGate({
    user,
    actionType: mapPublishFormatToActionType(
      project.mediaKind === "image"
        ? "photo_story"
        : project.mediaKind === "carousel"
          ? "slideshow"
          : "mp4"
    ),
    projectId: project.id,
    execute: () => exportPublishProjectVideo(project),
    isFailure: (result) => !result.ok,
  });

  if ("blocked" in gated) {
    return gated.blocked;
  }

  const result = gated.result;
  if (!result.ok) {
    return NextResponse.json({ error: result.error, fallback: "draft_saved" }, { status: 503 });
  }

  const bytes = await readFile(result.outputPath);
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "video/mp4",
      "Content-Disposition": `attachment; filename="${project.name.replace(/[^a-z0-9-_]+/gi, "-")}-publish.mp4"`,
      "X-Publish-Layer-Count": String(result.layerCount),
    },
  });
}
