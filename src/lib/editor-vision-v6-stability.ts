/**
 * Editor Vision V6 — hierarchy stability, merge guards, dev diagnostics.
 */

import type {
  EditorCanvasDocument,
  EditorVisionHierarchyNode,
  EditorVisionV6Meta,
} from "@/types/homecheff-visual-editor";

export type VisionHierarchyTrace = {
  stage: string;
  rootCount: number;
  totalNodes: number;
  rootLabels: string[];
  sampleLabels: string[];
  mergedLayerCount: number;
  visionPartCount: number;
  sourceCounts: Record<string, number>;
  meaningful: boolean;
  at: string;
};

const MEANINGFUL_PART_RE =
  /head|eye|mouth|tie|hand|shoe|globe|mascot|character|style|prop|face|jacket/i;

export function countVisionHierarchyNodes(
  nodes: EditorVisionHierarchyNode[] | undefined
): number {
  if (!nodes?.length) {
    return 0;
  }
  let count = 0;
  const walk = (list: EditorVisionHierarchyNode[]) => {
    for (const node of list) {
      count += 1;
      walk(node.children);
    }
  };
  walk(nodes);
  return count;
}

export function collectVisionHierarchyLabels(
  nodes: EditorVisionHierarchyNode[] | undefined,
  limit = 20
): string[] {
  const labels: string[] = [];
  const walk = (list: EditorVisionHierarchyNode[]) => {
    for (const node of list) {
      if (labels.length >= limit) {
        return;
      }
      labels.push(node.label);
      walk(node.children);
    }
  };
  walk(nodes ?? []);
  return labels;
}

export function isMeaningfulVisionHierarchy(
  hierarchy: EditorVisionHierarchyNode[] | undefined,
  meta?: EditorVisionV6Meta
): boolean {
  if (meta?.illustrationAnalysis && (meta.mergedLayerCount ?? 0) >= 4) {
    return true;
  }
  const total = countVisionHierarchyNodes(hierarchy);
  if (total > 3) {
    return true;
  }
  const labels = collectVisionHierarchyLabels(hierarchy, 40).join(" ");
  if (MEANINGFUL_PART_RE.test(labels)) {
    return true;
  }
  return false;
}

export function documentHasRichVisionAnalysis(document: EditorCanvasDocument): boolean {
  return (
    isMeaningfulVisionHierarchy(document.visionHierarchy, document.visionV6Meta) ||
    (document.visionV6Meta?.mergedLayerCount ?? 0) >= 4
  );
}

function countLayerSources(meta?: EditorVisionV6Meta): Record<string, number> {
  const counts: Record<string, number> = {
    rtdetr: 0,
    openai_vision: 0,
    estimated: 0,
    manual: 0,
  };
  for (const row of meta?.layerSources ?? []) {
    const key = row.source ?? "estimated";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export function traceVisionHierarchyStage(
  stage: string,
  document: EditorCanvasDocument
): VisionHierarchyTrace {
  const hierarchy = document.visionHierarchy ?? [];
  const trace: VisionHierarchyTrace = {
    stage,
    rootCount: hierarchy.length,
    totalNodes: countVisionHierarchyNodes(hierarchy),
    rootLabels: hierarchy.map((n) => n.label),
    sampleLabels: collectVisionHierarchyLabels(hierarchy),
    mergedLayerCount: document.visionV6Meta?.mergedLayerCount ?? 0,
    visionPartCount: document.visionV6Meta?.visionPartCount ?? 0,
    sourceCounts: countLayerSources(document.visionV6Meta),
    meaningful: isMeaningfulVisionHierarchy(hierarchy, document.visionV6Meta),
    at: new Date().toISOString(),
  };
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug("[editor-vision-v6]", trace);
  }
  return trace;
}

function nonBackgroundLayerCount(document: EditorCanvasDocument): number {
  return document.objects.filter((o) => o.layerType !== "background").length;
}

function analysisScore(document: EditorCanvasDocument): number {
  let score = 0;
  if (document.visionV6Meta?.illustrationAnalysis) {
    score += 1000;
  }
  score += countVisionHierarchyNodes(document.visionHierarchy) * 10;
  score += document.visionV6Meta?.mergedLayerCount ?? 0;
  score += nonBackgroundLayerCount(document) * 5;
  score += document.semanticLayers?.filter((l) => l.type !== "background").length ?? 0;
  return score;
}

/** Prefer the document with richer V6 / hierarchy data (never downgrade). */
export function mergePreservingVisionAnalysis(
  preferred: EditorCanvasDocument,
  incoming: EditorCanvasDocument
): EditorCanvasDocument {
  if (preferred.backgroundUrl !== incoming.backgroundUrl) {
    const base = incoming.updatedAt >= preferred.updatedAt ? incoming : preferred;
    const other = base === incoming ? preferred : incoming;
    return {
      ...other,
      ...base,
      backgroundUrl: base.backgroundUrl,
      backgroundStorageKey: base.backgroundStorageKey ?? other.backgroundStorageKey,
      name: base.name,
      updatedAt: new Date().toISOString(),
    };
  }

  const preferredScore = analysisScore(preferred);
  const incomingScore = analysisScore(incoming);

  const rich = preferredScore >= incomingScore ? preferred : incoming;
  const other = rich === preferred ? incoming : preferred;

  const visionHierarchy =
    isMeaningfulVisionHierarchy(rich.visionHierarchy, rich.visionV6Meta)
      ? rich.visionHierarchy
      : isMeaningfulVisionHierarchy(other.visionHierarchy, other.visionV6Meta)
        ? other.visionHierarchy
        : rich.visionHierarchy ?? other.visionHierarchy;

  const visionV6Meta = rich.visionV6Meta ?? other.visionV6Meta;
  const semanticLayers =
    (rich.semanticLayers?.length ?? 0) >= (other.semanticLayers?.length ?? 0)
      ? rich.semanticLayers
      : other.semanticLayers;
  const objects =
    nonBackgroundLayerCount(rich) >= nonBackgroundLayerCount(other) ? rich.objects : other.objects;
  const detectedObjects =
    (rich.detectedObjects?.length ?? 0) >= (other.detectedObjects?.length ?? 0)
      ? rich.detectedObjects
      : other.detectedObjects;
  const objectHierarchies = rich.objectHierarchies ?? other.objectHierarchies;

  return {
    ...other,
    ...rich,
    visionHierarchy,
    visionV6Meta,
    semanticLayers,
    objects,
    detectedObjects,
    objectHierarchies,
    visionAnalysis: rich.visionAnalysis ?? other.visionAnalysis,
    detectionMeta: rich.detectionMeta ?? other.detectionMeta,
    assetProfile: rich.assetProfile ?? other.assetProfile,
    updatedAt: new Date().toISOString(),
  };
}

export function resolveVisionHierarchyForDocument(
  document: EditorCanvasDocument,
  fallbackBuilder: () => EditorVisionHierarchyNode[]
): EditorVisionHierarchyNode[] {
  if (isMeaningfulVisionHierarchy(document.visionHierarchy, document.visionV6Meta)) {
    return document.visionHierarchy!;
  }
  return fallbackBuilder();
}

const stickyHierarchyBySession = new Map<string, EditorVisionHierarchyNode[]>();

/** UI-only: never downgrade hierarchy once a meaningful tree was shown. */
export function resolveStickyVisionHierarchy(
  document: EditorCanvasDocument
): EditorVisionHierarchyNode[] {
  const current = document.visionHierarchy ?? [];
  const analysisFresh =
    Boolean(document.analyzedBackgroundUrl?.trim()) &&
    document.analyzedBackgroundUrl === document.backgroundUrl;
  if (!analysisFresh) {
    stickyHierarchyBySession.delete(document.sessionId);
    return current;
  }
  if (isMeaningfulVisionHierarchy(current, document.visionV6Meta)) {
    stickyHierarchyBySession.set(document.sessionId, current);
    return current;
  }
  return stickyHierarchyBySession.get(document.sessionId) ?? current;
}

export function clearStickyVisionHierarchyForSession(sessionId: string): void {
  stickyHierarchyBySession.delete(sessionId);
}

/** Test helper */
export function resetStickyVisionHierarchyForTests(): void {
  stickyHierarchyBySession.clear();
}

export function editorAnalysisCacheKey(document: EditorCanvasDocument): string {
  return `${document.sessionId}::${document.backgroundUrl}`;
}
