import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BRAND_PROTECTION_PROMPT_RULES,
  buildBrandAssetProtectionLayer,
  buildBrandProtectionPromptBlock,
  defaultPreserveLogoExactForWorkflow,
  resolveDefaultPreserveMode,
  validateProtectedBrandAssetsPostRender,
} from "@/lib/brand-asset-protection-layer";
import { buildFusionIntelligencePrompt, buildFusionRenderPayload } from "@/lib/editor-fusion-render-payload";
import { resolveFusionVariantImageSlots } from "@/lib/editor-fusion-variant-render";
import { seedCategoryOutputSettings } from "@/lib/editor-fusion-archetypes";
import { createInitialFusionPlan } from "@/lib/editor-fusion-plan";
import { createEditorDocumentFromUpload } from "@/lib/editor-canvas-session";
import {
  buildLogoPlacementBlueprint,
  buildLogoPlacementFusionPlanPatch,
} from "@/lib/logo-placement-blueprint";
import { buildFusionArchetypeNegativePrompt } from "@/lib/editor-fusion-archetype-v2";

function mockDoc(name = "product.png") {
  return createEditorDocumentFromUpload({
    name,
    backgroundUrl: "https://example.com/product.png",
    storageKey: "product.png",
  });
}

describe("brand asset protection layer", () => {
  it("1. product branding marks logo as protected", () => {
    const protection = buildBrandAssetProtectionLayer({
      workflowType: "product_branding",
      logoAssets: [{ referenceId: "logo_1", url: "https://example.com/logo.png", name: "Brand" }],
      generationSettings: seedCategoryOutputSettings("product_branding"),
    });
    assert.ok(protection.active);
    assert.equal(protection.assets.length, 1);
    assert.equal(protection.assets[0]?.mustRemainExact, true);
    assert.equal(protection.assets[0]?.preserveMode, "post_composite");
  });

  it("2. logo placement uses post_composite", () => {
    const blueprint = buildLogoPlacementBlueprint({
      targetObject: {
        id: "shirt_1",
        label: "Shirt",
        bounds: { x: 0.3, y: 0.4, width: 0.2, height: 0.15, exact: true },
      },
      logoAssetUrl: "https://example.com/logo.png",
    });
    const mode = resolveDefaultPreserveMode("logo_placement", "text_logo");
    assert.equal(mode, "post_composite");
    const protection = buildBrandAssetProtectionLayer({
      workflowType: "logo_placement",
      logoPlacement: blueprint,
      logoAssets: [{ referenceId: "logo", url: blueprint.logoAssetUrl }],
    });
    assert.ok(protection.postCompositeAssets.length >= 1);
  });

  it("3. mascot transformation protects mascot marks", () => {
    const protection = buildBrandAssetProtectionLayer({
      workflowType: "mascot_transform",
      mascotPreserveLogo: true,
      profiles: [{ referenceId: "mascot", imageUrl: "https://example.com/mascot.png", parts: [{ id: "globe", label: "Globe logo", category: "accessories" }] }],
    });
    assert.ok(protection.active);
    assert.ok(protection.assets.some((a) => a.assetType === "mascot_mark" || a.assetType === "logo"));
    assert.ok(
      protection.assets.every(
        (a) => a.preserveMode === "reference_asset" || a.preserveMode === "post_composite"
      )
    );
  });

  it("4. prompt contains anti-redraw rules", () => {
    const doc = mockDoc();
    const plan = createInitialFusionPlan(doc, "product_branding");
    plan.references = [
      { id: "logo_ref", type: "logo", url: "https://example.com/logo.png", name: "Logo" },
    ];
    const payload = buildFusionRenderPayload({
      document: doc,
      plan,
      profiles: [],
    });
    const prompt = buildFusionIntelligencePrompt(payload);
    for (const rule of BRAND_PROTECTION_PROMPT_RULES.slice(0, 4)) {
      assert.match(prompt, new RegExp(rule.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 24)));
    }
    const negative = buildFusionArchetypeNegativePrompt("product_branding", plan.generationSettings);
    assert.match(negative, /Do not redraw/);
  });

  it("5. protected logo sent as reference_asset or post_composite", () => {
    const doc = mockDoc();
    const plan = createInitialFusionPlan(doc, "product_branding");
    plan.references = [
      { id: "logo_ref", type: "logo", url: "https://example.com/logo.png", name: "Logo" },
    ];
    const payload = buildFusionRenderPayload({ document: doc, plan, profiles: [] });
    const slots = resolveFusionVariantImageSlots({
      primaryImageUrl: plan.baseImageUrl,
      payload,
    });
    const logoSlot = slots.find((s) => s.isLogo);
    assert.ok(logoSlot);
    assert.equal(logoSlot.preserveOriginal, true);
    assert.ok(logoSlot.preserveMode === "reference_asset" || logoSlot.preserveMode === "post_composite");
  });

  it("6. post-render validation passes when post-composite applied", () => {
    const protection = buildBrandAssetProtectionLayer({
      workflowType: "product_branding",
      logoAssets: [{ referenceId: "logo", url: "https://example.com/logo.png" }],
    });
    const validation = validateProtectedBrandAssetsPostRender({
      protection,
      renderSucceeded: true,
      postCompositeApplied: true,
    });
    assert.equal(validation.passed, true);
    assert.equal(validation.recoverableViaPostComposite, false);
  });

  it("6b. post-render validation fails when post-composite pending", () => {
    const protection = buildBrandAssetProtectionLayer({
      workflowType: "product_branding",
      logoAssets: [{ referenceId: "logo", url: "https://example.com/logo.png" }],
    });
    const validation = validateProtectedBrandAssetsPostRender({
      protection,
      renderSucceeded: true,
      postCompositeApplied: false,
    });
    assert.equal(validation.passed, false);
    assert.ok(validation.warnings.length > 0);
    assert.equal(validation.recoverableViaPostComposite, true);
  });

  it("10. protection result includes overlay plan slot", () => {
    const protection = buildBrandAssetProtectionLayer({
      workflowType: "product_branding",
      logoAssets: [{ referenceId: "l1", url: "https://example.com/l.png" }],
    });
    assert.ok(Array.isArray(protection.overlayPlans));
  });

  it("7. UI shows brand protection active", () => {
    const banner = readFileSync(
      join(process.cwd(), "src/components/editor/editor-brand-protection-banner.tsx"),
      "utf8"
    );
    assert.match(banner, /data-brand-protection-active="true"/);
    assert.match(banner, /editor\.brandProtection\.active/);
  });

  it("8. default Logo exact behouden is on", () => {
    assert.equal(defaultPreserveLogoExactForWorkflow("product_branding"), true);
    assert.equal(defaultPreserveLogoExactForWorkflow("logo_placement"), true);
    const settings = seedCategoryOutputSettings("product_branding");
    assert.equal(settings.preserveLogoExact, true);
    const patch = buildLogoPlacementFusionPlanPatch(
      buildLogoPlacementBlueprint({
        targetObject: { id: "obj", label: "Apron", bounds: { x: 0, y: 0, width: 1, height: 1 } },
        logoAssetUrl: "https://example.com/logo.png",
      })
    );
    assert.equal(patch.generationSettings?.preserveLogoExact, true);
  });

  it("9. buildBrandProtectionPromptBlock includes protected assets", () => {
    const protection = buildBrandAssetProtectionLayer({
      workflowType: "product_branding",
      logoAssets: [{ referenceId: "l1", url: "https://example.com/l.png", name: "HC" }],
    });
    const block = buildBrandProtectionPromptBlock(protection);
    assert.ok(block.some((line) => line.includes("BRAND ASSET PROTECTION")));
    assert.ok(block.some((line) => line.includes("post_composite")));
  });

  it("11. product branding fusion payload uses vision quad when document has geometry", () => {
    const doc = mockDoc();
    const packagingLayer = {
      ...doc.objects[0]!,
      id: "product_face",
      label: "Product front",
      layerType: "semantic" as const,
      semanticType: "product",
      bounds: { x: 0.25, y: 0.3, width: 0.45, height: 0.4 },
      selectionShape: {
        selectionMode: "mask" as const,
        boundingBox: { x: 0.25, y: 0.3, width: 0.45, height: 0.4 },
        polygon: [
          { x: 0.25, y: 0.32 },
          { x: 0.68, y: 0.3 },
          { x: 0.7, y: 0.68 },
          { x: 0.27, y: 0.7 },
        ],
        maskUrl: "https://example.com/product-mask.png",
      },
    };
    const document = { ...doc, objects: [doc.objects[0]!, packagingLayer] };
    const plan = createInitialFusionPlan(document, "product_branding");
    plan.references = [
      { id: "logo_ref", type: "logo", url: "https://example.com/logo.png", name: "Logo" },
    ];
    const payload = buildFusionRenderPayload({ document, plan, profiles: [] });
    const logo = payload.brandProtection?.postCompositeAssets[0];
    assert.ok(logo?.quad);
    assert.equal(logo?.quadSource, "polygon");
  });
});
