import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildEditorMergedSemanticRecord,
  resolveEditorEntityKind,
  resolveLibraryHref,
} from "@/lib/editor-semantic-record-merge";
import { resolveEditorSaveMode } from "@/lib/editor-library-persist";
import { buildEditorSavePayload } from "@/lib/editor-canvas-export";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { publishOverlayToLockedLayer, publishProjectToLockedLayers } from "@/lib/publish-export";
import { createDefaultPublishOverlay } from "@/lib/publish-overlay-timeline";
import { createPublishProject } from "@/lib/publish-overlay-session";
import {
  PRODUCTION_OUTPUT_PROFILES,
  formatEpsLimitationNote,
  resolveProductionOutputSpec,
} from "@/lib/production-output-profiles";
import { buildMotionRenderNextActions } from "@/lib/suite-flow-handoffs";
import { isHomeCheffProductSuiteNavEnabled } from "@/lib/homecheff-product-suite-flag";

describe("professionalization sprint", () => {
  it("merges editor semantic record with layers and placements", () => {
    const doc = createEditorDocumentFromUpload({ name: "Char", backgroundUrl: "https://example.com/c.png" });
    const payload = buildEditorSavePayload({ ...doc, sourceKind: "character" });
    const record = buildEditorMergedSemanticRecord({
      payload,
      mode: "animation_ready",
      sourceKind: "character",
    });
    assert.ok(record.referencePlacements !== undefined);
    assert.equal(record.animationReadinessScore, 85);
  });

  it("resolves entity kind for product photos as prop", () => {
    assert.equal(resolveEditorEntityKind("product_photo"), "prop");
    assert.equal(resolveEditorEntityKind("character"), "character");
  });

  it("official save mode stays official when source exists", () => {
    const doc = { ...createEditorDocumentFromUpload({ name: "X", backgroundUrl: "https://example.com/x.png" }), sourceAssetId: "a1" };
    assert.equal(resolveEditorSaveMode(doc, "official"), "official_reference");
    assert.equal(resolveEditorSaveMode(doc, "edited_copy"), "edited_copy");
  });

  it("library href resolves character path", () => {
    assert.match(resolveLibraryHref("character", "abc"), /characters\/abc/);
  });

  it("publish export maps overlays to locked layers", () => {
    const project = createPublishProject({ name: "V", videoUrl: "https://example.com/v.mp4" });
    project.overlays = [createDefaultPublishOverlay("title")];
    const layers = publishProjectToLockedLayers(project);
    assert.equal(layers.length, 1);
    assert.equal(publishOverlayToLockedLayer(project.overlays[0], 30).locked, true);
  });

  it("production output profiles include print and packaging", () => {
    assert.ok(PRODUCTION_OUTPUT_PROFILES.includes("print_ready"));
    assert.ok(resolveProductionOutputSpec("print_ready").formats.includes("pdf"));
    assert.match(formatEpsLimitationNote(), /EPS/i);
  });

  it("motion handoff builds publish url", () => {
    const actions = buildMotionRenderNextActions({ projectId: "p1", videoUrl: "https://example.com/f.mp4" });
    assert.ok(actions.find((a) => a.id === "open-publish")?.href.includes("/publish"));
  });

  it("suite nav enabled by default", () => {
    const prev = process.env.NEXT_PUBLIC_HOMECHEFF_PRODUCT_SUITE_NAV;
    delete process.env.NEXT_PUBLIC_HOMECHEFF_PRODUCT_SUITE_NAV;
    try {
      assert.equal(isHomeCheffProductSuiteNavEnabled(), true);
    } finally {
      if (prev === undefined) {
        delete process.env.NEXT_PUBLIC_HOMECHEFF_PRODUCT_SUITE_NAV;
      } else {
        process.env.NEXT_PUBLIC_HOMECHEFF_PRODUCT_SUITE_NAV = prev;
      }
    }
  });
});
