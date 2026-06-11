import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  actionsForInstructionCategory,
  isBrandingAction,
} from "@/lib/editor-instruction-actions";
import {
  approveInstructionVariant,
  activeApprovedVariant,
} from "@/lib/editor-instruction-approval";
import { buildGenericBulkPlans } from "@/lib/editor-instruction-bulk";
import {
  editorHandoffMotionUrl,
  editorHandoffStudioUrl,
  resolveEditorInstructionHandoff,
} from "@/lib/editor-instruction-handoff";
import { listInstructionObjectsV2 } from "@/lib/editor-instruction-object-v2";
import { buildInstructionObjectsFromDocument } from "@/lib/editor-instruction-object-feed";
import { buildEditorInstructionPromptV2 } from "@/lib/editor-instruction-prompt-builder";
import {
  appendBrandReference,
  buildInstructionReferences,
  createBrandReferenceAsset,
} from "@/lib/editor-instruction-references";
import { buildInstructionLineageTree } from "@/lib/editor-instruction-lineage";
import { listCreatorPresets } from "@/lib/editor-instruction-presets";
import {
  appendInstructionVariant,
  createPendingInstructionVariant,
  originalImageUrlUnchanged,
} from "@/lib/editor-instruction-version";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { DEFAULT_EDITOR_INSTRUCTION_SLIDERS } from "@/types/editor-instruction-studio";

function docWithApron() {
  const doc = createEditorDocumentFromUpload({
    name: "chef.png",
    backgroundUrl: "https://example.com/chef.png",
  });
  doc.objects.push({
    id: "layer_mascot",
    label: "Chef Mascot",
    sourceKind: "upload",
    assetId: null,
    storageKey: "",
    previewUrl: "https://example.com/chef.png",
    transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
    locked: false,
    visible: true,
    bounds: { x: 0.2, y: 0.1, width: 0.5, height: 0.8 },
    layerType: "semantic",
    category: "character",
    semanticType: "mascot",
    confidence: 0.95,
  });
  doc.objects.push({
    id: "layer_apron",
    label: "Apron",
    sourceKind: "upload",
    assetId: null,
    storageKey: "",
    previewUrl: "https://example.com/chef.png",
    transform: { x: 0.45, y: 0.5, scale: 1, rotation: 0 },
    locked: false,
    visible: true,
    bounds: { x: 0.4, y: 0.45, width: 0.2, height: 0.25 },
    layerType: "object",
    category: "clothing",
    confidence: 0.92,
  });
  return doc;
}

describe("editor instruction studio v2", () => {
  it("builds normalized object intelligence with suggested actions", () => {
    const objects = listInstructionObjectsV2(docWithApron());
    const apron = objects.find((o) => o.label === "Apron");
    assert.ok(apron);
    assert.equal(apron!.category, "clothing");
    assert.ok(apron!.suggestedActions.includes("add_logo"));
    assert.equal(apron!.label, "Apron");
  });

  it("returns dynamic actions per category", () => {
    const clothing = actionsForInstructionCategory("clothing");
    assert.ok(clothing.includes("add_logo"));
    const text = actionsForInstructionCategory("text");
    assert.ok(text.includes("translate"));
    const logo = actionsForInstructionCategory("logo");
    assert.ok(logo.includes("replace_logo"));
  });

  it("builds branding prompt with logo reference", () => {
    const prompt = buildEditorInstructionPromptV2({
      objectKey: "obj_apron",
      objectLabel: "Apron",
      category: "clothing",
      action: "add_logo",
      sliders: { ...DEFAULT_EDITOR_INSTRUCTION_SLIDERS },
      logoReference: {
        id: "logo1",
        name: "HomeCheff Logo",
        url: "https://example.com/logo.png",
        transparentBackground: true,
        uploadedAt: new Date().toISOString(),
      },
      brandingPlacementHint: "chest area",
    });
    assert.match(prompt, /Apply the uploaded logo/i);
    assert.match(prompt, /chest area/i);
    assert.match(prompt, /Do not alter: mascot face/i);
  });

  it("stores brand reference assets on document", () => {
    const doc = docWithApron();
    const withLogo = appendBrandReference(
      doc,
      createBrandReferenceAsset({
        name: "Brand Logo",
        url: "https://example.com/logo.png",
      })
    );
    assert.equal(withLogo.instructionStudioState?.brandReferences?.length, 1);
  });

  it("builds multi-reference payload", () => {
    const doc = appendBrandReference(
      docWithApron(),
      createBrandReferenceAsset({ name: "Logo", url: "https://example.com/logo.png" })
    );
    const logoId = doc.instructionStudioState!.brandReferences![0].id;
    const refs = buildInstructionReferences(doc, {
      objectKey: "obj_apron",
      objectLabel: "Apron",
      category: "clothing",
      action: "add_logo",
      sliders: { ...DEFAULT_EDITOR_INSTRUCTION_SLIDERS },
      logoReferenceId: logoId,
    });
    assert.ok(refs.some((r) => r.type === "SOURCE_IMAGE"));
    assert.ok(refs.some((r) => r.type === "LOGO_REFERENCE"));
  });

  it("requires approval before active variant handoff", () => {
    let doc = docWithApron();
    const variant = createPendingInstructionVariant({
      sourceImageUrl: doc.backgroundUrl,
      sourceImageId: "background",
      instruction: {
        objectKey: "obj_apron",
        objectLabel: "Apron",
        category: "clothing",
        action: "add_logo",
        sliders: { ...DEFAULT_EDITOR_INSTRUCTION_SLIDERS },
      },
      prompt: "add logo",
    });
    doc = appendInstructionVariant(doc, {
      ...variant,
      status: "completed",
      resultUrl: "https://example.com/variant.png",
    });
    assert.equal(activeApprovedVariant(doc), undefined);
    assert.equal(resolveEditorInstructionHandoff(doc).usesOriginal, true);

    doc = approveInstructionVariant(doc, variant.id);
    const active = activeApprovedVariant(doc);
    assert.ok(active);
    const handoff = resolveEditorInstructionHandoff(doc);
    assert.equal(handoff.activeVariantUrl, "https://example.com/variant.png");
    assert.equal(handoff.usesOriginal, false);
  });

  it("builds lineage tree with parent-child variants", () => {
    const parent = createPendingInstructionVariant({
      sourceImageUrl: "https://example.com/a.png",
      sourceImageId: "background",
      instruction: {
        objectKey: "obj_a",
        objectLabel: "A",
        category: "other",
        action: "replace",
        sliders: { ...DEFAULT_EDITOR_INSTRUCTION_SLIDERS },
      },
      prompt: "a",
    });
    const child = createPendingInstructionVariant({
      sourceImageUrl: "https://example.com/a.png",
      sourceImageId: "background",
      parentVariantId: parent.id,
      instruction: {
        objectKey: "obj_a",
        objectLabel: "A",
        category: "other",
        action: "replace",
        sliders: { ...DEFAULT_EDITOR_INSTRUCTION_SLIDERS },
      },
      prompt: "b",
    });
    let doc = createEditorDocumentFromUpload({
      name: "x.png",
      backgroundUrl: "https://example.com/a.png",
    });
    doc = appendInstructionVariant(doc, parent);
    doc = appendInstructionVariant(doc, child);
    const tree = buildInstructionLineageTree(doc);
    assert.equal(tree.children.length, 1);
    assert.equal(tree.children[0]!.children.length, 1);
  });

  it("creates bulk generation plans and creator presets", () => {
    assert.equal(buildGenericBulkPlans(4).length, 4);
    assert.equal(listCreatorPresets().length, 3);
  });

  it("handoff urls include session and variant metadata", () => {
    let doc = docWithApron();
    const variant = createPendingInstructionVariant({
      sourceImageUrl: doc.backgroundUrl,
      sourceImageId: "background",
      instruction: {
        objectKey: "obj_apron",
        objectLabel: "Apron",
        category: "clothing",
        action: "add_logo",
        sliders: { ...DEFAULT_EDITOR_INSTRUCTION_SLIDERS },
      },
      prompt: "logo",
    });
    doc = approveInstructionVariant(
      appendInstructionVariant(doc, {
        ...variant,
        status: "completed",
        resultUrl: "https://example.com/v.png",
      }),
      variant.id
    );
    assert.match(editorHandoffStudioUrl(doc), /editorSession=/);
    assert.match(editorHandoffMotionUrl(doc), /editorActiveVariant=1/);
  });

  it("does not mutate original image when appending variants", () => {
    const doc = docWithApron();
    const variant = createPendingInstructionVariant({
      sourceImageUrl: doc.backgroundUrl,
      sourceImageId: "background",
      instruction: {
        objectKey: "obj_apron",
        objectLabel: "Apron",
        category: "clothing",
        action: "remove",
        sliders: { ...DEFAULT_EDITOR_INSTRUCTION_SLIDERS },
      },
      prompt: "remove",
    });
    const next = appendInstructionVariant(doc, variant);
    assert.equal(originalImageUrlUnchanged(doc, next), true);
  });

  it("identifies branding actions", () => {
    assert.equal(isBrandingAction("add_logo"), true);
    assert.equal(isBrandingAction("remove"), false);
  });

  it("feeds Globe Man mascot objects when document only has background layer", () => {
    const doc = createEditorDocumentFromUpload({
      name: "Globe Man.png",
      backgroundUrl: "https://example.com/globe-man.png",
    });
    const { objects, meta } = buildInstructionObjectsFromDocument(doc);
    const labels = objects.map((o) => o.label);
    assert.ok(labels.includes("Character"));
    assert.ok(labels.includes("Globe"));
    assert.ok(labels.includes("Jacket"));
    assert.ok(labels.includes("Shirt"));
    assert.ok(labels.includes("Tie"));
    assert.ok(labels.includes("Pants"));
    assert.ok(labels.includes("Shoes"));
    assert.ok(labels.includes("Background"));
    assert.equal(meta.lowConfidence, true);
    assert.equal(labels.filter((l) => l === "Background").length, 1);
  });

  it("Globe Man dropdown includes category-specific actions", () => {
    const doc = createEditorDocumentFromUpload({
      name: "globe-man.png",
      backgroundUrl: "https://example.com/globe-man.png",
    });
    const objects = listInstructionObjectsV2(doc);
    const globe = objects.find((o) => o.label === "Globe");
    const clothing = objects.find((o) => o.label === "Jacket");
    const background = objects.find((o) => o.label === "Background");
    assert.ok(globe);
    assert.ok(clothing);
    assert.ok(background);
    assert.ok(globe!.suggestedActions.includes("replace"));
    assert.ok(globe!.suggestedActions.includes("remove"));
    assert.ok(globe!.suggestedActions.includes("change_color"));
    assert.ok(clothing!.suggestedActions.includes("add_logo"));
    assert.ok(clothing!.suggestedActions.includes("replace_logo"));
    assert.ok(clothing!.suggestedActions.includes("change_color"));
    assert.ok(background!.suggestedActions.includes("replace"));
    assert.ok(background!.suggestedActions.includes("transparent"));
  });

  it("uses detectedObjects when canvas layers are background-only", () => {
    const doc = createEditorDocumentFromUpload({
      name: "product.png",
      backgroundUrl: "https://example.com/product.png",
    });
    doc.detectedObjects = [
      {
        id: "obj_bottle",
        label: "Bottle",
        confidence: 0.91,
        bbox: { x: 0.3, y: 0.2, width: 0.2, height: 0.5 },
        category: "product",
        zIndex: 2,
        layerId: "layer_bottle",
        visible: true,
        locked: false,
      },
    ];
    const objects = listInstructionObjectsV2(doc);
    assert.ok(objects.some((o) => o.label === "Bottle"));
    assert.ok(objects.some((o) => o.category === "background"));
  });

  it("shows main subject fallback instead of background-only for uploads", () => {
    const doc = createEditorDocumentFromUpload({
      name: "my-photo.jpg",
      backgroundUrl: "https://example.com/photo.jpg",
    });
    const { objects, meta } = buildInstructionObjectsFromDocument(doc);
    assert.ok(objects.some((o) => o.label === "Main subject"));
    assert.ok(objects.some((o) => o.category === "background"));
    assert.equal(meta.lowConfidence, true);
  });

  it("cleans messy Globe Man feed — dedupes background and hides analysis traits", () => {
    const doc = createEditorDocumentFromUpload({
      name: "Globe Man.png",
      backgroundUrl: "https://example.com/globe-man.png",
    });
    doc.semanticLayers = [
      {
        id: "sl_logo",
        label: "Logo",
        type: "logo",
        category: "logo",
        bounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.1 },
        confidence: 0.82,
        visible: true,
        locked: false,
        editable: true,
        source: "vision",
        children: [],
      },
      {
        id: "sl_bg1",
        label: "Background",
        type: "background",
        category: "background",
        bounds: { x: 0, y: 0, width: 1, height: 1 },
        confidence: 1,
        visible: true,
        locked: true,
        editable: false,
        source: "vision",
        children: [],
      },
      {
        id: "sl_bg2",
        label: "Background",
        type: "background",
        category: "background",
        bounds: { x: 0, y: 0, width: 1, height: 1 },
        confidence: 0.99,
        visible: true,
        locked: true,
        editable: false,
        source: "vision",
        children: [],
      },
      {
        id: "sl_body_shape",
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
        id: "sl_proportions",
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
      {
        id: "sl_bg3",
        label: "Background",
        type: "background",
        category: "background",
        bounds: { x: 0, y: 0, width: 1, height: 1 },
        confidence: 1,
        visible: true,
        locked: true,
        editable: false,
        source: "vision",
        children: [],
      },
    ];
    doc.detectedObjects = doc.semanticLayers.map((layer, index) => ({
      id: `obj_${layer.id}`,
      label: layer.label,
      confidence: layer.confidence,
      bbox: layer.bounds,
      category: layer.category === "logo" ? "logo" : layer.category === "background" ? "background" : "person",
      zIndex: index,
      layerId: layer.id,
      visible: true,
      locked: false,
    }));

    const { objects, meta } = buildInstructionObjectsFromDocument(doc);
    const labels = objects.map((o) => o.label);

    assert.ok(labels.includes("Character"));
    assert.ok(labels.includes("Logo"));
    assert.ok(labels.includes("Globe"));
    assert.ok(labels.includes("Jacket"));
    assert.ok(labels.includes("Tie"));
    assert.ok(labels.includes("Shoes"));
    assert.ok(labels.includes("Background"));
    assert.equal(labels.filter((l) => l === "Background").length, 1);
    assert.equal(labels.filter((l) => l === "Logo").length, 1);
    assert.ok(!labels.some((l) => /body shape|proportions/i.test(l)));
    assert.ok(meta.rawCount >= 6);
    assert.ok(meta.count >= meta.rawCount);

    const character = objects.find((o) => o.label === "Character");
    assert.ok(character?.traits?.some((t) => /body shape|proportions/i.test(t)));
  });
});
