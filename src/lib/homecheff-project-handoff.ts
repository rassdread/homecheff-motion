import { createHomeCheffProjectId } from "@/lib/homecheff-project-package-core";
import { mergeHomeCheffProject } from "@/lib/homecheff-project-build";
import type {
  HomeCheffProjectHandoff,
  HomeCheffProjectPackage,
  HomeCheffProjectType,
} from "@/types/homecheff-project-package";
import type { EditorGenerationPackage } from "@/types/editor-generation-package";

function handoffRecord(
  source: HomeCheffProjectType,
  target: HomeCheffProjectType,
  handoffType: string,
  payload?: Record<string, unknown>
): HomeCheffProjectHandoff {
  return {
    id: `handoff_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    sourceService: source,
    targetService: target,
    handoffType,
    payload,
    createdAt: new Date().toISOString(),
  };
}

function editorGenerationPackage(project: HomeCheffProjectPackage): EditorGenerationPackage | undefined {
  return project.servicePayload?.editor?.generationPackages?.[0];
}

export function extendHcProjectWithMotionState(
  project: HomeCheffProjectPackage,
  input: { durationSec?: number; transitionStyle?: string } = {}
): HomeCheffProjectPackage {
  const pkg = editorGenerationPackage(project);
  const frameUrls = pkg?.orderedFrameUrls ?? pkg?.sequenceFrames.map((f) => f.url) ?? [];
  const primaryUrl =
    pkg?.motionOutputs[0]?.url ??
    pkg?.generatedImages[0]?.url ??
    frameUrls.at(-1);

  const motionPrompt =
    frameUrls.length > 1
      ? "Animate this transformation sequence smoothly from step 1 to final form. Preserve framing, subject identity and lighting."
      : "Animate this image with subtle cinematic motion. Preserve subject identity, framing and lighting.";

  return mergeHomeCheffProject(project, {
    projectType: "motion",
    targetService: "motion",
    prompts: {
      ...project.prompts,
      motion_primary: motionPrompt,
    },
    handoffHistory: [
      ...project.handoffHistory,
      handoffRecord("editor", "motion", "editor_to_motion", { durationSec: input.durationSec ?? 5 }),
    ],
    servicePayload: {
      ...project.servicePayload,
      motion: {
        sourceImageUrls: primaryUrl ? [primaryUrl] : [],
        sequenceFrameUrls: frameUrls,
        durationSec: input.durationSec ?? project.servicePayload.motion?.durationSec ?? 5,
        transitionStyle: input.transitionStyle ?? "smooth",
        motionPrompt,
        metadata: {
          sourceEditorPackageId: pkg?.id,
          preservationRules: ["identity", "framing", "lighting"],
        },
        prompts: { primary: motionPrompt },
      },
    },
  });
}

export function extendHcProjectWithPublishState(
  project: HomeCheffProjectPackage,
  input: { publishIntent?: string } = {}
): HomeCheffProjectPackage {
  const pkg = editorGenerationPackage(project);
  const motion = project.servicePayload.motion;
  const videoUrl = motion?.generatedVideoUrl ?? pkg?.motionOutputs[0]?.url;
  const imageUrls =
    pkg?.sequenceFrames.length
      ? pkg.sequenceFrames.map((f) => f.url)
      : pkg?.generatedImages.map((g) => g.url) ?? [];

  const publishIntent = input.publishIntent ?? "text_overlay";
  const publishPrompt =
    videoUrl
      ? "Prepare this video for social sharing with subtitles, optional voice-over and music."
      : "Create a social-ready post using this generated image. Add a headline, caption and CTA while preserving the visual.";

  return mergeHomeCheffProject(project, {
    projectType: "publish",
    targetService: "publish",
    prompts: {
      ...project.prompts,
      publish_primary: publishPrompt,
    },
    handoffHistory: [
      ...project.handoffHistory,
      handoffRecord(
        videoUrl ? "motion" : "editor",
        "publish",
        videoUrl ? "motion_to_publish" : "editor_to_publish",
        { publishIntent }
      ),
    ],
    servicePayload: {
      ...project.servicePayload,
      publish: {
        publishIntent,
        mediaKind: videoUrl ? "video" : imageUrls.length > 1 ? "carousel" : "image",
        imageUrls,
        videoUrl,
        publishPrompt,
        prompts: { primary: publishPrompt },
        metadata: {
          sourceEditorPackageId: pkg?.id,
        },
      },
    },
  });
}

export function extendHcProjectWithStudioState(
  project: HomeCheffProjectPackage,
  input: { sceneTitle?: string; sceneDescription?: string; suggestedStoryboardRole?: string } = {}
): HomeCheffProjectPackage {
  const pkg = editorGenerationPackage(project);
  const sceneImageUrl =
    pkg?.generatedImages[0]?.url ??
    pkg?.sequenceFrames.at(-1)?.url;

  return mergeHomeCheffProject(project, {
    projectType: "studio",
    targetService: "studio",
    handoffHistory: [
      ...project.handoffHistory,
      handoffRecord("editor", "studio", "editor_to_studio_scene"),
    ],
    servicePayload: {
      ...project.servicePayload,
      studio: {
        sceneTitle: input.sceneTitle ?? project.title,
        sceneDescription: input.sceneDescription ?? "Scene imported from Editor generation package.",
        sceneImageUrl,
        suggestedStoryboardRole: input.suggestedStoryboardRole ?? "scene",
        metadata: {
          sourceEditorPackageId: pkg?.id,
          generationPackageIds: project.generationPackageIds,
        },
      },
    },
  });
}

export function importHcProjectAsCopy(
  project: HomeCheffProjectPackage,
  recipientOwnerId?: string
): HomeCheffProjectPackage {
  return {
    ...project,
    id: createHomeCheffProjectId(),
    ownerId: recipientOwnerId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    permissions: {
      ...project.permissions,
      edit: true,
      copy: true,
    },
  };
}

export function validateImportPermissions(
  project: HomeCheffProjectPackage,
  context: { userId?: string; isOwner?: boolean }
): { allowed: boolean; reason?: string; shouldCopy: boolean } {
  if (context.isOwner) {
    return { allowed: true, shouldCopy: false };
  }
  if (project.permissions.expiresAt && Date.parse(project.permissions.expiresAt) < Date.now()) {
    return { allowed: false, reason: "expired", shouldCopy: false };
  }
  if (!project.permissions.view && !project.permissions.copy) {
    return { allowed: false, reason: "no_view_permission", shouldCopy: false };
  }
  if (project.permissions.allowedUserIds?.length && context.userId) {
    if (!project.permissions.allowedUserIds.includes(context.userId)) {
      return { allowed: false, reason: "user_not_allowed", shouldCopy: false };
    }
  }
  const shouldCopy = Boolean(project.permissions.copy || project.permissions.edit);
  return { allowed: true, shouldCopy };
}
