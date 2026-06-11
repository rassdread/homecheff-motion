import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import { buildEditorAssetProfile } from "@/lib/editor-asset-intelligence";
import { parseEditorInstructionRequest } from "@/lib/editor-instruction-request-parser";
import {
  buildEditorRecommendationContext,
  isHomeCheffBrandedDocument,
} from "@/lib/editor-recommendation-context";
import {
  listCreatorPresetsForContext,
  resolveCommandExampleKeys,
  resolveDirectorPlaceholderKey,
  resolveMagicPlaceholderKeys,
} from "@/lib/editor-personalized-recommendations";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

function mockDocument(overrides: Partial<EditorCanvasDocument> = {}): EditorCanvasDocument {
  const now = new Date().toISOString();
  return {
    sessionId: "sess_rec",
    name: "photo.jpg",
    sourceKind: "upload",
    sourceAssetId: null,
    backgroundUrl: "https://example.com/photo.jpg",
    workflowStep: "visual_editor",
    objects: [],
    placements: [],
    status: "editing",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("Editor personalized recommendations", () => {
  it("generic user sees generic magic placeholders and examples", () => {
    const ctx = buildEditorRecommendationContext({
      document: mockDocument({ name: "product-shot.jpg" }),
      isAdmin: false,
    });
    assert.equal(ctx.showHomeCheffExamples, false);
    assert.equal(ctx.userCategory, "generic");
    const magic = resolveMagicPlaceholderKeys(ctx);
    assert.ok(magic[0]?.includes("generic"));
    assert.ok(!magic.some((key) => key.includes("homecheff")));
    const examples = resolveCommandExampleKeys(ctx);
    assert.ok(examples[0]?.includes("generic"));
  });

  it("admin sees HomeCheff examples even on neutral assets", () => {
    const ctx = buildEditorRecommendationContext({
      document: mockDocument(),
      isAdmin: true,
    });
    assert.equal(ctx.showHomeCheffExamples, true);
    const magic = resolveMagicPlaceholderKeys(ctx);
    assert.ok(magic.some((key) => key.includes("homecheff")));
  });

  it("HomeCheff asset detection enables branded examples for non-admin", () => {
    const doc = createEditorDocumentFromUpload({
      name: "Globe Man.png",
      backgroundUrl: "https://example.com/globe.png",
    });
    assert.equal(isHomeCheffBrandedDocument(doc), true);
    const ctx = buildEditorRecommendationContext({ document: doc, isAdmin: false });
    assert.equal(ctx.showHomeCheffExamples, true);
    assert.equal(resolveDirectorPlaceholderKey(ctx), "editor.rec.homecheff.director.placeholder");
  });

  it("chef category surfaces food and menu oriented examples", () => {
    const doc = mockDocument({
      name: "menu-dish.jpg",
      assetProfile: buildEditorAssetProfile(
        mockDocument({ name: "menu-dish.jpg" }),
        { objectType: "food_item", confidence: 0.9, labels: ["dish"] } as never
      ),
    });
    const ctx = buildEditorRecommendationContext({ document: doc });
    assert.equal(ctx.userCategory, "chef");
    const examples = resolveCommandExampleKeys(ctx);
    assert.ok(examples.some((key) => key.includes("chef")));
    assert.equal(listCreatorPresetsForContext(ctx).length, 1);
    assert.equal(listCreatorPresetsForContext(ctx)[0]?.id, "chef");
  });

  it("garden category surfaces garden and eco examples", () => {
    const doc = mockDocument({
      name: "garden-bed.jpg",
      assetProfile: {
        assetType: "garden_asset",
        confidence: 0.8,
        humanSummaryKey: "editor.assetIntel.summary.garden",
        recommendedActions: [],
        recommendedExports: ["png"],
        recommendedStudioUse: { score: 70, labelKey: "x", usages: [], recommendedUsageKey: "x" },
        recommendedMotionUse: { score: 60, labelKey: "x", explanations: [], checks: [] },
        recommendedDestination: "library_garden",
        libraryIntelligence: {
          autoCategory: "edited_image",
          sectionKey: "x",
          suggestedTags: [],
          reuseScore: 50,
        },
        analyzedAt: new Date().toISOString(),
      },
    });
    const ctx = buildEditorRecommendationContext({ document: doc });
    assert.equal(ctx.userCategory, "garden");
    assert.ok(resolveCommandExampleKeys(ctx).some((key) => key.includes("garden")));
  });

  it("designer category surfaces apparel and product examples", () => {
    const doc = mockDocument({
      assetProfile: {
        assetType: "product",
        confidence: 0.8,
        humanSummaryKey: "editor.assetIntel.summary.product",
        recommendedActions: [],
        recommendedExports: ["png"],
        recommendedStudioUse: { score: 70, labelKey: "x", usages: [], recommendedUsageKey: "x" },
        recommendedMotionUse: { score: 60, labelKey: "x", explanations: [], checks: [] },
        recommendedDestination: "marketplace_assets",
        libraryIntelligence: {
          autoCategory: "edited_image",
          sectionKey: "x",
          suggestedTags: [],
          reuseScore: 50,
        },
        analyzedAt: new Date().toISOString(),
      },
    });
    const ctx = buildEditorRecommendationContext({ document: doc });
    assert.equal(ctx.userCategory, "designer");
    assert.ok(resolveMagicPlaceholderKeys(ctx).some((key) => key.includes("designer")));
  });

  it("parser uses generic logo default unless HomeCheff context is enabled", () => {
    const generic = parseEditorInstructionRequest("Add logo to jacket");
    const branded = parseEditorInstructionRequest("Add HomeCheff logo to jacket", {
      showHomeCheffExamples: true,
      brandName: "HomeCheff",
    });
    const genericLogo = generic.objects.flatMap((o) => o.actions).find((a) => a.logo)?.logo;
    const brandedLogo = branded.objects.flatMap((o) => o.actions).find((a) => a.logo)?.logo;
    assert.equal(genericLogo, "your logo");
    assert.equal(brandedLogo, "HomeCheff");
  });

  it("mascot asset summary is generic unless HomeCheff context applies", () => {
    const genericDoc = mockDocument({ name: "cartoon-character.png" });
    const genericProfile = buildEditorAssetProfile(genericDoc);
    assert.equal(genericProfile.humanSummaryKey, "editor.rec.assetSummary.mascot");

    const homecheffDoc = createEditorDocumentFromUpload({
      name: "Globe Man mascot.png",
      backgroundUrl: "https://example.com/globe.png",
    });
    const homecheffProfile = buildEditorAssetProfile(homecheffDoc);
    assert.equal(homecheffProfile.humanSummaryKey, "editor.rec.homecheff.assetSummary.mascot");
  });
});
