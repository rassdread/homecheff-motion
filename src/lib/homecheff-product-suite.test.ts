import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLegacyPrimaryNavItems,
  buildSuiteGlobalNavItems,
  buildSuitePrimaryNavItems,
  buildSuiteToolNavItems,
  resolvePrimaryNavItems,
} from "@/lib/homecheff-primary-nav-config";
import { isHomeCheffProductSuiteNavEnabled } from "@/lib/homecheff-product-suite-flag";
import {
  BILLING_PRODUCT_PLANS,
  HOMECHEFF_PRODUCT_DEFINITIONS,
  HOMECHEFF_PRODUCT_IDS,
  resolveProductDisplayLabelKey,
  resolveProductHref,
  resolveProductInternalHref,
  STUDIO_INTEGRATED_PRODUCT_FLOW,
  SUITE_END_TO_END_AUDIT,
  SUITE_PRODUCT_DISPLAY_LABEL_KEYS,
  productConsumesInfrastructure,
  resolveProductDefinition,
} from "@/lib/homecheff-product-suite";
import {
  applyEditorObjectOperation,
  buildBodyDesignerPromptBlock,
  buildPlacementCanvasFromPlacements,
  compositionGraphToCanvasTree,
  createEmptyVisualEditorSession,
} from "@/lib/homecheff-visual-editor-foundation";
import {
  PRESENTATION_FEATURE_IMPLEMENTATION_STATUS,
  PRESENTATION_PLATFORM_PRESETS,
  resolveSafeAreaSpec,
} from "@/lib/homecheff-presentation-foundation";
import {
  isLibraryAliasPath,
  isPublishAliasPath,
  libraryAliasToHubPath,
  publishAliasToEntryPath,
  resolveLibraryHubPath,
  resolvePublishEntryPath,
} from "@/lib/homecheff-suite-route-aliases";
import { createEmptyReferencePlacement } from "@/lib/studio-asset-reference-placement";
import type { CompositionGraphNode } from "@/types/studio-asset-generation-workbench";
import { ASSETS_HUB_GROUPS } from "@/lib/studio-asset-hub-sections";
import { en } from "@/i18n/locales/en";
import { nl } from "@/i18n/locales/nl";

describe("homecheff-product-suite", () => {
  it("defines five products with stable internal ids", () => {
    assert.equal(HOMECHEFF_PRODUCT_IDS.length, 5);
    assert.deepEqual(HOMECHEFF_PRODUCT_IDS, ["editor", "studio", "motion", "presentation", "assets"]);
    assert.equal(HOMECHEFF_PRODUCT_DEFINITIONS.length, 5);
  });

  it("maps user-facing display labels to Publish and Library", () => {
    assert.equal(SUITE_PRODUCT_DISPLAY_LABEL_KEYS.presentation, "suite.product.publish");
    assert.equal(SUITE_PRODUCT_DISPLAY_LABEL_KEYS.assets, "suite.product.library");
    assert.equal(resolveProductDisplayLabelKey("presentation"), "suite.product.publish");
    assert.equal(resolveProductDisplayLabelKey("assets"), "suite.product.library");
  });

  it("studio integrated flow ends at Publish (internal presentation id)", () => {
    assert.deepEqual(STUDIO_INTEGRATED_PRODUCT_FLOW, ["editor", "studio", "motion", "presentation"]);
  });

  it("resolves user-facing suite hrefs for Publish and Library", () => {
    assert.equal(resolveProductHref("editor"), "/editor");
    assert.equal(resolveProductHref("presentation"), "/publish");
    assert.equal(resolveProductHref("assets"), "/library");
    assert.equal(resolveProductInternalHref("presentation"), "/publish");
    assert.equal(resolveProductInternalHref("assets"), "/studio/assets");
  });

  it("products consume shared infrastructure", () => {
    assert.equal(productConsumesInfrastructure("editor", "identity"), true);
    assert.equal(productConsumesInfrastructure("presentation", "identity"), false);
    assert.equal(productConsumesInfrastructure("assets", "semantic_records"), true);
  });

  it("billing plans use Publish label and Complete Suite", () => {
    assert.equal(BILLING_PRODUCT_PLANS.length, 5);
    const publishPlan = BILLING_PRODUCT_PLANS.find((p) => p.id === "publish");
    assert.ok(publishPlan);
    assert.equal(publishPlan!.labelKey, "suite.billing.plan.publish");
    const complete = BILLING_PRODUCT_PLANS.find((p) => p.id === "complete_suite");
    assert.ok(complete);
    assert.equal(complete!.includesProducts.length, 5);
  });

  it("end-to-end audit has all products", () => {
    assert.equal(SUITE_END_TO_END_AUDIT.length, 5);
    for (const id of HOMECHEFF_PRODUCT_IDS) {
      assert.ok(SUITE_END_TO_END_AUDIT.some((row) => row.product === id));
    }
  });

  it("suite nav flag is enabled by default", () => {
    const prev = process.env.NEXT_PUBLIC_HOMECHEFF_PRODUCT_SUITE_NAV;
    delete process.env.NEXT_PUBLIC_HOMECHEFF_PRODUCT_SUITE_NAV;
    try {
      assert.equal(isHomeCheffProductSuiteNavEnabled(), true);
    } finally {
      if (prev === undefined) {
        delete process.env.NEXT_PUBLIC_HOMECHEFF_PRODUCT_SUITE_NAV;
      } else {
        process.env.NEXT_PUBLIC_HOMECHEFF_PRODUCT_SUITE_NAV = prev;
      }
    }
  });

  it("suite nav can be disabled explicitly", () => {
    const prev = process.env.NEXT_PUBLIC_HOMECHEFF_PRODUCT_SUITE_NAV;
    process.env.NEXT_PUBLIC_HOMECHEFF_PRODUCT_SUITE_NAV = "false";
    try {
      assert.equal(isHomeCheffProductSuiteNavEnabled(), false);
    } finally {
      if (prev === undefined) {
        delete process.env.NEXT_PUBLIC_HOMECHEFF_PRODUCT_SUITE_NAV;
      } else {
        process.env.NEXT_PUBLIC_HOMECHEFF_PRODUCT_SUITE_NAV = prev;
      }
    }
  });

  it("legacy nav uses Library label not Assets", () => {
    const legacy = buildLegacyPrimaryNavItems();
    assert.ok(legacy.some((i) => i.labelKey === "nav.library"));
    assert.equal(legacy.some((i) => i.labelKey === "nav.assets"), false);
  });

  it("suite nav shows Publish and Library, not Presentation or Assets", () => {
    const tools = buildSuiteToolNavItems();
    const global = buildSuiteGlobalNavItems();
    assert.ok(tools.some((i) => i.labelKey === "suite.nav.publish"));
    assert.ok(global.some((i) => i.labelKey === "suite.nav.library"));
    assert.equal(tools.some((i) => i.labelKey === "suite.nav.presentation"), false);
    assert.equal([...global, ...tools].some((i) => i.labelKey === "suite.nav.assets"), false);
    assert.equal([...global, ...tools].some((i) => i.labelKey === "nav.usage"), false);
    assert.equal([...global, ...tools].filter((i) => i.productId).length, 5);
  });

  it("resolvePrimaryNavItems switches on flag", () => {
    assert.equal(resolvePrimaryNavItems(false).length, buildLegacyPrimaryNavItems().length);
    assert.equal(resolvePrimaryNavItems(true).length, buildSuitePrimaryNavItems().length);
  });

  it("assets hub groups match suite taxonomy", () => {
    assert.deepEqual(ASSETS_HUB_GROUPS, ["media", "creative", "library"]);
  });
});

describe("homecheff-suite-route-aliases", () => {
  it("library alias resolves to assets hub", () => {
    assert.equal(resolveLibraryHubPath(), "/studio/assets");
    assert.equal(resolveLibraryHubPath(["media", "videos"]), "/studio/assets/media/videos");
    assert.equal(libraryAliasToHubPath("/library/start"), "/studio/assets");
    assert.equal(libraryAliasToHubPath("/library/start/creative/characters"), "/studio/assets/creative/characters");
    assert.equal(libraryAliasToHubPath("/library"), "/library");
    assert.ok(isLibraryAliasPath("/library/media/videos"));
  });

  it("publish alias resolves to publish entry", () => {
    assert.equal(resolvePublishEntryPath(), "/publish");
    assert.equal(publishAliasToEntryPath("/publish"), "/publish");
    assert.equal(publishAliasToEntryPath("/presentation"), "/publish");
    assert.ok(isPublishAliasPath("/presentation"));
  });
});

describe("homecheff-suite-i18n-labels", () => {
  it("EN labels show Finish Video and Library", () => {
    assert.equal(en["suite.nav.publish"], "Finish video");
    assert.equal(en["suite.nav.motion"], "Animation");
    assert.equal(en["suite.nav.library"], "Library");
    assert.equal(en["studio.assetsHub.title"], "Library");
  });

  it("NL labels show Video afronden and Bibliotheek", () => {
    assert.equal(nl["suite.nav.publish"], "Video afronden");
    assert.equal(nl["suite.nav.motion"], "Animatie");
    assert.equal(nl["suite.nav.library"], "Bibliotheek");
    assert.equal(nl["studio.assetsHub.title"], "Bibliotheek");
  });

  it("publish and library description keys exist in both locales", () => {
    for (const key of ["suite.product.publishDesc", "suite.product.libraryDesc"] as const) {
      assert.ok(en[key]?.length);
      assert.ok(nl[key]?.length);
    }
  });
});

describe("homecheff-visual-editor-foundation", () => {
  it("applies object operations", () => {
    const session = createEmptyVisualEditorSession("asset-1");
    const obj = {
      id: "obj-1",
      label: "Logo",
      sourceKind: "logo" as const,
      assetId: "a1",
      storageKey: "k1",
      previewUrl: "/x.png",
      transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
      locked: false,
      visible: true,
    };
    const locked = applyEditorObjectOperation(obj, "lock");
    assert.equal(locked.locked, true);
    session.objects.push(obj);
    assert.equal(session.sourceAssetId, "asset-1");
  });

  it("builds placement canvas from reference placements", () => {
    const items = buildPlacementCanvasFromPlacements([
      { ...createEmptyReferencePlacement(), sourceName: "Garden Logo", importance: "exact" },
    ]);
    assert.equal(items.length, 1);
    assert.equal(items[0].canvasLocked, true);
  });

  it("renders composition graph tree", () => {
    const root: CompositionGraphNode = {
      id: "char",
      label: "Garden Character",
      kind: "character",
      children: [
        {
          id: "apron",
          label: "Apron",
          kind: "clothing",
          children: [
            { id: "logo", label: "Garden Logo", kind: "placement", children: [], placementId: "p1" },
          ],
        },
      ],
    };
    const tree = compositionGraphToCanvasTree(root);
    assert.ok(tree.some((line) => line.includes("Garden Logo")));
  });

  it("builds body designer prompt block", () => {
    const prompt = buildBodyDesignerPromptBlock({
      headScale: 1.1,
      eyeScale: 1,
      shoulderWidth: 1,
      armThickness: 1,
      waistWidth: 0.9,
      legLength: 1,
      handSize: 1,
      footSize: 1,
      height: 1.05,
      stylizationPreset: "mascot",
    });
    assert.match(prompt, /mascot/i);
  });
});

describe("homecheff-presentation-foundation", () => {
  it("has platform presets including social networks", () => {
    assert.ok(PRESENTATION_PLATFORM_PRESETS.includes("tiktok"));
  });

  it("resolves safe area specs per platform", () => {
    assert.equal(resolveSafeAreaSpec("tiktok").platform, "tiktok");
  });

  it("maps presentation feature implementation status", () => {
    assert.equal(PRESENTATION_FEATURE_IMPLEMENTATION_STATUS.text_overlays, "wired");
  });
});

describe("homecheff-product-definitions", () => {
  it("each product has workflow and user-facing label keys", () => {
    for (const id of HOMECHEFF_PRODUCT_IDS) {
      const def = resolveProductDefinition(id);
      assert.ok(def);
      assert.ok(def!.workflowStepIds.length > 0);
      assert.ok(def!.labelKey.startsWith("suite.product."));
    }
  });
});
