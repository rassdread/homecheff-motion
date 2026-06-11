import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  duplicateChangePlanEntry,
  listChangePlanEntries,
} from "@/lib/editor-instruction-change-plan";
import {
  actionOptionKey,
  resolveDynamicActionsForObject,
} from "@/lib/editor-instruction-dynamic-actions";
import { listInstructionObjectsV2 } from "@/lib/editor-instruction-object-v2";
import {
  parseEditorInstructionRequest,
  parsedRequestToChangePlanEntries,
} from "@/lib/editor-instruction-request-parser";
import { resolveInstructionObjectBounds } from "@/lib/editor-instruction-object-bounds";
import { buildStyleAttributeRecords } from "@/lib/editor-style-attribute-feed";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import type { EditorInstructionObjectV2 } from "@/types/editor-instruction-studio";

function globeManDoc() {
  return createEditorDocumentFromUpload({
    name: "Globe Man.png",
    backgroundUrl: "https://example.com/globe-man.png",
  });
}

function mockObject(
  partial: Partial<EditorInstructionObjectV2> & Pick<EditorInstructionObjectV2, "label" | "category">
): EditorInstructionObjectV2 {
  return {
    id: partial.id ?? "obj_test",
    label: partial.label,
    category: partial.category,
    confidence: partial.confidence ?? 0.8,
    description: partial.description ?? "test",
    suggestedActions: partial.suggestedActions ?? ["replace"],
    source: partial.source ?? "heuristic",
  };
}

describe("editor instruction dynamic workspace", () => {
  it("renders category-specific dynamic actions for clothing and face", () => {
    const jacketActions = resolveDynamicActionsForObject(
      mockObject({ label: "Jacket", category: "clothing" })
    );
    assert.ok(jacketActions.some((a) => a.action === "add_logo"));
    assert.ok(jacketActions.some((a) => a.action === "change_color"));

    const faceActions = resolveDynamicActionsForObject(
      mockObject({ label: "Face", category: "character" })
    );
    assert.ok(faceActions.some((a) => a.labelKey.includes("changeExpression")));
    assert.ok(faceActions.some((a) => a.promptHint === "eyes"));

    const backgroundActions = resolveDynamicActionsForObject(
      mockObject({ label: "Background", category: "background" })
    );
    assert.ok(backgroundActions.some((a) => a.action === "blur"));
    assert.ok(backgroundActions.some((a) => a.action === "replace"));
  });

  it("keeps action option keys stable for expandable editors", () => {
    const actions = resolveDynamicActionsForObject(
      mockObject({ label: "Tie", category: "clothing" })
    );
    const keys = actions.map((action, index) => actionOptionKey(action, index));
    assert.equal(new Set(keys).size, keys.length);
  });

  it("builds style attribute records for editable trait list", () => {
    const doc = globeManDoc();
    doc.semanticLayers = [
      {
        id: "trait_palette",
        label: "Color palette",
        type: "style",
        category: "character",
        bounds: { x: 0, y: 0, width: 1, height: 1 },
        confidence: 0.7,
        visible: true,
        locked: false,
        editable: true,
        source: "vision",
        children: [],
      },
    ];
    const records = buildStyleAttributeRecords(doc);
    assert.ok(records.some((r) => r.attribute === "color_palette"));
    assert.ok(records.length >= 10);
  });

  it("AI Director auto-creates unified change plan entries", () => {
    const parsed = parseEditorInstructionRequest(
      "Add the HomeCheff logo to the jacket, make the tie green, replace the globe with a cooking pan, make the colors more premium."
    );
    const objects = listInstructionObjectsV2(globeManDoc());
    const entries = parsedRequestToChangePlanEntries(parsed, (label) => {
      const match = objects.find((o) => o.label.toLowerCase().includes(label.toLowerCase()));
      return match?.id ?? `obj_${label}`;
    });
    assert.ok(entries.length >= 3);
    assert.ok(entries.some((e) => e.entryType === "style"));
    assert.ok(entries.some((e) => e.entryType !== "style" && /jacket|tie|globe/i.test(e.objectLabel)));
  });

  it("duplicates change plan entries for stacked edits", () => {
    let doc = globeManDoc();
    doc = {
      ...doc,
      instructionStudioState: {
        ...doc.instructionStudioState,
        changePlan: [
          {
            entryType: "object",
            id: "plan_1",
            objectId: "obj_tie",
            objectLabel: "Tie",
            objectCategory: "clothing",
            action: "change_color",
            instruction: "Change color of Tie to green",
            color: "green",
            strength: 55,
            preserveStyle: 80,
            preserveBrand: 85,
            order: 0,
            status: "pending",
          },
        ],
      },
    };
    const duplicated = duplicateChangePlanEntry(doc, "plan_1");
    assert.equal(listChangePlanEntries(duplicated).length, 2);
  });

  it("preview highlight bounds stay available for selected objects", () => {
    const doc = globeManDoc();
    const tie = listInstructionObjectsV2(doc).find((o) => o.label === "Tie");
    assert.ok(tie);
    const bounds = resolveInstructionObjectBounds(tie!, doc);
    assert.ok(bounds.width > 0);
    assert.equal(typeof bounds.exact, "boolean");
  });
});
