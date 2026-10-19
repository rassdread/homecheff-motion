import type { StudioAsset } from "@/types/studio-media-asset";

export type OwnedSceneImageRecord = {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  createdAt: string;
  projectId: string;
  projectTitle: string | null;
  sceneTitle: string | null;
};

export type OwnedAnimationImageRecord = {
  id: string;
  previewUrl: string | null;
  fileName: string;
  createdAt: string;
  projectId: string;
  projectTitle: string | null;
  studioSceneImageId: string | null;
};

export type OwnedPlayableVideoRecord = {
  projectId: string;
  projectTitle: string | null;
  createdAt: string;
  videoUrl: string;
  posterUrl: string | null;
};

export type OwnedProjectMediaInput = {
  ownerId: string;
  untitledLabel: string;
  sceneImages: OwnedSceneImageRecord[];
  animationImages: OwnedAnimationImageRecord[];
  videos: OwnedPlayableVideoRecord[];
};

function trimmed(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function projectLabel(title: string | null | undefined, untitledLabel: string): string {
  return trimmed(title) || untitledLabel;
}

function imageAsset(input: {
  id: string;
  entityType: "scene_image" | "animation_image";
  entityId: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: string;
  previewUrl: string;
  projectHref: string;
}): StudioAsset {
  return {
    id: input.id,
    name: input.name,
    category: "reference_image",
    description: input.description,
    tags: [],
    owner: input.ownerId,
    source: "user",
    status: "active",
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    sourceRef: { entityType: input.entityType, entityId: input.entityId },
    previewUrl: input.previewUrl,
    downloadUrl: input.previewUrl,
    projectHref: input.projectHref,
    collectionIds: [],
    origin: "generated",
    visibility: "user_owned",
  };
}

/** Prefer a finished export, then a completed render, then the last retained final. */
export function choosePlayableVideoUrl(input: {
  exportUrls?: Array<string | null | undefined>;
  renderUrls?: Array<string | null | undefined>;
  previousUrl?: string | null;
}): string | null {
  for (const candidate of [...(input.exportUrls ?? []), ...(input.renderUrls ?? []), input.previousUrl]) {
    const url = trimmed(candidate);
    if (url) {
      return url;
    }
  }
  return null;
}

/**
 * Read-time library entries for media that already belongs to one account.
 * Original project names are kept. Missing titles use the supplied untitled label.
 * The same input always yields the same ids.
 */
export function mapOwnedProjectMediaToLibraryAssets(input: OwnedProjectMediaInput): StudioAsset[] {
  const ownerId = trimmed(input.ownerId);
  if (!ownerId) {
    return [];
  }

  const assets: StudioAsset[] = [];
  const seenIds = new Set<string>();
  const sceneIds = new Set<string>();
  const imageUrls = new Set<string>();

  for (const image of input.sceneImages) {
    const preview = trimmed(image.imageUrl);
    const id = `scene-image:${image.id}`;
    if (!preview || seenIds.has(id) || imageUrls.has(preview)) {
      continue;
    }
    seenIds.add(id);
    sceneIds.add(image.id);
    imageUrls.add(preview);
    const project = projectLabel(image.projectTitle, input.untitledLabel);
    const scene = trimmed(image.sceneTitle);
    assets.push(
      imageAsset({
        id,
        entityType: "scene_image",
        entityId: image.id,
        name: scene ? `${project} — ${scene}` : project,
        description: project,
        ownerId,
        createdAt: image.createdAt,
        previewUrl: preview,
        projectHref: `/studio/storyboards/${image.projectId}`,
      })
    );
    if (trimmed(image.thumbnailUrl) && trimmed(image.thumbnailUrl) !== preview) {
      imageUrls.add(trimmed(image.thumbnailUrl));
    }
  }

  for (const image of input.animationImages) {
    const preview = trimmed(image.previewUrl);
    const id = `animation-image:${image.id}`;
    if (!preview || seenIds.has(id) || imageUrls.has(preview)) {
      continue;
    }
    if (image.studioSceneImageId && sceneIds.has(image.studioSceneImageId)) {
      continue;
    }
    seenIds.add(id);
    imageUrls.add(preview);
    const project = projectLabel(image.projectTitle, input.untitledLabel);
    assets.push(
      imageAsset({
        id,
        entityType: "animation_image",
        entityId: image.id,
        name: project,
        description: project,
        ownerId,
        createdAt: image.createdAt,
        previewUrl: preview,
        projectHref: `/videos/${image.projectId}`,
      })
    );
  }

  for (const video of input.videos) {
    const videoUrl = trimmed(video.videoUrl);
    const id = `animation-video:${video.projectId}`;
    if (!videoUrl || seenIds.has(id)) {
      continue;
    }
    seenIds.add(id);
    const project = projectLabel(video.projectTitle, input.untitledLabel);
    const poster = trimmed(video.posterUrl);
    assets.push({
      id,
      name: project,
      category: "reference_image",
      description: project,
      tags: [],
      owner: ownerId,
      source: "user",
      status: "active",
      createdAt: video.createdAt,
      updatedAt: video.createdAt,
      sourceRef: { entityType: "animation_video", entityId: video.projectId },
      previewUrl: poster || null,
      downloadUrl: videoUrl,
      projectHref: `/videos/${video.projectId}`,
      collectionIds: [],
      origin: "generated",
      visibility: "user_owned",
    });
  }

  return assets;
}
