import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { buildLocalProvisionalPartAnalysis } from "@/lib/editor-vision-v6-part-analysis";
import { resetStickyVisionHierarchyForTests, resolveDisplayVisionHierarchy } from "@/lib/editor-vision-v6-stability";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";

describe("editor vision analysis performance audit", () => {
  it("bootstrap runs RT-DETR first and Style DNA in parallel without blocking provisional", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/editor-detection-bootstrap.ts"),
      "utf8"
    );
    assert.match(source, /const styleDnaPromise = startStyleDnaAnalyze/);
    assert.match(source, /RTDETR_PROVISIONAL_EMITTED/);
    assert.doesNotMatch(source, /PROMISE_ALL_START/);
  });

  it("emits provisional progress before Vision Parts API", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/editor-detection-bootstrap.ts"),
      "utf8"
    );
    assert.match(source, /applyLocalProvisionalParts/);
    assert.match(source, /onProgress/);
    assert.match(source, /fetchIllustrationPartsApiWithTimeout/);
  });

  it("hook forwards onProgress for progressive UI", () => {
    const hook = readFileSync(
      join(process.cwd(), "src/hooks/use-editor-vision-analysis-run.ts"),
      "utf8"
    );
    assert.match(hook, /onProgress:/);
    assert.match(hook, /setPendingDisplayDocument/);
  });

  it("parts panel shows hierarchy during partial analysis", () => {
    const panel = readFileSync(
      join(process.cwd(), "src/components/editor/editor-vision-parts-panel.tsx"),
      "utf8"
    );
    assert.match(panel, /hierarchy\.length === 0/);
    assert.match(panel, /partialLabel/);
    assert.match(panel, /lastAnalyzedLabel/);
    assert.match(panel, /premiumAnalyze/);
    assert.match(panel, /basicCompleteTitle/);
    assert.match(panel, /editor-vision-analysis-progress-bar/);
  });

  it("finalizing keeps hierarchy visible (no flicker)", () => {
    resetStickyVisionHierarchyForTests();
    const doc = {
      sessionId: "s1",
      backgroundUrl: "https://example.com/p.jpg",
      visionHierarchy: [
        {
          id: "truth_detected",
          label: "Detected",
          category: "objects" as const,
          editable: false,
          truthSection: "detected" as const,
          children: [
            {
              id: "part_head",
              label: "Head",
              category: "objects" as const,
              editable: true,
              children: [],
            },
          ],
        },
      ],
    } as import("@/types/homecheff-visual-editor").EditorCanvasDocument;
    const meta = {
      runId: "r1",
      analysisId: "a1",
      assetId: "asset",
      projectId: "p1",
      backgroundUrl: doc.backgroundUrl,
      sessionId: doc.sessionId,
      status: "finalizing" as const,
      startedAt: new Date().toISOString(),
      pipelineCalls: 3,
      duplicateRunCount: 0,
      sourceOrder: ["rtdetr", "style_dna", "provisional", "vision_parts_api"] as const,
      isPartial: true,
    };
    assert.ok(resolveDisplayVisionHierarchy(doc, meta).length > 0);
  });

  it("local provisional analysis includes keyFeatures accessories without API", () => {
    const vision: AssetVisionAnalysis = {
      objectType: "human",
      objectTypeLabel: "Portrait",
      visualStyle: "photo",
      colors: [],
      shapeLanguage: [],
      keyFeatures: ["Sunglasses", "face"],
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
        fingerprintHash: "perf-test",
        identityShapeMarkers: [],
        accessoryPattern: "",
        silhouette: "",
      },
    };
    const analysis = buildLocalProvisionalPartAnalysis(vision, []);
    const labels = analysis.parts.map((p) => p.label.toLowerCase());
    assert.ok(labels.some((l) => l.includes("sunglass") || l.includes("zonnebril") || l.includes("glass")));
  });
});
