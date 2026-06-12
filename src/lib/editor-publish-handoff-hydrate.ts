import { loadEditorCanvasDocument } from "@/lib/editor-canvas-session";
import {
  loadGenerationPackage,
  loadGenerationPackageBySession,
} from "@/lib/editor-generation-package-persist";
import { primaryResultUrlFromPackage } from "@/lib/editor-generation-package-download";
import { createPublishProject, savePublishProject } from "@/lib/publish-overlay-session";
import { parsePublishHandoffParams } from "@/lib/editor-publish-handoff";
import type { PublishProject, PublishProjectMediaKind } from "@/types/publish-overlay";
import type { EditorGenerationPackage } from "@/types/editor-generation-package";

export type EditorPublishHandoffParams = ReturnType<typeof parsePublishHandoffParams>;

function resolvePackage(params: EditorPublishHandoffParams): EditorGenerationPackage | null {
  if (params.packageId) {
    const byId = loadGenerationPackage(params.packageId);
    if (byId) {
      return byId;
    }
  }
  if (params.editorSessionId) {
    const doc = loadEditorCanvasDocument(params.editorSessionId);
    const fromDoc = doc?.instructionStudioState?.generationPackage;
    if (fromDoc) {
      return fromDoc;
    }
    return loadGenerationPackageBySession(params.editorSessionId);
  }
  return null;
}

function mediaKindForIntent(intent: string | undefined, pkg: EditorGenerationPackage | null): PublishProjectMediaKind {
  if (intent === "social_carousel" || intent === "story") {
    return "carousel";
  }
  if (intent === "subtitles" || intent === "voice" || intent === "music") {
    return pkg?.motionOutputs[0]?.url ? "video" : "image";
  }
  if (pkg?.motionOutputs[0]?.url) {
    return "video";
  }
  if ((pkg?.sequenceFrames.length ?? 0) > 1 && (intent === "social_carousel" || intent === "story")) {
    return "carousel";
  }
  if ((pkg?.sequenceFrames.length ?? 0) > 1) {
    return "carousel";
  }
  if (pkg?.generatedImages[0]?.url || pkg?.thumbnails[0]?.url) {
    return "image";
  }
  return "video";
}

function projectName(intent: string | undefined, workflow: string | undefined): string {
  const intentLabel: Record<string, string> = {
    text_overlay: "Text overlay",
    social_post: "Social post",
    social_carousel: "Carousel",
    subtitles: "Subtitles",
    voice: "Voice-over",
    music: "Music",
    print: "Print export",
    flyer: "Flyer",
    story: "Story",
  };
  const base = intent ? intentLabel[intent] ?? intent : "Publish";
  return workflow ? `${base} · ${workflow.replace(/_/g, " ")}` : base;
}

export function hydratePublishProjectFromEditorHandoff(
  searchParams: URLSearchParams
): PublishProject | null {
  const params = parsePublishHandoffParams(searchParams);
  if (!params.editorSessionId && !params.resultUrl && !params.packageId) {
    return null;
  }

  const pkg = resolvePackage(params);
  const intent = params.intent ?? "text_overlay";
  const mediaKind = mediaKindForIntent(intent, pkg);

  const videoUrl =
    pkg?.motionOutputs[0]?.url ??
    (mediaKind === "video" ? params.resultUrl : undefined) ??
    "";

  const imageUrl =
    params.resultUrl ??
    (pkg ? primaryResultUrlFromPackage(pkg) : undefined) ??
    pkg?.generatedImages[0]?.url;

  const imageUrls =
    pkg && (pkg.sequenceFrames.length > 1 || intent === "social_carousel" || intent === "story")
      ? pkg.sequenceFrames.length
        ? pkg.sequenceFrames.sort((a, b) => (a.stepIndex ?? 0) - (b.stepIndex ?? 0)).map((f) => f.url)
        : pkg.orderedFrameUrls
      : imageUrl
        ? [imageUrl]
        : [];

  if (!videoUrl && !imageUrls.length) {
    return null;
  }

  const workflow = pkg?.workflow ? String(pkg.workflow) : undefined;

  const project = createPublishProject({
    name: projectName(intent, workflow),
    videoUrl: videoUrl || imageUrls[0]!,
    durationSeconds: mediaKind === "video" ? 30 : 10,
    source: "editor",
    mediaKind,
    imageUrl: imageUrls[0],
    imageUrls,
    editorSessionId: params.editorSessionId,
    publishIntent: intent,
    generationPackageId: pkg?.id ?? params.packageId,
    workflow,
    metadata: pkg
      ? {
          sourceReferences: pkg.sourceReferences,
          metadataSnapshot: pkg.metadataSnapshot,
          orderedFrameUrls: pkg.orderedFrameUrls,
        }
      : undefined,
  });

  if (intent === "subtitles") {
    project.overlays = [];
  } else if (intent === "text_overlay" || intent === "flyer") {
    project.overlays = [];
  }

  return savePublishProject(project);
}

export function editorHandoffHasPublishPayload(searchParams: URLSearchParams): boolean {
  return Boolean(
    searchParams.get("editorSession")?.trim() ||
      searchParams.get("publishIntent")?.trim() ||
      searchParams.get("generationPackage")?.trim() ||
      searchParams.get("handoffSource") === "editor_generation"
  );
}
