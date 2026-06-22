import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resetEditorAnalysisCacheForTests } from "@/lib/editor-analysis-cache";
import { resetStickyVisionHierarchyForTests } from "@/lib/editor-vision-v6-stability";
import { mergeIllustrationPartsWithVisionTaxonomy } from "@/lib/editor-vision-taxonomy";
import {
  buildEditorAnalysisIsolationScope,
  createFreshEditorProjectDocument,
  editorIsolationScopeMatches,
  editorProjectIsolationCacheKey,
  EDITOR_PROJECT_ISOLATION_AUDIT,
  reanalyzeEditorProjectFromCurrentImage,
  resetStaleAnalysisRejectCountForTests,
  sanitizeDocumentForAssetIsolation,
  stampEditorAnalysisIsolationScope,
} from "@/lib/editor-project-isolation";
import { splitAnalysisIntoTruthSections as splitTruth } from "@/lib/editor-vision-truth-mode";
import { mergePreservingVisionAnalysis } from "@/lib/editor-vision-v6-stability";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

function portraitDoc(): EditorCanvasDocument {
  const base = createEditorDocumentFromUpload({
    name: "portrait.jpg",
    backgroundUrl: "https://example.com/portrait.jpg",
  });
  return stampEditorAnalysisIsolationScope({
    ...base,
    analyzedBackgroundUrl: base.backgroundUrl,
    visionAnalysis: {
      objectType: "human",
      objectTypeLabel: "Portrait",
      visualStyle: "Photo",
      keyFeatures: ["face", "hair"],
      colors: [],
      shapeLanguage: [],
      brandIdentity: "",
      materialHints: "",
      environmentHints: "",
      suggestedPreserve: [],
      suggestedChange: [],
      suggestedForbidden: [],
      confidence: 0.9,
      safetyNotes: [],
      assetFamily: "",
      characterLineage: "",
      brandRecognitionConfidence: 0.5,
      identityFingerprint: {
        fingerprintHash: "p",
        identityShapeMarkers: [],
        accessoryPattern: "",
        silhouette: "",
      },
    },
    visionHierarchy: [
      {
        id: "truth_section_detected",
        label: "Detected",
        category: "objects",
        editable: false,
        truthSection: "detected",
        children: [
          {
            id: "human_arms",
            label: "Arms",
            category: "objects",
            editable: true,
            truthTier: "vision",
            children: [],
          },
          {
            id: "human_shirt",
            label: "Shirt",
            category: "objects",
            editable: true,
            truthTier: "vision",
            children: [],
          },
        ],
      },
    ],
    visionV6Meta: {
      illustrationAnalysis: true,
      rtdetrCount: 2,
      visionPartCount: 4,
      mergedLayerCount: 6,
      openAiPartsUsed: true,
      layerSources: [],
      taxonomyType: "human",
    },
  });
}

describe("editor project isolation", () => {
  it("audit table covers high-risk state sources", () => {
    assert.ok(EDITOR_PROJECT_ISOLATION_AUDIT.length >= 8);
    const high = EDITOR_PROJECT_ISOLATION_AUDIT.filter((r) => r.leakRisk === "high");
    assert.ok(high.some((r) => r.stateSource.includes("bootstrapResultCache")));
    assert.ok(high.some((r) => r.stateSource.includes("mergePreservingVisionAnalysis")));
  });

  it("cache key includes projectId, sessionId, and backgroundUrl", () => {
    const doc = createEditorDocumentFromUpload({
      name: "a.jpg",
      backgroundUrl: "https://example.com/a.jpg",
    });
    const key = editorProjectIsolationCacheKey(doc);
    assert.ok(key.includes(doc.sessionId));
    assert.ok(key.includes(doc.backgroundUrl));
  });

  it("Test 1 — new project after portrait: dog upload has no human garment parts in detected", () => {
    resetStaleAnalysisRejectCountForTests();
    const portrait = portraitDoc();
    const fresh = createFreshEditorProjectDocument({
      name: "dog-head.jpg",
      backgroundUrl: "https://example.com/dog-head.jpg",
    });
    assert.notEqual(fresh.sessionId, portrait.sessionId);
    assert.equal(fresh.visionHierarchy, undefined);

    const dogVision: AssetVisionAnalysis = {
      objectType: "animal",
      objectTypeLabel: "Dog",
      visualStyle: "Photo",
      keyFeatures: ["dog", "fur", "ears"],
      colors: [],
      shapeLanguage: [],
      brandIdentity: "",
      materialHints: "",
      environmentHints: "",
      suggestedPreserve: [],
      suggestedChange: [],
      suggestedForbidden: [],
      confidence: 0.85,
      safetyNotes: [],
      assetFamily: "",
      characterLineage: "",
      brandRecognitionConfidence: 0.5,
      identityFingerprint: {
        fingerprintHash: "d",
        identityShapeMarkers: [],
        accessoryPattern: "",
        silhouette: "",
      },
    };

    const { analysis } = mergeIllustrationPartsWithVisionTaxonomy(
      {
        parts: [
          {
            key: "eyes",
            label: "Eyes",
            category: "eyes",
            group: "character",
            bbox: { x: 0.2, y: 0.2, width: 0.1, height: 0.1 },
            source: "rtdetr",
            confidence: 0.9,
            editable: true,
          },
        ],
        characterLabel: "Dog",
        openAiUsed: false,
        templateUsed: false,
      },
      { vision: dogVision, documentName: "dog-head.jpg" }
    );

    const sections = splitTruth(analysis);
    const detected = sections.detected.map((p) => p.label.toLowerCase());
    for (const forbidden of ["arms", "hands", "shirt", "pants", "tie", "shoes", "jacket"]) {
      assert.equal(
        detected.some((l) => l.includes(forbidden)),
        false,
        `dog detected must not include ${forbidden}`
      );
    }
  });

  it("Test 2 — mascot after dog: no animal body parts leak via stale scope", () => {
    const dog = stampEditorAnalysisIsolationScope(
      createEditorDocumentFromUpload({
        name: "dog.jpg",
        backgroundUrl: "https://example.com/dog.jpg",
      })
    );
    const mascot = createEditorDocumentFromUpload({
      name: "mascot.png",
      backgroundUrl: "https://example.com/mascot.png",
    });

    const contaminated = {
      ...mascot,
      visionHierarchy: dog.visionHierarchy,
      isolationScope: dog.isolationScope,
      visionV6Meta: {
        illustrationAnalysis: true,
        rtdetrCount: 1,
        visionPartCount: 3,
        mergedLayerCount: 5,
        openAiPartsUsed: false,
        layerSources: [],
        taxonomyType: "animal" as const,
        isolationScope: dog.isolationScope,
      },
      analyzedBackgroundUrl: mascot.backgroundUrl,
    };

    const sanitized = sanitizeDocumentForAssetIsolation(contaminated);
    assert.equal(sanitized.visionHierarchy, undefined);
    assert.equal(sanitized.isolationScope, undefined);
  });

  it("Test 3 — reanalyze from current image clears analysis but keeps image", () => {
    resetEditorAnalysisCacheForTests();
    resetStickyVisionHierarchyForTests();
    const doc = portraitDoc();
    const priorAnalysisId = doc.isolationScope?.analysisId;
    const reanalyzed = reanalyzeEditorProjectFromCurrentImage(doc);
    assert.equal(reanalyzed.backgroundUrl, doc.backgroundUrl);
    assert.equal(reanalyzed.visionHierarchy, undefined);
    assert.equal(reanalyzed.visionAnalysis, undefined);
    assert.notEqual(reanalyzed.isolationScope?.analysisId, priorAnalysisId);
    assert.equal(reanalyzed.workflowStep, "object_detection");
  });

  it("Test 4 — mergePreservingVisionAnalysis strips vision when backgrounds differ", () => {
    const human = portraitDoc();
    const other = {
      ...createEditorDocumentFromUpload({
        name: "other.jpg",
        backgroundUrl: "https://example.com/other.jpg",
      }),
      updatedAt: new Date(Date.now() + 60_000).toISOString(),
    };
    const merged = mergePreservingVisionAnalysis(human, other);
    assert.equal(merged.backgroundUrl, other.backgroundUrl);
    assert.equal(merged.visionHierarchy, undefined);
    assert.equal(merged.visionAnalysis, undefined);
    assert.equal(merged.isolationScope, undefined);
  });

  it("rejects stale analysis when assetId mismatches", () => {
    resetStaleAnalysisRejectCountForTests();
    let doc = portraitDoc();
    doc = {
      ...doc,
      sourceAssetId: "asset-B",
      isolationScope: buildEditorAnalysisIsolationScope({
        ...doc,
        sourceAssetId: "asset-A",
      }),
    };
    const sanitized = sanitizeDocumentForAssetIsolation(doc);
    assert.equal(sanitized.visionHierarchy, undefined);
  });

  it("isolation scope matches current document identity", () => {
    const doc = stampEditorAnalysisIsolationScope(
      createEditorDocumentFromUpload({ name: "x.jpg", backgroundUrl: "https://example.com/x.jpg" })
    );
    assert.equal(editorIsolationScopeMatches(doc.isolationScope, doc), true);
    assert.equal(
      editorIsolationScopeMatches(doc.isolationScope, {
        ...doc,
        backgroundUrl: "https://example.com/y.jpg",
      }),
      false
    );
  });
});
