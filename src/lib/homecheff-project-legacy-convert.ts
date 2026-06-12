import { buildHomeCheffProjectFromEditorDocument } from "@/lib/homecheff-project-build";
import { extendHcProjectWithPublishState } from "@/lib/homecheff-project-handoff";
import {
  createHomeCheffProjectId,
  defaultProjectPermissions,
} from "@/lib/homecheff-project-package-core";
import { persistHomeCheffProject } from "@/lib/homecheff-project-persist";
import {
  HOMECHEFF_PACKAGE_VERSION,
  type HomeCheffAssetReference,
  type HomeCheffConversionHistoryEntry,
  type HomeCheffProjectPackage,
} from "@/types/homecheff-project-package";
import type {
  LegacyConversionResult,
  LegacyEditorProjectInput,
  LegacyMotionProjectInput,
  LegacyPublishProjectInput,
  LegacyStudioProjectInput,
} from "@/types/homecheff-legacy-project";
import { linkLegacyToHcProject, registerLegacyProject } from "@/lib/homecheff-project-legacy-registry";

function assetRef(input: Omit<HomeCheffAssetReference, "createdAt" | "accessScope">): HomeCheffAssetReference {
  return {
    ...input,
    createdAt: new Date().toISOString(),
    accessScope: "project",
  };
}

function conversionRecord(
  service: HomeCheffProjectPackage["projectType"],
  legacyId: string,
  hcProjectId: string,
  status: "success" | "failed" = "success",
  error?: string
): HomeCheffConversionHistoryEntry {
  const now = new Date().toISOString();
  return {
    id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    from: { service, projectId: legacyId, convertedAt: now },
    toHcProjectId: hcProjectId,
    status,
    error,
    createdAt: now,
  };
}

function baseHcShell(input: {
  title: string;
  projectType: HomeCheffProjectPackage["projectType"];
  sourceService: HomeCheffProjectPackage["projectType"];
  legacyService: HomeCheffProjectPackage["projectType"];
  legacyId: string;
}): HomeCheffProjectPackage {
  const now = new Date().toISOString();
  const id = createHomeCheffProjectId();
  return {
    id,
    version: HOMECHEFF_PACKAGE_VERSION,
    projectFormat: "hc",
    projectVersion: 1,
    projectType: input.projectType,
    sourceService: input.sourceService,
    title: input.title,
    createdAt: now,
    updatedAt: now,
    permissions: defaultProjectPermissions("private_backup"),
    assetReferences: [],
    generationPackageIds: [],
    workflowState: {},
    metadata: {},
    prompts: {},
    settings: {},
    handoffHistory: [],
    servicePayload: {},
    legacySource: {
      service: input.legacyService,
      projectId: input.legacyId,
      convertedAt: now,
    },
    conversionHistory: [conversionRecord(input.legacyService, input.legacyId, id)],
  };
}

export function convertLegacyMotionToHCProject(input: LegacyMotionProjectInput): HomeCheffProjectPackage {
  const assets: HomeCheffAssetReference[] = [];
  if (input.videoUrl) {
    assets.push(
      assetRef({
        id: `legacy_motion_video_${input.id}`,
        url: input.videoUrl,
        kind: "motion_video",
        mimeType: "video/mp4",
        sourceService: "motion",
        role: "output",
      })
    );
  }
  if (input.thumbnailUrl) {
    assets.push(
      assetRef({
        id: `legacy_motion_thumb_${input.id}`,
        url: input.thumbnailUrl,
        kind: "thumbnail",
        mimeType: "image/jpeg",
        sourceService: "motion",
        role: "thumbnail",
      })
    );
  }
  for (const [index, url] of (input.sourceImageUrls ?? []).entries()) {
    assets.push(
      assetRef({
        id: `legacy_motion_src_${input.id}_${index}`,
        url,
        kind: "source_reference",
        sourceService: "motion",
        role: "source",
      })
    );
  }
  for (const [index, url] of (input.sequenceFrameUrls ?? []).entries()) {
    assets.push(
      assetRef({
        id: `legacy_motion_seq_${input.id}_${index}`,
        url,
        kind: "sequence_frame",
        sourceService: "motion",
        role: `step_${index}`,
      })
    );
  }

  const shell = baseHcShell({
    title: input.title,
    projectType: "motion",
    sourceService: "motion",
    legacyService: "motion",
    legacyId: input.id,
  });

  return {
    ...shell,
    assetReferences: assets,
    metadata: {
      legacyMotionId: input.id,
      legacyStatus: input.status,
      ...(input.metadata ?? {}),
    },
    servicePayload: {
      motion: {
        motionProjectId: input.id,
        sourceImageUrls: input.sourceImageUrls,
        sequenceFrameUrls: input.sequenceFrameUrls,
        durationSec: input.durationSec,
        generatedVideoUrl: input.videoUrl,
        thumbnailUrl: input.thumbnailUrl,
        metadata: { legacyMotionId: input.id, ...(input.metadata ?? {}) },
      },
    },
  };
}

export function convertLegacyStudioToHCProject(input: LegacyStudioProjectInput): HomeCheffProjectPackage {
  const assets: HomeCheffAssetReference[] = [];
  if (input.sceneImageUrl) {
    assets.push(
      assetRef({
        id: `legacy_studio_scene_${input.id}`,
        url: input.sceneImageUrl,
        kind: "generated_image",
        sourceService: "studio",
        role: "scene",
      })
    );
  }

  const shell = baseHcShell({
    title: input.title,
    projectType: "studio",
    sourceService: "studio",
    legacyService: "studio",
    legacyId: input.id,
  });

  return {
    ...shell,
    assetReferences: assets,
    metadata: {
      legacyStoryboardId: input.storyboardId ?? input.id,
      legacySceneIds: input.sceneIds,
      ...(input.metadata ?? {}),
    },
    servicePayload: {
      studio: {
        storyboardId: input.storyboardId ?? input.id,
        sceneTitle: input.sceneTitle ?? input.title,
        sceneDescription: input.sceneDescription,
        sceneImageUrl: input.sceneImageUrl,
        metadata: {
          legacyStudioId: input.id,
          sceneIds: input.sceneIds,
          ...(input.metadata ?? {}),
        },
      },
    },
  };
}

export function convertLegacyPublishToHCProject(input: LegacyPublishProjectInput): HomeCheffProjectPackage {
  const assets: HomeCheffAssetReference[] = [];
  if (input.videoUrl) {
    assets.push(
      assetRef({
        id: `legacy_publish_video_${input.id}`,
        url: input.videoUrl,
        storageKey: input.videoStorageKey,
        kind: "motion_video",
        mimeType: "video/mp4",
        sourceService: "publish",
        role: "output",
      })
    );
  }
  for (const [index, url] of (input.imageUrls ?? []).entries()) {
    assets.push(
      assetRef({
        id: `legacy_publish_img_${input.id}_${index}`,
        url,
        kind: "generated_image",
        sourceService: "publish",
        role: `carousel_${index}`,
      })
    );
  }
  if (input.imageUrl && !input.imageUrls?.includes(input.imageUrl)) {
    assets.push(
      assetRef({
        id: `legacy_publish_primary_${input.id}`,
        url: input.imageUrl,
        kind: "generated_image",
        sourceService: "publish",
        role: "primary",
      })
    );
  }

  const shell = baseHcShell({
    title: input.name,
    projectType: "publish",
    sourceService: "publish",
    legacyService: "publish",
    legacyId: input.id,
  });

  return {
    ...shell,
    assetReferences: assets,
    metadata: {
      legacyPublishId: input.id,
      overlayCount: input.overlays.length,
      subtitleCount: input.subtitles.length,
      ...(input.metadata ?? {}),
    },
    settings: {
      voiceOver: input.metadata?.voiceOver,
      music: input.metadata?.music,
    },
    servicePayload: {
      publish: {
        publishProjectId: input.id,
        publishIntent: input.publishIntent,
        mediaKind: input.mediaKind,
        imageUrls: input.imageUrls ?? (input.imageUrl ? [input.imageUrl] : []),
        videoUrl: input.videoUrl,
        projectSnapshot: input,
        settings: {
          overlays: input.overlays,
          subtitles: input.subtitles,
          platform: input.platform,
        },
        metadata: {
          legacyPublishId: input.id,
          motionProjectId: input.motionProjectId,
          editorSessionId: input.editorSessionId,
        },
      },
    },
  };
}

export function convertLegacyEditorToHCProject(input: LegacyEditorProjectInput): HomeCheffProjectPackage {
  const built = buildHomeCheffProjectFromEditorDocument({
    document: input.document,
    title: input.name,
  });
  const now = new Date().toISOString();

  return {
    ...built,
    projectFormat: "hc",
    projectVersion: 1,
    legacySource: {
      service: "editor",
      projectId: input.id,
      convertedAt: now,
    },
    conversionHistory: [
      conversionRecord("editor", input.id, built.id),
    ],
    metadata: {
      ...built.metadata,
      legacyEditorProjectId: input.id,
      legacyEditorStatus: input.status,
      ...(input.metadata ?? {}),
    },
    servicePayload: {
      ...built.servicePayload,
      editor: {
        ...built.servicePayload.editor,
        editorProjectId: input.id,
        metadata: {
          ...(built.servicePayload.editor?.metadata ?? {}),
          legacyEditorProjectId: input.id,
        },
      },
    },
  };
}

/** Motion-first shortcut: temporary HC with motion + publish states; legacy motion untouched. */
export function convertLegacyMotionToPublishShortcut(input: LegacyMotionProjectInput): HomeCheffProjectPackage {
  const motionHc = convertLegacyMotionToHCProject(input);
  const withPublish = extendHcProjectWithPublishState(motionHc);
  return {
    ...withPublish,
    metadata: {
      ...withPublish.metadata,
      legacyMotionPublishShortcut: true,
      legacyMotionId: input.id,
    },
    conversionHistory: [
      ...(motionHc.conversionHistory ?? []),
      {
        id: `conv_publish_${Date.now()}`,
        from: { service: "motion", projectId: input.id, convertedAt: new Date().toISOString() },
        toHcProjectId: withPublish.id,
        status: "success" as const,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

export function finalizeLegacyConversion(input: {
  hcProject: HomeCheffProjectPackage;
  legacyService: HomeCheffProjectPackage["projectType"];
  legacyId: string;
  legacyTitle: string;
  openPath?: string;
}): HomeCheffProjectPackage {
  const persisted = persistHomeCheffProject(input.hcProject);
  registerLegacyProject({
    legacyId: input.legacyId,
    service: input.legacyService,
    title: input.legacyTitle,
    openPath: input.openPath,
    metadata: { linkedHcProjectId: persisted.id },
  });
  linkLegacyToHcProject(input.legacyService, input.legacyId, persisted.id);
  return persisted;
}

export function safeLegacyConversion(
  convert: () => HomeCheffProjectPackage
): LegacyConversionResult {
  try {
    const hcProject = convert();
    return { ok: true, hcProjectId: hcProject.id, legacyPreserved: true };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "conversion_failed",
      fallback: "open_legacy",
    };
  }
}

export function convertAndPersistLegacyMotion(input: LegacyMotionProjectInput): LegacyConversionResult {
  return safeLegacyConversion(() =>
    finalizeLegacyConversion({
      hcProject: convertLegacyMotionToHCProject(input),
      legacyService: "motion",
      legacyId: input.id,
      legacyTitle: input.title,
      openPath: `/animate/${input.id}`,
    })
  );
}

export function convertAndPersistLegacyEditor(input: LegacyEditorProjectInput): LegacyConversionResult {
  return safeLegacyConversion(() =>
    finalizeLegacyConversion({
      hcProject: convertLegacyEditorToHCProject(input),
      legacyService: "editor",
      legacyId: input.id,
      legacyTitle: input.name,
      openPath: `/editor/start?session=${encodeURIComponent(input.document.sessionId)}`,
    })
  );
}

export function convertAndPersistLegacyPublish(input: LegacyPublishProjectInput): LegacyConversionResult {
  return safeLegacyConversion(() =>
    finalizeLegacyConversion({
      hcProject: convertLegacyPublishToHCProject(input),
      legacyService: "publish",
      legacyId: input.id,
      legacyTitle: input.name,
      openPath: `/publish?project=${encodeURIComponent(input.id)}`,
    })
  );
}

export function convertAndPersistLegacyStudio(input: LegacyStudioProjectInput): LegacyConversionResult {
  return safeLegacyConversion(() =>
    finalizeLegacyConversion({
      hcProject: convertLegacyStudioToHCProject(input),
      legacyService: "studio",
      legacyId: input.id,
      legacyTitle: input.title,
      openPath: `/studio/storyboards/${encodeURIComponent(input.storyboardId ?? input.id)}`,
    })
  );
}

export function legacyMotionToPublishShortcut(input: LegacyMotionProjectInput): LegacyConversionResult {
  return safeLegacyConversion(() =>
    finalizeLegacyConversion({
      hcProject: convertLegacyMotionToPublishShortcut(input),
      legacyService: "motion",
      legacyId: input.id,
      legacyTitle: input.title,
      openPath: `/animate/${input.id}`,
    })
  );
}
