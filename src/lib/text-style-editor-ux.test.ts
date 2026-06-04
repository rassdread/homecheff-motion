import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { patchOverlayLayerStyles } from "@/lib/story-overlay-layer-styles";
import {
  TEXT_STYLE_EDITOR_DEFAULT_EXPANDED,
  buildAutomaticStyleSummaryLines,
  layerTextStyleBadge,
  sceneTextStyleStatus,
  summaryFieldLabelKey,
} from "@/lib/text-style-editor-ux";

describe("text style editor UX", () => {
  it("editor is collapsed by default", () => {
    assert.equal(TEXT_STYLE_EDITOR_DEFAULT_EXPANDED, false);
  });

  it("collapsed summary reflects AI default value keys", () => {
    const lines = buildAutomaticStyleSummaryLines();
    assert.equal(lines.length, 4);
    assert.equal(lines[0]!.field, "fontSize");
    assert.equal(lines[0]!.valueKey, "instant.textStyle.fontSize.normal");
    assert.equal(lines[1]!.valueKey, "instant.textStyle.auto");
    assert.equal(lines[2]!.valueKey, "instant.textStyle.backdrop.auto");
    assert.equal(lines[3]!.valueKey, "instant.textStyle.position.auto");
    assert.equal(summaryFieldLabelKey("fontSize"), "instant.textStyle.summary.label.fontSize");
  });

  it("scene status is automatic until any layer override exists", () => {
    assert.equal(sceneTextStyleStatus({}), "automatic");
    assert.equal(sceneTextStyleStatus(undefined), "automatic");
    assert.equal(
      sceneTextStyleStatus({ title: { fontSize: "larger" } }),
      "custom"
    );
  });

  it("layer badge distinguishes automatic vs custom", () => {
    assert.equal(layerTextStyleBadge(undefined), "automatic");
    assert.equal(layerTextStyleBadge({ position: "auto" }), "automatic");
    assert.equal(layerTextStyleBadge({ fontSize: "larger" }), "custom");
  });

  it("reset layer styling clears only that layer and preserves others", () => {
    const styles = {
      title: { fontSize: "larger" as const },
      hero: { textColor: "#ffffff" },
    };
    const afterTitleReset = patchOverlayLayerStyles(styles, "title", null);
    assert.equal(afterTitleReset.title, undefined);
    assert.deepEqual(afterTitleReset.hero, { textColor: "#ffffff" });
    assert.equal(sceneTextStyleStatus(afterTitleReset), "custom");

    const cleared = patchOverlayLayerStyles(afterTitleReset, "hero", null);
    assert.equal(sceneTextStyleStatus(cleared), "automatic");
  });

  it("patch layer persists overrides for rerender payloads", () => {
    const next = patchOverlayLayerStyles({}, "subtitle", {
      fontSize: "smaller",
      shadow: "medium",
    });
    assert.equal(layerTextStyleBadge(next.subtitle), "custom");
    const merged = patchOverlayLayerStyles(next, "subtitle", { outline: "light" });
    assert.equal(merged.subtitle?.fontSize, "smaller");
    assert.equal(merged.subtitle?.outline, "light");
  });
});
