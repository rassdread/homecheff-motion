import { collectAnimationMetadata } from "@/lib/editor-object-animation";
import { collectExpressions } from "@/lib/editor-character-expressions";
import type {
  EditorCanvasDocument,
  EditorStudioMotionHandoff,
} from "@/types/homecheff-visual-editor";

export function buildStudioMotionHandoff(document: EditorCanvasDocument): EditorStudioMotionHandoff {
  const hierarchies = document.objectHierarchies ?? {};
  const objects = document.detectedObjects ?? [];
  const transforms: EditorStudioMotionHandoff["transforms"] = {};

  for (const object of objects) {
    if (object.localTransform) {
      transforms[object.id] = object.localTransform;
    }
    const hierarchy = hierarchies[object.id];
    if (hierarchy) {
      for (const part of hierarchy.parts) {
        transforms[part.id] = part.transform;
      }
    }
  }

  for (const layer of document.objects) {
    if (layer.layerType !== "background") {
      transforms[layer.id] = layer.transform;
    }
  }

  return {
    sessionId: document.sessionId,
    hierarchies: Object.values(hierarchies),
    transforms,
    animationProfiles: collectAnimationMetadata(hierarchies, objects),
    expressions: collectExpressions(hierarchies),
    partLibraryAssets: document.partLibraryAssets ?? [],
    cutoutAssets: document.cutoutAssets ?? [],
    motionPreparations: document.motionPreparations ?? [],
  };
}

export function attachStudioMotionHandoff(document: EditorCanvasDocument): EditorCanvasDocument {
  return {
    ...document,
    studioMotionHandoff: buildStudioMotionHandoff(document),
    updatedAt: new Date().toISOString(),
  };
}

export function handoffPreservesHierarchy(handoff: EditorStudioMotionHandoff): boolean {
  return handoff.hierarchies.length > 0 || handoff.partLibraryAssets.length > 0;
}

export function handoffPreservesMasks(handoff: EditorStudioMotionHandoff): boolean {
  const partMasks = handoff.hierarchies.some((h) => h.parts.some((p) => Boolean(p.mask)));
  const cutoutMasks = handoff.cutoutAssets.some((c) => Boolean(c.maskUrl));
  const libMasks = handoff.partLibraryAssets.some((a) => Boolean(a.maskUrl));
  return partMasks || cutoutMasks || libMasks;
}

export function mergeHandoffIntoSavePayload(
  document: EditorCanvasDocument
): EditorCanvasDocument & { studioMotionHandoff: EditorStudioMotionHandoff } {
  const handoff = buildStudioMotionHandoff(document);
  return { ...document, studioMotionHandoff: handoff };
}
