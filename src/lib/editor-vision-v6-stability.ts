/**
 * Editor Vision V6 — hierarchy stability, merge guards, dev diagnostics.
 */

import { editorAnalysisAppliesToBackground } from "@/lib/editor-analysis-reset";
import type {
  EditorCanvasDocument,
  EditorVisionHierarchyNode,
  EditorVisionV6Meta,
} from "@/types/homecheff-visual-editor";
import type { EditorVisionAnalysisRunMeta } from "@/lib/editor-vision-analysis-run";
import {
  getEditorVisionAnalysisRunMeta,
  isEditorVisionAnalysisInProgress,
  isEditorVisionAnalysisLoading,
  shouldShowFinalVisionHierarchy,
  shouldShowPartialVisionHierarchy,
} from "@/lib/editor-vision-analysis-run";
import { normalizeEditorVisionScopeUrl } from "@/lib/editor-vision-analysis-scope";
import {
  buildVisibleEditorPartsTreeFromDocument,
} from "@/lib/build-visible-editor-parts-tree";
import {
  isVisionPartsLossTracingStopped,
  traceVisionPartsLossStage,
} from "@/lib/editor-vision-parts-loss-trace";

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
  /head|eye|ogen|mouth|mond|tie|hand|shoe|globe|mascot|character|style|prop|face|jacket|paw|tail|snout|ear|hair|haar|body|lichaam|torso|arm|leg|foot|nose|outfit|clothing|kleding|accessoire|bril|zonnebril/i;

const BACKGROUND_DECORATION_LABEL_RE =
  /^(background|color|lighting|shadow|safe empty area|safe area|style|visual style)$/i;

const SUBJECT_ROOT_LABEL_RE =
  /person|personage|character|mascot|mascotte|dier|animal|human|portrait|dog|cat|main subject|hoofdonderwerp|objects|detected on image|character \//i;

const GENERIC_SUBJECT_CONTAINER_LABEL_RE =
  /^(objects|main subject|hoofdonderwerp|detected on image)$/i;

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

function countSubjectPartNodes(nodes: EditorVisionHierarchyNode[] | undefined): number {
  if (!nodes?.length) {
    return 0;
  }
  let count = 0;
  const walk = (list: EditorVisionHierarchyNode[], inSubjectBranch: boolean) => {
    for (const node of list) {
      const isBg =
        node.category === "background" || BACKGROUND_DECORATION_LABEL_RE.test(node.label.trim());
      const isSubjectBranch =
        inSubjectBranch || SUBJECT_ROOT_LABEL_RE.test(node.label) || node.category === "objects";
      if (
        isSubjectBranch &&
        !isBg &&
        !BACKGROUND_DECORATION_LABEL_RE.test(node.label.trim()) &&
        !GENERIC_SUBJECT_CONTAINER_LABEL_RE.test(node.label.trim())
      ) {
        count += 1;
      }
      walk(node.children, isSubjectBranch);
    }
  };
  walk(nodes, false);
  return count;
}

/** Background-only or main-subject-without-parts — not sufficient to skip bootstrap. */
export function isWeakBackgroundOnlyAnalysis(
  document: Pick<EditorCanvasDocument, "visionHierarchy" | "visionV6Meta"> &
    Partial<Pick<EditorCanvasDocument, "objects" | "detectedObjects">>
): boolean {
  const hierarchy = document.visionHierarchy ?? [];
  if (hierarchy.length === 0) {
    return true;
  }

  const labels = collectVisionHierarchyLabels(hierarchy, 100);
  const joined = labels.join(" ").toLowerCase();
  if (MEANINGFUL_PART_RE.test(joined)) {
    return false;
  }

  const subjectPartNodes = countSubjectPartNodes(hierarchy);
  const hasSubjectRoot = labels.some((label) => SUBJECT_ROOT_LABEL_RE.test(label));
  const nonDecorationLabels = labels.filter(
    (label) => !BACKGROUND_DECORATION_LABEL_RE.test(label.trim())
  );

  if (nonDecorationLabels.length === 0) {
    return true;
  }

  if (!hasSubjectRoot && subjectPartNodes === 0) {
    return true;
  }

  if (hasSubjectRoot && subjectPartNodes <= 1) {
    return true;
  }

  if (document.objects || document.detectedObjects) {
    const nonBackgroundObjects =
      document.detectedObjects?.filter((obj) => obj.category !== "background").length ??
      document.objects?.filter((obj) => obj.layerType !== "background").length ??
      0;
    if (nonBackgroundObjects > 0 && subjectPartNodes <= 1 && !MEANINGFUL_PART_RE.test(joined)) {
      return true;
    }
  }

  return false;
}

export function isMeaningfulVisionHierarchy(
  hierarchy: EditorVisionHierarchyNode[] | undefined,
  meta?: EditorVisionV6Meta
): boolean {
  if (isWeakBackgroundOnlyAnalysis({ visionHierarchy: hierarchy, visionV6Meta: meta })) {
    return false;
  }
  const labels = collectVisionHierarchyLabels(hierarchy, 40).join(" ");
  if (MEANINGFUL_PART_RE.test(labels)) {
    return true;
  }
  if (countSubjectPartNodes(hierarchy) >= 3) {
    return true;
  }
  if (meta?.illustrationAnalysis && (meta.mergedLayerCount ?? 0) >= 6 && countSubjectPartNodes(hierarchy) >= 2) {
    return true;
  }
  return false;
}

export function documentHasRichVisionAnalysis(document: EditorCanvasDocument): boolean {
  if (isWeakBackgroundOnlyAnalysis(document)) {
    return false;
  }
  if (isMeaningfulVisionHierarchy(document.visionHierarchy, document.visionV6Meta)) {
    return true;
  }
  const visible = buildVisibleEditorPartsTreeFromDocument(document);
  return (
    visible.debug.visibleLeafLabels.length >= 3 ||
    (document.visionV6Meta?.openAiPartsUsed === true && visible.debug.rawPartsCount >= 4)
  );
}

const FACE_DETAIL_PART_RE =
  /\b(eyes?|ogen|mouth|mond|hair|haar|beard|baard|sunglasses|zonnebril|glasses|bril|necklace|ketting)\b/i;

/**
 * True when vision analysis completed the full enrichment path (Vision Parts + accessories),
 * not merely a provisional RT-DETR / head-only tree.
 */
export function documentHasCompletedFullVisionAnalysis(document: EditorCanvasDocument): boolean {
  if (document.visionV6Meta?.analysisTier === "premium") {
    return editorAnalysisAppliesToBackground(document) && !isWeakBackgroundOnlyAnalysis(document);
  }
  if (document.visionV6Meta?.analysisTier === "basic") {
    return false;
  }
  if (!editorAnalysisAppliesToBackground(document)) {
    return false;
  }
  if (isWeakBackgroundOnlyAnalysis(document)) {
    return false;
  }
  const meta = document.visionV6Meta;
  const labels = collectVisionHierarchyLabels(document.visionHierarchy, 60).join(" ").toLowerCase();
  const subjectParts = countSubjectPartNodes(document.visionHierarchy);
  const visionPartCount = meta?.visionPartCount ?? 0;
  const hierarchyNodes = countVisionHierarchyNodes(document.visionHierarchy);

  if (meta?.openAiPartsUsed && visionPartCount >= 4) {
    return true;
  }

  if (subjectParts <= 2 && hierarchyNodes <= 6 && !FACE_DETAIL_PART_RE.test(labels)) {
    return false;
  }

  if (meta?.illustrationAnalysis && visionPartCount >= 6 && subjectParts >= 4) {
    return true;
  }
  if (visionPartCount >= 8 && subjectParts >= 5) {
    return true;
  }
  if (FACE_DETAIL_PART_RE.test(labels) && subjectParts >= 4 && visionPartCount >= 4) {
    return true;
  }
  return false;
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
  return visionDocumentRichnessScore(document);
}

const FACE_PART_RE = /\b(face|eyes|eye|mouth|hair|head|gezicht|ogen|mond|haar)\b/i;
const CLOTHING_PART_RE = /\b(shirt|jacket|pants|shoe|tie|kleding|broek|jas)\b/i;
const ACCESSORY_PART_RE = /\b(sunglasses|glasses|bril|necklace|watch|hat|cap|accessoire|zonnebril)\b/i;

/** Score hierarchy richness for compare/merge decisions. */
export function visionDocumentRichnessScore(document: EditorCanvasDocument): number {
  let score = 0;
  if (document.visionV6Meta?.illustrationAnalysis) {
    score += 1000;
  }
  const labels = collectVisionHierarchyLabels(document.visionHierarchy, 120).join(" ").toLowerCase();
  score += countVisionHierarchyNodes(document.visionHierarchy) * 10;
  score += document.visionV6Meta?.mergedLayerCount ?? 0;
  score += (document.visionV6Meta?.mergedAnalysisParts?.length ?? 0) * 8;
  const visible = buildVisibleEditorPartsTreeFromDocument(document);
  score += visible.debug.rawPartsCount * 6;
  score += visible.debug.visibleLeafLabels.length * 5;
  score += nonBackgroundLayerCount(document) * 5;
  score += document.semanticLayers?.filter((l) => l.type !== "background").length ?? 0;
  if (FACE_PART_RE.test(labels)) {
    score += 40;
  }
  if (CLOTHING_PART_RE.test(labels)) {
    score += 30;
  }
  if (ACCESSORY_PART_RE.test(labels)) {
    score += 35;
  }
  if (document.visionV6Meta?.openAiPartsUsed) {
    score += 15;
  }
  const accessoryParts =
    document.visionV6Meta?.layerSources?.filter((row) =>
      ACCESSORY_PART_RE.test(row.label.toLowerCase())
    ).length ?? 0;
  score += accessoryParts * 8;
  return score;
}

export type ChooseRicherVisionDocumentResult = {
  document: EditorCanvasDocument;
  keptPrevious: boolean;
  previousScore: number;
  nextScore: number;
};

/** Never replace a richer provisional tree with a weaker final unless evidence is clearly better. */
export function chooseRicherVisionDocument(
  previous: EditorCanvasDocument,
  next: EditorCanvasDocument
): EditorCanvasDocument {
  const result = compareVisionDocumentRichness(previous, next);
  if (!result.keptPrevious) {
    return next;
  }
  const previousRun = previous.visionAnalysisRun ?? next.visionAnalysisRun;
  return {
    ...previous,
    visionAnalysisRun: previousRun
      ? {
          ...previousRun,
          status: "complete",
          isPartial: true,
          needsDeepAnalysis: true,
          fallbackUsed: true,
          terminalStateReason: "final_weaker_than_provisional",
          completedAt: previousRun.completedAt ?? new Date().toISOString(),
          finalCount: countVisionHierarchyNodes(previous.visionHierarchy),
          provisionalCount:
            previousRun.provisionalCount ?? countVisionHierarchyNodes(previous.visionHierarchy),
        }
      : next.visionAnalysisRun,
    updatedAt: new Date().toISOString(),
  };
}

export function compareVisionDocumentRichness(
  previous: EditorCanvasDocument,
  next: EditorCanvasDocument
): ChooseRicherVisionDocumentResult {
  const previousScore = visionDocumentRichnessScore(previous);
  const nextScore = visionDocumentRichnessScore(next);
  const previousNodes = countVisionHierarchyNodes(previous.visionHierarchy);
  const nextNodes = countVisionHierarchyNodes(next.visionHierarchy);
  const nextStrongerEvidence =
    Boolean(next.visionV6Meta?.openAiPartsUsed) &&
    !previous.visionV6Meta?.openAiPartsUsed &&
    nextScore >= previousScore - 20;
  const nextRicherVisibleParts =
    (next.visionV6Meta?.mergedAnalysisParts?.length ?? 0) >
      (previous.visionV6Meta?.mergedAnalysisParts?.length ?? 0) &&
    nextScore >= previousScore - 15;
  const keptPrevious =
    !nextStrongerEvidence &&
    !nextRicherVisibleParts &&
    (previousScore > nextScore + 5 ||
      (previousNodes > nextNodes + 1 && nextScore <= previousScore));
  return {
    document: keptPrevious ? previous : next,
    keptPrevious,
    previousScore,
    nextScore,
  };
}

/** Prefer the document with richer V6 / hierarchy data (never downgrade). */
export function mergePreservingVisionAnalysis(
  preferred: EditorCanvasDocument,
  incoming: EditorCanvasDocument
): EditorCanvasDocument {
  if (preferred.backgroundUrl !== incoming.backgroundUrl) {
    const base = incoming.updatedAt >= preferred.updatedAt ? incoming : preferred;
    return {
      ...base,
      visionHierarchy: undefined,
      visionV6Meta: undefined,
      visionAnalysis: undefined,
      visionAnalysisHash: undefined,
      analyzedBackgroundUrl: undefined,
      semanticLayers: undefined,
      detectedObjects: undefined,
      objectHierarchies: undefined,
      detectionMeta: undefined,
      assetProfile: undefined,
      isolationScope: undefined,
      hierarchicalSelection: base.hierarchicalSelection,
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

function stickyHierarchyKey(document: EditorCanvasDocument): string {
  const analysisId =
    document.isolationScope?.analysisId ?? document.visionAnalysisRun?.analysisId ?? "pending";
  return `${document.sessionId}::${document.backgroundUrl}::${analysisId}`;
}

function rememberStickyHierarchy(
  document: EditorCanvasDocument,
  hierarchy: EditorVisionHierarchyNode[],
  runMeta?: EditorVisionAnalysisRunMeta | null
): void {
  if (!hierarchy.length) {
    return;
  }
  const meta = runMeta ?? getEditorVisionAnalysisRunMeta(document);
  const analysisFresh =
    Boolean(document.analyzedBackgroundUrl?.trim()) &&
    normalizeEditorVisionScopeUrl(document.analyzedBackgroundUrl) ===
      normalizeEditorVisionScopeUrl(document.backgroundUrl);
  if (analysisFresh || isEditorVisionAnalysisInProgress(meta?.status)) {
    stickyHierarchyBySession.set(stickyHierarchyKey(document), hierarchy);
  }
}

/** UI-only: never downgrade hierarchy once a meaningful tree was shown for this analysis run. */
export function resolveStickyVisionHierarchy(
  document: EditorCanvasDocument,
  runMeta?: EditorVisionAnalysisRunMeta | null
): EditorVisionHierarchyNode[] {
  const current = document.visionHierarchy ?? [];
  const meta = runMeta ?? getEditorVisionAnalysisRunMeta(document);
  const analysisFresh =
    Boolean(document.analyzedBackgroundUrl?.trim()) &&
    normalizeEditorVisionScopeUrl(document.analyzedBackgroundUrl) ===
      normalizeEditorVisionScopeUrl(document.backgroundUrl);
  const cacheKey = stickyHierarchyKey(document);
  const sticky = stickyHierarchyBySession.get(cacheKey);

  if (isMeaningfulVisionHierarchy(current, document.visionV6Meta)) {
    if (analysisFresh || isEditorVisionAnalysisInProgress(meta?.status)) {
      stickyHierarchyBySession.set(cacheKey, current);
    }
    return current;
  }

  if (sticky?.length) {
    return sticky;
  }

  if (!analysisFresh && !isEditorVisionAnalysisInProgress(meta?.status)) {
    for (const key of stickyHierarchyBySession.keys()) {
      if (key.startsWith(`${document.sessionId}::${document.backgroundUrl}::`)) {
        stickyHierarchyBySession.delete(key);
      }
    }
  }
  return current;
}

/** Stable hierarchy for parts panel — prefers visible parts tree from found data. */
export function resolveDisplayVisionHierarchy(
  document: EditorCanvasDocument,
  runMeta?: EditorVisionAnalysisRunMeta | null
): EditorVisionHierarchyNode[] {
  const meta = runMeta ?? getEditorVisionAnalysisRunMeta(document);
  const visible = buildVisibleEditorPartsTreeFromDocument(document);

  if (visible.tree.length > 0 && visible.debug.rawPartsCount > 0) {
    rememberStickyHierarchy(document, visible.tree, meta);
    if (!isVisionPartsLossTracingStopped()) {
      traceVisionPartsLossStage("vision_parts_rendered", {
        sessionId: document.sessionId,
        runId: meta?.runId,
        document,
        hierarchy: visible.tree,
      });
    }
    return visible.tree;
  }

  if (meta?.status === "partial" || meta?.status === "finalizing") {
    return resolveStickyVisionHierarchy(document, meta);
  }
  if (meta?.status === "detecting") {
    if (document.visionHierarchy?.length) {
      return resolveStickyVisionHierarchy(document, meta);
    }
    return [];
  }
  if (meta?.status === "failed") {
    if (document.visionHierarchy?.length) {
      return resolveStickyVisionHierarchy(document, meta);
    }
    return [];
  }
  if (shouldShowFinalVisionHierarchy(document, meta)) {
    return resolveStickyVisionHierarchy(document, meta);
  }
  if (documentHasRichVisionAnalysis(document)) {
    const hierarchy = resolveStickyVisionHierarchy(document, meta);
    if (!isVisionPartsLossTracingStopped()) {
      traceVisionPartsLossStage("vision_parts_rendered", {
        sessionId: document.sessionId,
        runId: meta?.runId,
        document,
        hierarchy,
      });
    }
    return hierarchy;
  }
  return [];
}

export function clearStickyVisionHierarchyForSession(sessionId: string): void {
  for (const key of stickyHierarchyBySession.keys()) {
    if (key.startsWith(`${sessionId}::`) || key === sessionId) {
      stickyHierarchyBySession.delete(key);
    }
  }
}

/** Test helper */
export function resetStickyVisionHierarchyForTests(): void {
  stickyHierarchyBySession.clear();
}

export function editorAnalysisCacheKey(document: EditorCanvasDocument): string {
  return `${document.sessionId}::${document.backgroundUrl}`;
}
