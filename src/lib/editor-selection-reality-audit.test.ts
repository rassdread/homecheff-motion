import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AUTO_MASK_REALITY,
  EDIT_CHAIN_AUDIT,
  GLOBE_MAN_DETECTION,
  ROOT_CAUSE,
  SELECTION_CHAIN_TRACE,
  SELECTION_FIX_ROADMAP,
  SELECTION_MODE_FREQUENCY,
  UX_FAILURE_ANALYSIS,
  approximateOutlineHidden,
  autoMaskOnlyInSelectLayer,
  canvasClickBypassesAutoMask,
  computeSelectionRealityScore,
  freshMascotBlockedFromPixelEdit,
  freshMascotClickUsesPolygonRectangleHit,
  sam2RealityStatus,
} from "@/lib/editor-selection-reality-audit";

describe("Editor Selection Reality Audit", () => {
  it("documents eight-step selection chain", () => {
    assert.equal(SELECTION_CHAIN_TRACE.length, 8);
    const layerSelect = SELECTION_CHAIN_TRACE.find((s) => s.step.includes("Layer selection"));
    const autoMask = SELECTION_CHAIN_TRACE.find((s) => s.step.includes("Auto mask"));
    assert.ok(layerSelect?.actual.includes("handleHierarchicalPick"));
    assert.ok(autoMask?.actual.includes("selectLayer"));
  });

  it("selection mode frequencies sum to 100", () => {
    const total = SELECTION_MODE_FREQUENCY.reduce((sum, row) => sum + row.percent, 0);
    assert.equal(total, 100);
    assert.ok(SELECTION_MODE_FREQUENCY[0]!.percent >= 50);
  });

  it("canvas click bypasses auto-mask acquisition", () => {
    assert.equal(canvasClickBypassesAutoMask(), true);
    assert.equal(autoMaskOnlyInSelectLayer(), true);
    assert.equal(AUTO_MASK_REALITY.triggersOnCanvasClick, false);
  });

  it("fresh mascot click hits polygon-rectangle on approximate layer", () => {
    assert.equal(freshMascotClickUsesPolygonRectangleHit(), true);
    assert.equal(freshMascotBlockedFromPixelEdit(), true);
  });

  it("approximate selection hides SVG contour", () => {
    assert.equal(approximateOutlineHidden(), true);
  });

  it("globe man detection matrix covers eight parts", () => {
    assert.equal(GLOBE_MAN_DETECTION.length, 8);
    const face = GLOBE_MAN_DETECTION.find((r) => r.part === "Face");
    assert.equal(face?.selectable, "no");
    const bg = GLOBE_MAN_DETECTION.find((r) => r.part === "Background");
    assert.equal(bg?.detected, "yes");
  });

  it("edit chain shows globe/logo replace blocked without mask", () => {
    const globe = EDIT_CHAIN_AUDIT.find((r) => r.target.startsWith("Globe"));
    assert.equal(globe?.openAiExecutes, "no");
    const logo = EDIT_CHAIN_AUDIT.find((r) => r.target.startsWith("Logo"));
    assert.equal(logo?.visibleChange, "no");
  });

  it("primary root cause is canvas click bypassing auto-mask", () => {
    assert.ok(ROOT_CAUSE.primary.includes("handleHierarchicalPick"));
    assert.ok(UX_FAILURE_ANALYSIS[0]?.reason.includes("auto-mask"));
    assert.equal(UX_FAILURE_ANALYSIS[0]?.impact, "critical");
  });

  it("fix roadmap prioritizes wiring auto-mask to canvas click", () => {
    assert.ok(SELECTION_FIX_ROADMAP[0]?.fix.includes("handleHierarchicalPick"));
    assert.equal(SELECTION_FIX_ROADMAP[0]?.impact, "critical");
  });

  it("reality score reflects low user trust without env and bypass bug", () => {
    const score = computeSelectionRealityScore();
    assert.ok(score.overall <= 4, `overall ${score.overall}`);
    assert.ok(score.userTrust <= 3);
    assert.ok(score.maskGeneration <= 3);
  });

  it("SAM2 status is not_used or partially_working in typical dev", () => {
    const status = sam2RealityStatus();
    assert.ok(status === "not_used" || status === "partially_working");
  });
});
