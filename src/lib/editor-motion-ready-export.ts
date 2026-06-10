import { buildStudioMotionHandoff } from "@/lib/editor-studio-motion-handoff";
import type {
  EditorCanvasDocument,
  EditorCutoutAsset,
  EditorImportedLayer,
  EditorMotionPreparation,
  EditorStudioMotionHandoff,
} from "@/types/homecheff-visual-editor";

export type MotionReadyExportBundle = {
  profile: "motion_ready";
  sessionId: string;
  handoff: EditorStudioMotionHandoff;
  cutouts: EditorCutoutAsset[];
  importedLayers: EditorImportedLayer[];
  motionPreparations: EditorMotionPreparation[];
  includesMasks: boolean;
  includesHierarchy: boolean;
  createdAt: string;
};

export function buildMotionReadyExportBundle(document: EditorCanvasDocument): MotionReadyExportBundle {
  const handoff = document.studioMotionHandoff ?? buildStudioMotionHandoff(document);
  const cutouts = [
    ...(document.cutoutAssets ?? []),
    ...(document.partLibraryAssets ?? [])
      .filter((a) => a.cutoutUrl)
      .map((a) => ({
        id: a.id,
        objectId: a.parentObjectId,
        layerId: a.parentLayerId,
        label: a.label,
        cutoutUrl: a.cutoutUrl!,
        maskUrl: a.maskUrl,
        maskStorageKey: a.maskStorageKey,
        boundingBox: a.boundingBox,
        createdAt: a.createdAt,
      })),
  ];

  const includesMasks =
    cutouts.some((c) => c.maskUrl) ||
    (document.importedLayers ?? []).some((l) => l.maskUrl) ||
    handoff.hierarchies.some((h) => h.parts.some((p) => p.mask));

  return {
    profile: "motion_ready",
    sessionId: document.sessionId,
    handoff,
    cutouts,
    importedLayers: document.importedLayers ?? [],
    motionPreparations: document.motionPreparations ?? handoff.motionPreparations,
    includesMasks,
    includesHierarchy: handoff.hierarchies.length > 0,
    createdAt: new Date().toISOString(),
  };
}
