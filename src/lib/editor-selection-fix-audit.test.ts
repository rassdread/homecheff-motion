import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GLOBE_MAN_CLICK_TARGETS,
  autoMaskUsesClickPointNotBboxCenter,
  canvasClickUsesUnifiedSelectLayer,
  clickPointPreferredOverBboxCenter,
  computeSelectionFixScore,
  gatedActionsHideReplaceUntilMask,
  handleHierarchicalPickRemoved,
  selectionOutlineShowsApproximate,
} from "@/lib/editor-selection-fix-audit";

describe("Editor Selection Fix Audit", () => {
  it("canvas click routes through unified selectLayer with clickPoint", () => {
    assert.equal(canvasClickUsesUnifiedSelectLayer(), true);
    assert.equal(handleHierarchicalPickRemoved(), true);
  });

  it("auto mask prefers user click coordinates", () => {
    assert.equal(clickPointPreferredOverBboxCenter(), true);
    assert.equal(autoMaskUsesClickPointNotBboxCenter(), true);
  });

  it("approximate selection shows grey outline immediately", () => {
    assert.equal(selectionOutlineShowsApproximate(), true);
  });

  it("replace hidden until mask; refine shown instead", () => {
    assert.equal(gatedActionsHideReplaceUntilMask(), true);
  });

  it("globe man validation covers six click targets", () => {
    assert.equal(GLOBE_MAN_CLICK_TARGETS.length, 6);
  });

  it("selection fix score meets threshold", () => {
    const score = computeSelectionFixScore();
    assert.ok(score.overall >= 7, `overall ${score.overall}`);
    assert.ok(score.selection >= 7);
    assert.ok(score.editing >= 7);
  });
});
