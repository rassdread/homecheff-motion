import { readFile } from "node:fs/promises";
import { uploadPublicBlob } from "@/lib/vercel-blob-config";
import { registerPublishExportInLibrary } from "@/lib/library-consistency-completion";
import type { LibraryConsistencyRecord } from "@/types/library-consistency";
import type { PublishProject } from "@/types/publish-overlay";

export async function persistPublishExportAndRegister(input: {
  ownerId: string;
  createdBy: string;
  project: PublishProject;
  outputPath: string;
  format?: string;
  thumbnailUrl?: string | null;
}): Promise<{ exportUrl: string; storageKey: string; record: LibraryConsistencyRecord }> {
  const bytes = await readFile(input.outputPath);
  const timestamp = Date.now();
  const storageKey = `studio/${input.ownerId}/publish-exports/${input.project.id}/${timestamp}.mp4`;
  const uploaded = await uploadPublicBlob({
    pathname: storageKey,
    body: bytes,
    contentType: "video/mp4",
    allowOverwrite: false,
    context: {
      uploadTarget: storageKey,
      provider: "publish_export",
    },
  });

  const publishProfile =
    (typeof input.project.metadata?.publishProfile === "string"
      ? input.project.metadata.publishProfile
      : null) ?? input.project.mediaKind;

  const record = await registerPublishExportInLibrary({
    ownerId: input.ownerId,
    createdBy: input.createdBy,
    projectId: input.project.id,
    projectTitle: input.project.name,
    exportUrl: uploaded.url,
    storageKey,
    thumbnailUrl: input.thumbnailUrl ?? null,
    publishProfile,
    format: input.format ?? "mp4",
    durationSec: input.project.durationSeconds,
  });

  return { exportUrl: uploaded.url, storageKey, record };
}
