import { upsertHcAssetReference, createHcAssetReference } from "@/lib/hc-asset-references";
import { writeHcWorkflowV2, readHcWorkflowV2 } from "@/lib/hc-workflow-v2";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";
import type { PublishIntakeFile } from "@/lib/publish-start-intake";

export type PublishIntakeHcBundle = {
  description?: string;
  entryMode?: string;
  files: Array<{ id: string; name: string; labels: string[]; url?: string }>;
  relationships?: Array<{ fromId: string; toId: string; kind: string }>;
  storedAt: string;
};

export function inferPublishFileRelationships(files: PublishIntakeFile[]): PublishIntakeHcBundle["relationships"] {
  const rels: NonNullable<PublishIntakeHcBundle["relationships"]> = [];
  const video = files.find((f) => f.labels.includes("video"));
  const script = files.find((f) => f.labels.includes("script") || f.labels.includes("subtitles"));
  const logo = files.find((f) => f.labels.includes("logo") || f.labels.includes("branding"));
  const images = files.filter((f) => f.labels.includes("image") || f.labels.includes("poster"));

  if (video && script) rels.push({ fromId: script.id, toId: video.id, kind: "script_for_video" });
  if (video && logo) rels.push({ fromId: logo.id, toId: video.id, kind: "branding_for_video" });
  for (let i = 1; i < images.length; i++) {
    rels.push({ fromId: images[i - 1]!.id, toId: images[i]!.id, kind: "slideshow_sequence" });
  }
  if (images.length === 1 && script) {
    rels.push({ fromId: script.id, toId: images[0]!.id, kind: "script_for_photo_story" });
  }
  return rels;
}

export function storePublishIntakeInHc(
  project: HomeCheffProjectPackage,
  input: {
    description?: string;
    entryMode?: string;
    files: PublishIntakeFile[];
  }
): HomeCheffProjectPackage {
  const bundle: PublishIntakeHcBundle = {
    description: input.description,
    entryMode: input.entryMode,
    files: input.files.map((f) => ({
      id: f.id,
      name: f.name,
      labels: f.labels,
      url: f.url,
    })),
    relationships: inferPublishFileRelationships(input.files),
    storedAt: new Date().toISOString(),
  };

  let next: HomeCheffProjectPackage = {
    ...project,
    workflowState: {
      ...project.workflowState,
      publishIntake: bundle,
    },
    updatedAt: new Date().toISOString(),
  };

  for (const file of input.files) {
    const kind = file.labels.includes("video")
      ? "video"
      : file.labels.includes("image") || file.labels.includes("poster")
        ? "image"
        : file.labels.includes("script")
          ? "script"
          : "reference";
    next = upsertHcAssetReference(
      next,
      createHcAssetReference({
        id: file.id,
        url: file.url,
        kind,
        role: file.labels.join(","),
        sourceService: "publish",
        mimeType: file.mimeType,
      })
    );
  }

  const root = readHcWorkflowV2(next);
  return writeHcWorkflowV2(next, {
    publish: {
      ...root.publish,
      phase: "collect",
      intent: input.description ?? root.publish?.intent,
    },
  });
}
