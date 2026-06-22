import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  assignAccessoriesTaxonomyToParts,
  coerceIllustrationPartsArray,
  groupPartsByTaxonomyTab,
} from "@/lib/editor-vision-accessories-taxonomy";
import type { IllustrationPartSpec } from "@/types/editor-illustration-parts";

describe("editor regression fixes", () => {
  it("coerceIllustrationPartsArray returns [] for non-array input", () => {
    assert.deepEqual(coerceIllustrationPartsArray(null), []);
    assert.deepEqual(coerceIllustrationPartsArray(undefined), []);
    assert.deepEqual(coerceIllustrationPartsArray({ parts: [] }), []);
  });

  it("assignAccessoriesTaxonomyToParts does not throw on bad parts input", () => {
    const result = assignAccessoriesTaxonomyToParts(null, "human");
    assert.deepEqual(result, []);
  });

  it("groupPartsByTaxonomyTab does not throw on bad parts input", () => {
    const grouped = groupPartsByTaxonomyTab(undefined, "human");
    assert.equal(grouped.get("accessories")?.length, 0);
  });

  it("applyIllustrationPartAnalysisToDocument passes parts array to taxonomy assign", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/editor-vision-v6-part-analysis.ts"),
      "utf8"
    );
    assert.match(source, /parts: assignAccessoriesTaxonomyToParts\(enrichedAnalysis\.parts/);
    assert.doesNotMatch(source, /const mergedAnalysis = assignAccessoriesTaxonomyToParts\(\s*enrichAnalysisWithVisionKeyFeatureAccessories/);
  });

  it("EditorProductPage defers localStorage reads until after mount", () => {
    const productPage = readFileSync(
      join(process.cwd(), "src/components/editor/editor-product-page.tsx"),
      "utf8"
    );
    assert.match(productPage, /storageReady/);
    assert.match(productPage, /queueMicrotask/);
    assert.match(productPage, /resolveEditorDocument\(sessionId, documentOverride, storageReady\)/);
    assert.doesNotMatch(productPage, /useState\(\(\) =>\s*\n?\s*hcProjectId \? loadHomeCheffProject/);
  });

  it("EditorProductPage strips stale hcProject when session fallback exists", () => {
    const productPage = readFileSync(
      join(process.cwd(), "src/components/editor/editor-product-page.tsx"),
      "utf8"
    );
    assert.match(productPage, /stripStaleHcProjectFromDocument/);
    assert.match(productPage, /skipServerWithoutLocal/);
  });

  it("loadHcProjectResolved can skip server fetch without local copy", () => {
    const sync = readFileSync(join(process.cwd(), "src/lib/homecheff-project-sync.ts"), "utf8");
    assert.match(sync, /skipServerWithoutLocal/);
    assert.match(sync, /canRestoreFromServer/);
  });

  it("maps sunglasses under accessories taxonomy tab", () => {
    const parts: IllustrationPartSpec[] = [
      {
        key: "sunglasses",
        label: "Sunglasses",
        category: "eyes",
        group: "character",
        confidence: 0.9,
        editable: true,
        taxonomyTab: "accessories",
      },
    ];
    const grouped = groupPartsByTaxonomyTab(parts, "human");
    assert.equal(grouped.get("accessories")?.length, 1);
  });
});
