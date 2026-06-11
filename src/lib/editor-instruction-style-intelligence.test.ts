import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GLOBE_MAN_CANONICAL_PARTS } from "@/lib/editor-character-expansion";
import {
  appendChangePlanItem,
  appendStyleChangePlanItem,
  buildStyleChangePlanItem,
  listChangePlan,
  listChangePlanEntries,
  listStyleChangePlan,
} from "@/lib/editor-instruction-change-plan";
import { buildInstructionObjectsFromDocument } from "@/lib/editor-instruction-object-feed";
import { listInstructionObjectsV2 } from "@/lib/editor-instruction-object-v2";
import {
  buildEditorInstructionChangePlanPrompt,
  buildEditorInstructionPromptV3,
} from "@/lib/editor-instruction-prompt-builder";
import {
  parseEditorInstructionRequest,
  parsedRequestToChangePlanEntries,
} from "@/lib/editor-instruction-request-parser";
import { buildStyleAttributeRecords, syncDocumentStyleAttributes } from "@/lib/editor-style-attribute-feed";
import { EDITOR_STYLE_ACTIONS } from "@/lib/editor-style-actions";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { EDITOR_STYLE_ATTRIBUTES } from "@/types/editor-instruction-studio";

function globeManDoc() {
  return createEditorDocumentFromUpload({
    name: "Globe Man.png",
    backgroundUrl: "https://example.com/globe-man.png",
  });
}

describe("editor instruction style intelligence", () => {
  it("keeps style attributes out of object dropdown feed", () => {
    const doc = globeManDoc();
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
        label: "Color palette",
        type: "style",
        category: "character",
        bounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
        confidence: 0.7,
        visible: true,
        locked: false,
        editable: true,
        source: "vision",
        children: [],
      },
    ];
    const feed = buildInstructionObjectsFromDocument(doc);
    const labels = feed.editableObjects.map((o) => o.label.toLowerCase());
    for (const attr of EDITOR_STYLE_ATTRIBUTES) {
      assert.ok(!labels.includes(attr.replace(/_/g, " ")));
    }
    assert.ok(!labels.some((l) => /color palette|body shape|outline style/i.test(l)));
  });

  it("expands Globe Man into canonical character parts", () => {
    const objects = listInstructionObjectsV2(globeManDoc());
    const labels = objects.map((o) => o.label);
    for (const part of GLOBE_MAN_CANONICAL_PARTS) {
      assert.ok(labels.includes(part.label), `missing ${part.label}`);
    }
    assert.ok(!labels.includes("Suit / Clothing"));
    assert.ok(!labels.includes("Character / Globe Man"));
  });

  it("stores style attributes on document.styleAttributes", () => {
    const synced = syncDocumentStyleAttributes(globeManDoc());
    assert.ok(synced.styleAttributes);
    assert.equal(synced.styleAttributes!.length, EDITOR_STYLE_ATTRIBUTES.length);
    const records = buildStyleAttributeRecords(synced);
    assert.ok(records.every((r) => r.attribute && r.label));
  });

  it("supports unified change plan with object and style entries", () => {
    let doc = globeManDoc();
    doc = appendChangePlanItem(
      doc,
      {
        entryType: "object",
        id: "obj1",
        objectId: "obj_jacket",
        objectLabel: "Jacket",
        objectCategory: "clothing",
        action: "add_logo",
        instruction: "Add logo to Jacket",
        strength: 55,
        preserveStyle: 80,
        preserveBrand: 85,
        order: 0,
        status: "pending",
      }
    );
    const styleAction = EDITOR_STYLE_ACTIONS.color_palette[0]!;
    doc = appendStyleChangePlanItem(
      doc,
      buildStyleChangePlanItem({
        styleAttribute: "color_palette",
        action: styleAction,
        order: 1,
      })
    );
    assert.equal(listChangePlanEntries(doc).length, 2);
    assert.equal(listChangePlan(doc).length, 1);
    assert.equal(listStyleChangePlan(doc).length, 1);
  });

  it("parses director request into object and style plan entries", () => {
    const prompt =
      "Add the HomeCheff logo to the jacket, make the tie dark blue, replace the globe with a cooking pan, make the colors more premium, and make the mascot proportions slightly more realistic.";
    const parsed = parseEditorInstructionRequest(prompt);
    assert.ok(parsed.objects.length >= 2);
    assert.ok(parsed.styleChanges.length >= 2);
    const entries = parsedRequestToChangePlanEntries(parsed, (label) => `obj_${label}`);
    const objects = entries.filter((e) => e.entryType !== "style");
    const styles = entries.filter((e) => e.entryType === "style");
    assert.ok(objects.some((o) => o.entryType !== "style" && /jacket|tie|globe/i.test(o.objectLabel)));
    assert.ok(styles.some((s) => s.entryType === "style" && s.styleAttribute === "color_palette"));
    assert.ok(styles.some((s) => s.entryType === "style" && s.styleAttribute === "body_proportions"));
  });

  it("buildEditorInstructionPromptV3 separates object and style sections", () => {
    const prompt = buildEditorInstructionPromptV3({
      entries: [
        {
          entryType: "object",
          id: "1",
          objectId: "j",
          objectLabel: "Jacket",
          objectCategory: "clothing",
          action: "add_logo",
          instruction: "Add the supplied HomeCheff logo to the jacket",
          strength: 55,
          preserveStyle: 80,
          preserveBrand: 85,
          order: 0,
          status: "pending",
        },
        {
          entryType: "object",
          id: "2",
          objectId: "t",
          objectLabel: "Tie",
          objectCategory: "clothing",
          action: "change_color",
          instruction: "Change the tie to dark blue",
          color: "dark blue",
          strength: 55,
          preserveStyle: 80,
          preserveBrand: 85,
          order: 1,
          status: "pending",
        },
        {
          entryType: "style",
          id: "3",
          styleAttribute: "color_palette",
          action: "more_premium",
          instruction: "Make the overall color palette more premium",
          strength: 55,
          preserveStyle: true,
          preserveBrand: true,
          order: 2,
          status: "pending",
        },
        {
          entryType: "style",
          id: "4",
          styleAttribute: "body_proportions",
          action: "more_realistic",
          instruction: "Make body proportions slightly more realistic",
          strength: 55,
          preserveStyle: true,
          preserveBrand: true,
          order: 3,
          status: "pending",
        },
      ],
    });
    assert.match(prompt, /REFERENCE IMAGE/);
    assert.match(prompt, /OBJECT CHANGES/);
    assert.match(prompt, /STYLE CHANGES/);
    assert.match(prompt, /PRESERVE/);
    assert.match(prompt, /Add the supplied HomeCheff logo to the jacket/);
    assert.match(prompt, /Change the tie to dark blue/);
    assert.match(prompt, /Make the overall color palette more premium/);
    assert.match(prompt, /Make body proportions slightly more realistic/);
  });

  it("buildEditorInstructionChangePlanPrompt delegates to V3 format", () => {
    const prompt = buildEditorInstructionChangePlanPrompt({
      items: [
        {
          id: "1",
          entryType: "object",
          objectId: "g",
          objectLabel: "Globe",
          objectCategory: "tool",
          action: "replace",
          instruction: "Replace Globe with cooking pan",
          replacement: "cooking pan",
          strength: 55,
          preserveStyle: 80,
          preserveBrand: 85,
          order: 0,
          status: "pending",
        },
      ],
    });
    assert.match(prompt, /OBJECT CHANGES/);
    assert.match(prompt, /Replace Globe with cooking pan/);
    assert.match(prompt, /mascot identity/);
  });
});
