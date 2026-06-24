import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  mapPublishFormatToActionType,
  withStudioCreditGate,
} from "@/server/studio-account/with-studio-credit-gate";
import { readHcProjectIdFromRequest, readProductionTransactionIdFromRequest } from "@/lib/studio-production-request-headers";
import { loadPublishProjectFromBody } from "@/server/publish/publish-export-body";
import { exportPublishProjectVideo } from "@/server/publish/publish-video-export-service";
import { persistPublishExportAndRegister } from "@/server/publish/publish-export-library-register";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const project = await loadPublishProjectFromBody(request);
  if (!project) {
    return NextResponse.json({ error: "Invalid publish project" }, { status: 400 });
  }

  const productionTransactionId = readProductionTransactionIdFromRequest(request);
  const hcProjectId = readHcProjectIdFromRequest(request) ?? project.id;

  const gated =
    productionTransactionId
      ? await withStudioCreditGate({
          user,
          actionType: mapPublishFormatToActionType(
            project.mediaKind === "image"
              ? "photo_story"
              : project.mediaKind === "carousel"
                ? "slideshow"
                : "mp4"
          ),
          projectId: project.id,
          productionTransactionId,
          hcProjectId,
          execute: () => exportPublishProjectVideo(project),
          isFailure: (result) => !result.ok,
        })
      : await withStudioCreditGate({
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
  let librarySaved = false;
  let libraryAssetId: string | null = null;
  let persistedExportUrl: string | null = null;
  try {
    const persisted = await persistPublishExportAndRegister({
      ownerId: user.id,
      createdBy: user.id,
      project,
      outputPath: result.outputPath,
      format: project.mediaKind === "image" ? "photo_story" : "mp4",
      thumbnailUrl: project.imageUrls?.[0] ?? project.videoUrl ?? null,
    });
    librarySaved = true;
    libraryAssetId = persisted.record.registryAssetId;
    persistedExportUrl = persisted.exportUrl;
  } catch (error) {
    console.error("[library-consistency] publish export register failed", error);
  }

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "video/mp4",
      "Content-Disposition": `attachment; filename="${project.name.replace(/[^a-z0-9-_]+/gi, "-")}-publish.mp4"`,
      "X-Publish-Layer-Count": String(result.layerCount),
      "X-Library-Saved": librarySaved ? "1" : "0",
      ...(libraryAssetId ? { "X-Library-Asset-Id": libraryAssetId } : {}),
      ...(persistedExportUrl ? { "X-Publish-Export-Url": persistedExportUrl } : {}),
    },
  });
}
