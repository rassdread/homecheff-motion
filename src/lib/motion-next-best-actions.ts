import { buildHcHandoffUrl } from "@/lib/homecheff-project-package-core";
import { buildStudioSceneHandoffUrl } from "@/lib/editor-studio-scene-handoff";
import { animationProjectDownloadUrl } from "@/lib/animation-project-download";
import { loadHomeCheffProject } from "@/lib/homecheff-project-persist";
import { extendAndPersistHcHandoff, resolveEditorToPublishHandoffUrl } from "@/lib/homecheff-project-handoff-routes";
import { buildMotionAnimateUrl } from "@/lib/editor-studio-scene-handoff";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

export type MotionNextBestAction = {
  id: string;
  labelKey: string;
  href?: string;
  cost: "free" | "credits";
  priority: number;
  external?: boolean;
};

export function resolveMotionNextBestActions(input: {
  projectId: string;
  videoUrl?: string;
  hcProjectId?: string;
  editorSessionId?: string;
  document?: EditorCanvasDocument;
  frameUrls?: string[];
}): MotionNextBestAction[] {
  const actions: MotionNextBestAction[] = [];
  const hcProject = input.hcProjectId ? loadHomeCheffProject(input.hcProjectId) : null;

  const push = (action: MotionNextBestAction) => actions.push(action);

  if (input.videoUrl) {
    push({
      id: "download",
      labelKey: "motion.postGen.download",
      href: animationProjectDownloadUrl(input.projectId),
      cost: "free",
      priority: 1,
      external: true,
    });
  }

  if (input.frameUrls?.length) {
    push({
      id: "download_frames",
      labelKey: "motion.postGen.downloadFrames",
      cost: "free",
      priority: 2,
      href: input.frameUrls.length ? `#download-frames-${input.projectId}` : undefined,
    });
  }

  push({
    id: "save_library",
    labelKey: "motion.postGen.saveLibrary",
    href: "/studio/assets",
    cost: "free",
    priority: 3,
  });

  if (input.hcProjectId) {
    push({
      id: "export_hc",
      labelKey: "motion.postGen.exportHc",
      cost: "free",
      priority: 4,
      href: `#export-hc-${input.hcProjectId}`,
    });
  }

  const publishHref = resolveMotionToPublishHandoffUrl({
    projectId: input.projectId,
    videoUrl: input.videoUrl,
    hcProjectId: input.hcProjectId,
    document: input.document,
  });
  push({
    id: "open_publish",
    labelKey: "motion.postGen.openPublish",
    href: publishHref,
    cost: "free",
    priority: 5,
  });

  const studioHref = resolveMotionToStudioHandoffUrl({
    hcProjectId: input.hcProjectId,
    editorSessionId: input.editorSessionId,
    resultUrl: input.videoUrl,
  });
  push({
    id: "send_studio_scene",
    labelKey: "motion.postGen.studioScene",
    href: studioHref,
    cost: "free",
    priority: 6,
  });

  const motionAgainHref = input.document
    ? extendAndPersistHcHandoff({ document: input.document, target: "motion", durationSec: 5 }).href
    : input.hcProjectId
      ? buildHcHandoffUrl(input.hcProjectId, "motion")
      : buildMotionAnimateUrl({
          editorSessionId: input.editorSessionId ?? "",
          durationSec: 5,
          resultUrl: input.videoUrl,
        });
  push({
    id: "animate_again",
    labelKey: "motion.postGen.animateAgain",
    href: motionAgainHref,
    cost: "credits",
    priority: 7,
  });

  const editorHref = input.hcProjectId
    ? buildHcHandoffUrl(input.hcProjectId, "editor")
    : input.editorSessionId
      ? `/editor?session=${encodeURIComponent(input.editorSessionId)}`
      : undefined;
  if (editorHref) {
    push({
      id: "open_editor",
      labelKey: "motion.postGen.openEditor",
      href: editorHref,
      cost: "free",
      priority: 8,
    });
  }

  void hcProject;
  return actions.sort((a, b) => a.priority - b.priority);
}

export function resolveMotionToPublishHandoffUrl(input: {
  projectId: string;
  videoUrl?: string;
  hcProjectId?: string;
  document?: EditorCanvasDocument;
}): string {
  if (input.document) {
    return resolveEditorToPublishHandoffUrl({
      document: input.document,
      editorSessionId: input.document.sessionId,
      resultUrl: input.videoUrl,
      hcProjectId: input.hcProjectId,
    });
  }
  if (input.hcProjectId) {
    return buildHcHandoffUrl(input.hcProjectId, "publish");
  }
  if (input.videoUrl) {
    return `/publish?video=${encodeURIComponent(input.videoUrl)}&motion=${encodeURIComponent(input.projectId)}`;
  }
  return `/publish?motion=${encodeURIComponent(input.projectId)}`;
}

export function resolveMotionToStudioHandoffUrl(input: {
  hcProjectId?: string;
  editorSessionId?: string;
  resultUrl?: string;
}): string {
  if (input.hcProjectId) {
    return buildHcHandoffUrl(input.hcProjectId, "studio");
  }
  if (input.editorSessionId) {
    return buildStudioSceneHandoffUrl({
      editorSessionId: input.editorSessionId,
      resultUrl: input.resultUrl,
    });
  }
  return "/studio/start";
}

export function motionGenerationPackageFromHc(project: HomeCheffProjectPackage | null) {
  return project?.servicePayload?.editor?.generationPackages?.[0];
}
