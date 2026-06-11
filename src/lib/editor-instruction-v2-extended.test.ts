import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendChangePlanItem,
  buildChangePlanItemFromSelection,
  clearChangePlan,
  listChangePlan,
  removeChangePlanItem,
} from "@/lib/editor-instruction-change-plan";
import { resolveInstructionObjectBounds } from "@/lib/editor-instruction-object-bounds";
import {
  buildInstructionObjectsFromDocument,
  isStyleTrait,
} from "@/lib/editor-instruction-object-feed";
import { listInstructionObjectsV2 } from "@/lib/editor-instruction-object-v2";
import {
  buildEditorInstructionChangePlanPrompt,
  buildEditorInstructionPromptV2,
} from "@/lib/editor-instruction-prompt-builder";
import { createPrintExportRecord, evaluatePrintQuality } from "@/lib/editor-instruction-print-export";
import { parseEditorInstructionRequest } from "@/lib/editor-instruction-request-parser";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { originalImageUrlUnchanged } from "@/lib/editor-instruction-version";
import { DEFAULT_EDITOR_INSTRUCTION_SLIDERS } from "@/types/editor-instruction-studio";

describe("editor instruction v2 extended", () => {
  it("dropdown excludes style traits from editable feed", () => {
    const doc = createEditorDocumentFromUpload({
      name: "Globe Man.png",
      backgroundUrl: "https://example.com/globe-man.png",
    });
    doc.semanticLayers = [
      {
        id: "t1",
        label: "Rounded body shape",
        type: "body",
        category: "character",
        bounds: { x: 0.2, y: 0.2, width: 0.5, height: 0.6 },
        confidence: 0.6,
        visible: true,
        locked: false,
        editable: true,
        source: "vision",
        children: [],
      },
      {
        id: "t2",
        label: "body proportions",
        type: "body",
        category: "character",
        bounds: { x: 0.25, y: 0.25, width: 0.4, height: 0.5 },
        confidence: 0.58,
        visible: true,
        locked: false,
        editable: true,
        source: "vision",
        children: [],
      },
    ];
    const feed = buildInstructionObjectsFromDocument(doc);
    assert.ok(isStyleTrait("body proportions"));
    assert.ok(!feed.editableObjects.some((o) => /body shape|proportions/i.test(o.label)));
  });

  it("Globe highlight returns heuristic bounds", () => {
    const doc = createEditorDocumentFromUpload({
      name: "Globe Man.png",
      backgroundUrl: "https://example.com/globe-man.png",
    });
    const globe = listInstructionObjectsV2(doc).find((o) => o.label === "Globe");
    assert.ok(globe);
    const bounds = resolveInstructionObjectBounds(globe!, doc);
    assert.equal(bounds.exact, false);
    assert.ok(bounds.width > 0.1);
  });

  it("Tie highlight returns chest bounds", () => {
    const doc = createEditorDocumentFromUpload({
      name: "Globe Man.png",
      backgroundUrl: "https://example.com/globe-man.png",
    });
    const tie = listInstructionObjectsV2(doc).find((o) => o.label === "Tie");
    assert.ok(tie);
    const bounds = resolveInstructionObjectBounds(tie!, doc);
    assert.equal(bounds.exact, false);
    assert.ok(bounds.y > 0.3 && bounds.y < 0.5);
  });

  it("Background highlight covers canvas", () => {
    const doc = createEditorDocumentFromUpload({
      name: "Globe Man.png",
      backgroundUrl: "https://example.com/globe-man.png",
    });
    const bg = listInstructionObjectsV2(doc).find((o) => o.category === "background");
    assert.ok(bg);
    const bounds = resolveInstructionObjectBounds(bg!, doc);
    assert.equal(bounds.width, 1);
    assert.equal(bounds.height, 1);
  });

  it("prompt builder unaffected by highlight bounds", () => {
    const prompt = buildEditorInstructionPromptV2({
      objectKey: "obj_globe",
      objectLabel: "Globe",
      category: "tool",
      action: "replace",
      replacement: "cooking pan",
      sliders: { ...DEFAULT_EDITOR_INSTRUCTION_SLIDERS },
    });
    assert.match(prompt, /Globe/i);
    assert.match(prompt, /cooking pan/i);
  });

  it("adds one change to plan", () => {
    const doc = createEditorDocumentFromUpload({
      name: "chef.png",
      backgroundUrl: "https://example.com/chef.png",
    });
    const item = buildChangePlanItemFromSelection(
      {
        objectKey: "obj_apron",
        objectLabel: "Apron",
        category: "clothing",
        action: "change_color",
        color: "green",
        sliders: { ...DEFAULT_EDITOR_INSTRUCTION_SLIDERS },
      },
      0
    );
    const next = appendChangePlanItem(doc, item);
    assert.equal(listChangePlan(next).length, 1);
  });

  it("combines multiple changes in prompt", () => {
    const prompt = buildEditorInstructionChangePlanPrompt({
      items: [
        {
          id: "1",
          objectId: "a",
          objectLabel: "Apron",
          objectCategory: "clothing",
          action: "change_color",
          instruction: "Change color of Apron to green",
          color: "green",
          strength: 55,
          preserveStyle: 80,
          preserveBrand: 85,
          order: 0,
          status: "pending",
        },
        {
          id: "2",
          objectId: "g",
          objectLabel: "Globe",
          objectCategory: "tool",
          action: "replace",
          instruction: "Replace Globe with cooking pan",
          replacement: "cooking pan",
          strength: 55,
          preserveStyle: 80,
          preserveBrand: 85,
          order: 1,
          status: "pending",
        },
      ],
    });
    assert.match(prompt, /Apron/i);
    assert.match(prompt, /Globe/i);
    assert.match(prompt, /Preserve all areas not listed/i);
  });

  it("removes plan items", () => {
    let doc = createEditorDocumentFromUpload({
      name: "test.png",
      backgroundUrl: "https://example.com/a.png",
    });
    const a = buildChangePlanItemFromSelection(
      {
        objectKey: "a",
        objectLabel: "A",
        category: "clothing",
        action: "remove",
        sliders: { ...DEFAULT_EDITOR_INSTRUCTION_SLIDERS },
      },
      0
    );
    doc = appendChangePlanItem(doc, a);
    doc = removeChangePlanItem(doc, a.id);
    doc = clearChangePlan(doc);
    assert.equal(listChangePlan(doc).length, 0);
  });

  it("parses multi-object director request", () => {
    const parsed = parseEditorInstructionRequest(
      "Make the apron green and add the HomeCheff logo, replace the globe with a cooking pan"
    );
    assert.ok(parsed.objects.length >= 2);
  });

  it("detects print and motion output targets", () => {
    assert.equal(parseEditorInstructionRequest("prepare flyer for print").outputTarget, "print");
    assert.equal(parseEditorInstructionRequest("make a motion commercial").outputTarget, "motion");
  });

  it("A4 print quality evaluation at 300 DPI", () => {
    const report = evaluatePrintQuality({
      preset: "a4",
      sourceWidthPx: 500,
      sourceHeightPx: 500,
    });
    assert.equal(report.dpi, 300);
    assert.ok(report.widthPx > 2000);
    assert.ok(report.needsUpscale);
  });

  it("print export does not mutate original document url", () => {
    const doc = createEditorDocumentFromUpload({
      name: "test.png",
      backgroundUrl: "https://example.com/original.png",
    });
    const record = createPrintExportRecord({
      variantId: "v1",
      preset: "a4",
      sourceWidthPx: 1200,
      sourceHeightPx: 900,
    });
    assert.ok(record.qualityScore >= 0);
    assert.equal(originalImageUrlUnchanged(doc, doc), true);
  });
});
