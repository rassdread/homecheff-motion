import type { PublishProject } from "@/types/publish-overlay";
import { createPublishProject } from "@/lib/publish-overlay-session";
import type { PublishEntryMode } from "@/lib/publish-photo-story";

export type PosterIntake = {
  title: string;
  subtitle?: string;
  cta?: string;
  logoUrl?: string;
};

export function createPosterProject(input: {
  name: string;
  imageUrl?: string;
  blankCanvas?: boolean;
  intake?: PosterIntake;
  entryMode?: PublishEntryMode;
}): PublishProject {
  const baseUrl = input.imageUrl ?? "";
  return createPublishProject({
    name: input.name,
    videoUrl: baseUrl,
    imageUrl: input.blankCanvas ? undefined : baseUrl,
    mediaKind: "image",
    durationSeconds: 0,
    source: input.blankCanvas ? "standalone" : "upload",
    workflow: "poster",
    publishIntent: input.entryMode ?? "poster",
    metadata: {
      publishEntryMode: input.entryMode ?? "poster",
      renderMode: "poster",
      posterIntake: input.intake,
      blankCanvas: input.blankCanvas ?? false,
    },
  });
}

export function isPosterProject(project: PublishProject): boolean {
  return project.workflow === "poster" || project.metadata?.renderMode === "poster";
}
