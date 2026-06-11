import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CHEF_MASCOT_CANONICAL_PARTS,
  GARDEN_MASCOT_CANONICAL_PARTS,
  DESIGNER_MASCOT_CANONICAL_PARTS,
  GLOBE_MAN_CANONICAL_PARTS,
  resolveMascotExpansionKind,
} from "@/lib/editor-character-expansion";
import { buildInstructionObjectsFromDocument } from "@/lib/editor-instruction-object-feed";
import { listInstructionObjectsV2 } from "@/lib/editor-instruction-object-v2";
import {
  parseEditorInstructionRequest,
  parsedRequestToChangePlanEntries,
} from "@/lib/editor-instruction-request-parser";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";

describe("editor v2 final cleanup", () => {
  it("detects mascot kinds from filename heuristics", () => {
    const globe = createEditorDocumentFromUpload({
      name: "Globe Man.png",
      backgroundUrl: "https://example.com/g.png",
    });
    const chef = createEditorDocumentFromUpload({
      name: "HomeCheff Chef mascot.png",
      backgroundUrl: "https://example.com/chef.png",
    });
    const garden = createEditorDocumentFromUpload({
      name: "Garden mascot guide.png",
      backgroundUrl: "https://example.com/garden.png",
    });
    const designer = createEditorDocumentFromUpload({
      name: "HomeDesigner mascot.png",
      backgroundUrl: "https://example.com/designer.png",
    });

    assert.equal(resolveMascotExpansionKind(globe), "globe_man");
    assert.equal(resolveMascotExpansionKind(chef), "chef");
    assert.equal(resolveMascotExpansionKind(garden), "garden");
    assert.equal(resolveMascotExpansionKind(designer), "designer");
  });

  it("expands chef mascot into editable parts instead of Main subject", () => {
    const doc = createEditorDocumentFromUpload({
      name: "chef-mascot.png",
      backgroundUrl: "https://example.com/chef.png",
    });
    const labels = listInstructionObjectsV2(doc).map((o) => o.label);
    assert.ok(labels.includes("Chef Character"));
    assert.ok(labels.includes("Apron"));
    assert.ok(labels.includes("Hat"));
    assert.ok(!labels.includes("Main subject"));
  });

  it("expands garden mascot into basket and plants parts", () => {
    const doc = createEditorDocumentFromUpload({
      name: "garden-mascot.png",
      backgroundUrl: "https://example.com/garden.png",
    });
    const labels = listInstructionObjectsV2(doc).map((o) => o.label);
    assert.ok(labels.includes("Garden Character"));
    assert.ok(labels.includes("Basket"));
    assert.ok(labels.includes("Plants"));
  });

  it("expands designer mascot into tools and clothing parts", () => {
    const doc = createEditorDocumentFromUpload({
      name: "designer-mascot.png",
      backgroundUrl: "https://example.com/designer.png",
    });
    const labels = listInstructionObjectsV2(doc).map((o) => o.label);
    assert.ok(labels.includes("Designer Character"));
    assert.ok(labels.includes("Tools"));
    assert.ok(labels.includes("Shirt"));
  });

  it("keeps globe man canonical expansion intact", () => {
    const doc = createEditorDocumentFromUpload({
      name: "Globe Man.png",
      backgroundUrl: "https://example.com/globe-man.png",
    });
    const labels = listInstructionObjectsV2(doc).map((o) => o.label);
    for (const part of GLOBE_MAN_CANONICAL_PARTS) {
      assert.ok(labels.includes(part.label), `missing ${part.label}`);
    }
  });

  it("canonical part lists cover expected mascot roles", () => {
    assert.ok(CHEF_MASCOT_CANONICAL_PARTS.some((p) => p.label === "Apron"));
    assert.ok(GARDEN_MASCOT_CANONICAL_PARTS.some((p) => p.label === "Plants"));
    assert.ok(DESIGNER_MASCOT_CANONICAL_PARTS.some((p) => p.label === "Tools"));
  });

  it("AI Director builds unified change plan for mascot edits", () => {
    const doc = createEditorDocumentFromUpload({
      name: "Globe Man.png",
      backgroundUrl: "https://example.com/globe-man.png",
    });
    const parsed = parseEditorInstructionRequest(
      "Add HomeCheff logo to jacket, make tie green, replace globe with cooking pan, make colors more premium."
    );
    const objects = buildInstructionObjectsFromDocument(doc).editableObjects;
    const entries = parsedRequestToChangePlanEntries(parsed, (label) => {
      const match = objects.find((o) => o.label.toLowerCase().includes(label.toLowerCase()));
      return match?.id ?? `obj_${label}`;
    });
    assert.ok(entries.length >= 3);
    assert.ok(entries.some((e) => e.entryType === "style"));
  });

  it("generic photo still uses Main subject fallback", () => {
    const doc = createEditorDocumentFromUpload({
      name: "vacation-photo.jpg",
      backgroundUrl: "https://example.com/photo.jpg",
    });
    const labels = listInstructionObjectsV2(doc).map((o) => o.label);
    assert.ok(labels.includes("Main subject"));
  });
});
