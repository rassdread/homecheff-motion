/**
 * Editor project isolation — guarantees vision/analysis belongs only to the
 * current asset + project. Prevents cross-session contamination.
 */

import { clearCachedEditorAnalysis } from "@/lib/editor-analysis-cache";
import { resetEditorAnalysisTimings } from "@/lib/editor-analysis-performance";
import {
  clearAssistantEditorContext,
  ASSISTANT_EDITOR_CONTEXT_STORAGE_KEY,
} from "@/lib/assistant-editor-context-bridge";
import {
  ASSISTANT_EDITOR_FUSION_BOOTSTRAP_KEY,
  ASSISTANT_PREFILL_STORAGE_KEY,
} from "@/lib/assistant-prefill-storage";
import { createDefaultHierarchicalSelection } from "@/lib/editor-hierarchical-selection";
import {
  editorAnalysisAppliesToBackground,
  resetEditorAnalysisState,
} from "@/lib/editor-analysis-reset";
import { splitAnalysisIntoTruthSections } from "@/lib/editor-vision-truth-mode";
import {
  clearStickyVisionHierarchyForSession,
  documentHasRichVisionAnalysis,
} from "@/lib/editor-vision-v6-stability";
import { traceSanitizeIsolationStage } from "@/lib/editor-vision-hierarchy-loss-trace";
import type { IllustrationPartAnalysisResult } from "@/types/editor-illustration-parts";
import type { EditorAnalysisIsolationScope, EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type { EditorAnalysisIsolationScope };

export type EditorVisionTruthDebugReport = {
  detected: string[];
  estimated: string[];
  fallback: string[];
  creative: string[];
};

export type EditorProjectIsolationAuditRow = {
  stateSource: string;
  persistenceType: string;
  resetLocation: string;
  leakRisk: "high" | "medium" | "low";
  usedBy: string;
};

export const EDITOR_PROJECT_ISOLATION_AUDIT: EditorProjectIsolationAuditRow[] = [
  {
    stateSource: "EditorCanvasDocument (canonical)",
    persistenceType: "localStorage hc-editor-canvas-sessions-v1 + React props",
    resetLocation: "resetEditorAnalysisState / createEditorDocumentFromUpload / beginFreshEditorProject",
    leakRisk: "high",
    usedBy: "All editor workspaces, vision bootstrap, object feed",
  },
  {
    stateSource: "bootstrapResultCache (editor-analysis-cache.ts)",
    persistenceType: "module memory Map",
    resetLocation: "clearCachedEditorAnalysis / clearEditorProjectIsolationCaches",
    leakRisk: "high",
    usedBy: "bootstrapEditorObjectDetection short-circuit",
  },
  {
    stateSource: "stickyHierarchyBySession (editor-vision-v6-stability.ts)",
    persistenceType: "module memory Map keyed sessionId::backgroundUrl",
    resetLocation: "clearStickyVisionHierarchyForSession",
    leakRisk: "high",
    usedBy: "resolveStickyVisionHierarchy UI",
  },
  {
    stateSource: "mergePreservingVisionAnalysis",
    persistenceType: "merge at hydrate/sync",
    resetLocation: "Strips vision when backgroundUrl differs",
    leakRisk: "high",
    usedBy: "editor-product-page server/local merge",
  },
  {
    stateSource: "HomeCheffAssistantProvider memory/messages",
    persistenceType: "React context (provider lifetime)",
    resetLocation: "clearEditorAssistantIsolationContext + hc-editor-project-reset event",
    leakRisk: "high",
    usedBy: "Editor copilot, prefill, tool matcher",
  },
  {
    stateSource: "hc-assistant-editor-context-v1",
    persistenceType: "sessionStorage",
    resetLocation: "clearAssistantEditorContext",
    leakRisk: "medium",
    usedBy: "Copilot context bar, assistant intelligence",
  },
  {
    stateSource: "hc-assistant-prefill-v1 / fusion bootstrap",
    persistenceType: "sessionStorage",
    resetLocation: "clearEditorAssistantIsolationContext",
    leakRisk: "medium",
    usedBy: "Assistant wizard prefill, fusion start",
  },
  {
    stateSource: "EditorCanvasWorkspace UI state (~30 useState)",
    persistenceType: "memory",
    resetLocation: "useEffect on sessionId+backgroundUrl; workspace remount on new project",
    leakRisk: "medium",
    usedBy: "editor-canvas-workspace.tsx",
  },
  {
    stateSource: "documentOverride (EditorProductPage)",
    persistenceType: "memory",
    resetLocation: "handleBack / beginFreshEditorProject",
    leakRisk: "medium",
    usedBy: "editor-product-page.tsx",
  },
  {
    stateSource: "Taxonomy templates (human/animal/mascot)",
    persistenceType: "pure functions (no cache)",
    resetLocation: "N/A — separated via Vision Truth Mode creativeCapabilities",
    leakRisk: "low",
    usedBy: "mergeIllustrationPartsWithVisionTaxonomy",
  },
  {
    stateSource: "hc-editor-recent-placements-v1",
    persistenceType: "localStorage global",
    resetLocation: "Not cleared on project switch (placement prefs only)",
    leakRisk: "medium",
    usedBy: "editor-placement-canvas.ts",
  },
  {
    stateSource: "instruction object feed",
    persistenceType: "derived from document",
    resetLocation: "resetEditorAnalysisState clears source fields",
    leakRisk: "medium",
    usedBy: "editor-instruction-object-feed.ts",
  },
];

export const EDITOR_PROJECT_RESET_EVENT = "hc-editor-project-reset";

export function createEditorAnalysisId(): string {
  return `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function resolveEditorAssetId(document: EditorCanvasDocument): string {
  if (document.sourceAssetId?.trim()) {
    return document.sourceAssetId.trim();
  }
  return `${document.sessionId}::${document.backgroundUrl}`;
}

export function resolveEditorProjectId(document: EditorCanvasDocument): string {
  return document.instructionStudioState?.hcProjectId?.trim() || document.sessionId;
}

export function buildEditorAnalysisIsolationScope(
  document: EditorCanvasDocument,
  analysisId?: string
): EditorAnalysisIsolationScope {
  return {
    assetId: resolveEditorAssetId(document),
    projectId: resolveEditorProjectId(document),
    analysisId: analysisId ?? document.isolationScope?.analysisId ?? createEditorAnalysisId(),
    sessionId: document.sessionId,
    backgroundUrl: document.backgroundUrl,
  };
}

export function editorIsolationScopeMatches(
  scope: EditorAnalysisIsolationScope | undefined,
  document: EditorCanvasDocument
): boolean {
  if (!scope) {
    return editorAnalysisAppliesToBackground(document);
  }
  const current = buildEditorAnalysisIsolationScope(document, scope.analysisId);
  return (
    scope.sessionId === current.sessionId &&
    scope.backgroundUrl === current.backgroundUrl &&
    scope.assetId === current.assetId &&
    scope.projectId === current.projectId
  );
}

let staleAnalysisRejectCount = 0;

export function getStaleAnalysisRejectCountForTests(): number {
  return staleAnalysisRejectCount;
}

export function resetStaleAnalysisRejectCountForTests(): void {
  staleAnalysisRejectCount = 0;
}

function logRejectedStaleAnalysis(
  scope: EditorAnalysisIsolationScope,
  document: EditorCanvasDocument
): void {
  staleAnalysisRejectCount += 1;
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn("[editor-isolation] Rejected stale analysis", {
      scope,
      current: buildEditorAnalysisIsolationScope(document),
    });
  }
}

/**
 * Strip analysis that does not belong to the current asset/project/background.
 * Call before render and after loading from storage/cache.
 */
export function sanitizeDocumentForAssetIsolation(
  document: EditorCanvasDocument
): EditorCanvasDocument {
  if (!documentHasRichVisionAnalysis(document)) {
    return document;
  }

  if (editorIsolationScopeMatches(document.isolationScope, document)) {
    return document;
  }

  if (document.isolationScope) {
    logRejectedStaleAnalysis(document.isolationScope, document);
  } else if (!editorAnalysisAppliesToBackground(document)) {
    logRejectedStaleAnalysis(
      {
        assetId: "unknown",
        projectId: "unknown",
        analysisId: "unknown",
        sessionId: document.sessionId,
        backgroundUrl: document.analyzedBackgroundUrl ?? "",
      },
      document
    );
  }

  const reset = resetEditorAnalysisState(document, { preserveInstructionWorkflow: true });
  const next = {
    ...reset,
    isolationScope: undefined,
  };
  traceSanitizeIsolationStage({ before: document, after: next });
  return next;
}

export function stampEditorAnalysisIsolationScope(
  document: EditorCanvasDocument,
  analysisId?: string
): EditorCanvasDocument {
  const scope = buildEditorAnalysisIsolationScope(document, analysisId);
  return {
    ...document,
    isolationScope: scope,
    visionV6Meta: document.visionV6Meta
      ? {
          ...document.visionV6Meta,
          isolationScope: scope,
        }
      : document.visionV6Meta,
  };
}

/** Stamp a stable analysisId before the first vision run — avoids scopeKey drift in the run store. */
const pendingAnalysisIdByAssetKey = new Map<string, string>();

function editorIsolationAssetKey(document: EditorCanvasDocument): string {
  return `${resolveEditorProjectId(document)}::${resolveEditorAssetId(document)}::${document.backgroundUrl.trim()}`;
}

export function ensureEditorAnalysisIsolationScope(
  document: EditorCanvasDocument
): EditorCanvasDocument {
  if (document.isolationScope?.analysisId?.trim()) {
    return document;
  }
  const assetKey = editorIsolationAssetKey(document);
  const pendingId = pendingAnalysisIdByAssetKey.get(assetKey);
  if (pendingId) {
    return stampEditorAnalysisIsolationScope(document, pendingId);
  }
  const stamped = stampEditorAnalysisIsolationScope(document);
  const analysisId = stamped.isolationScope?.analysisId;
  if (analysisId) {
    pendingAnalysisIdByAssetKey.set(assetKey, analysisId);
  }
  return stamped;
}

export function resetPendingAnalysisIdRegistryForTests(): void {
  pendingAnalysisIdByAssetKey.clear();
}

export function clearEditorProjectIsolationCaches(
  sessionId: string,
  projectId?: string
): void {
  clearCachedEditorAnalysis(sessionId, projectId);
  clearStickyVisionHierarchyForSession(sessionId);
  resetEditorAnalysisTimings(sessionId);
}

export function clearEditorAssistantIsolationContext(): void {
  clearAssistantEditorContext();
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.removeItem(ASSISTANT_PREFILL_STORAGE_KEY);
    window.sessionStorage.removeItem(ASSISTANT_EDITOR_FUSION_BOOTSTRAP_KEY);
    window.sessionStorage.removeItem(ASSISTANT_EDITOR_CONTEXT_STORAGE_KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(EDITOR_PROJECT_RESET_EVENT));
}

export function clearAllEditorProjectIsolationState(
  sessionId?: string,
  projectId?: string
): void {
  if (sessionId) {
    clearEditorProjectIsolationCaches(sessionId, projectId);
  }
  clearEditorAssistantIsolationContext();
}

/** Complete reset — new session identity, background-only canvas. */
export function createFreshEditorProjectDocument(params: {
  name?: string;
  backgroundUrl?: string;
  backgroundStorageKey?: string;
  sourceKind?: EditorCanvasDocument["sourceKind"];
  sourceAssetId?: string | null;
  workspaceMode?: EditorCanvasDocument["workspaceMode"];
}): EditorCanvasDocument {
  const sessionId = crypto.randomUUID();
  const now = new Date().toISOString();
  const backgroundUrl = params.backgroundUrl ?? "";

  const doc: EditorCanvasDocument = {
    sessionId,
    name: params.name ?? "Untitled",
    sourceKind: params.sourceKind ?? "upload",
    sourceAssetId: params.sourceAssetId ?? null,
    backgroundUrl,
    backgroundStorageKey: params.backgroundStorageKey,
    workflowStep: backgroundUrl ? "object_detection" : "visual_editor",
    workspaceMode: params.workspaceMode ?? "instruction_studio",
    objects: backgroundUrl
      ? [
          {
            id: "background",
            label: "Background",
            sourceKind: params.sourceKind ?? "upload",
            assetId: params.sourceAssetId ?? null,
            storageKey: params.backgroundStorageKey ?? "",
            previewUrl: backgroundUrl,
            transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
            locked: true,
            visible: true,
            bounds: { x: 0, y: 0, width: 1, height: 1 },
            layerType: "background",
            confidence: 1,
          },
        ]
      : [],
    placements: [],
    hierarchicalSelection: createDefaultHierarchicalSelection(),
    status: "editing",
    createdAt: now,
    updatedAt: now,
  };

  return doc;
}

/** Same image, fresh analysis — clears all derived vision state. */
export function reanalyzeEditorProjectFromCurrentImage(
  document: EditorCanvasDocument
): EditorCanvasDocument {
  clearEditorProjectIsolationCaches(document.sessionId, resolveEditorProjectId(document));

  const reset = resetEditorAnalysisState(document, {
    preserveInstructionWorkflow: false,
    clearAssistantState: true,
    clearEditHistory: true,
  });

  const analysisId = createEditorAnalysisId();
  return {
    ...reset,
    workflowStep: "object_detection",
    isolationScope: buildEditorAnalysisIsolationScope(reset, analysisId),
    updatedAt: new Date().toISOString(),
  };
}

/** Vision Truth Mode debug — never merges tiers silently. */
export function buildVisionTruthDebugReport(
  document: EditorCanvasDocument
): EditorVisionTruthDebugReport {
  const parts: IllustrationPartAnalysisResult = {
    parts: [],
    characterLabel: "",
    openAiUsed: false,
    templateUsed: false,
    creativeCapabilities: [],
  };

  for (const layer of document.semanticLayers ?? []) {
    const src = layer.metadata?.visionPartSource;
    if (!layer.label?.trim()) {
      continue;
    }
    parts.parts.push({
      key: layer.id,
      label: layer.label,
      category: "prop",
      group: layer.type === "background" ? "background" : "character",
      bbox: layer.bounds,
      source: src === "rtdetr" ? "rtdetr" : src === "openai_vision" ? "openai_vision" : "estimated",
      confidence: layer.confidence,
      editable: layer.editable,
    });
  }

  if (document.visionV6Meta) {
    const creative = (document as EditorCanvasDocument & { creativeCapabilities?: IllustrationPartAnalysisResult["creativeCapabilities"] })
      .creativeCapabilities;
    if (creative?.length) {
      parts.creativeCapabilities = creative;
    }
  }

  const sections = splitAnalysisIntoTruthSections(parts);
  return {
    detected: sections.detected.map((p) => p.label),
    estimated: sections.estimated.map((p) => p.label),
    fallback: sections.creative.filter((p) => p.source === "taxonomy_fallback").map((p) => p.label),
    creative: sections.creative.map((p) => p.label),
  };
}

export function collectDetectedPartLabels(document: EditorCanvasDocument): string[] {
  const hierarchy = document.visionHierarchy ?? [];
  const labels: string[] = [];
  const walk = (nodes: typeof hierarchy) => {
    for (const node of nodes) {
      if (node.truthSection === "detected" || node.truthTier === "vision") {
        if (!node.truthSection && node.label) {
          labels.push(node.label);
        }
      }
      if (node.truthSection === "detected") {
        walk(node.children);
      } else if (!node.truthSection && node.truthTier === "vision") {
        labels.push(node.label);
      } else if (!node.truthSection && !node.truthTier && node.children.length === 0) {
        labels.push(node.label);
      } else {
        walk(node.children);
      }
    }
  };
  walk(hierarchy);
  return labels;
}

export function editorProjectIsolationCacheKey(document: EditorCanvasDocument): string {
  const projectId = resolveEditorProjectId(document);
  return `${projectId}::${document.sessionId}::${document.backgroundUrl}`;
}
