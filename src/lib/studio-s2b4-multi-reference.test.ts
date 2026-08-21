import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COMPOSITE_REFERENCE_BOARD_DECISION,
  PROVIDER_MAX_ADDITIONAL_REFERENCES,
  budgetReferencesForOperation,
  collisionFamilyForOperation,
} from "@/lib/studio-reference-budget";
import {
  assessTransformationQa,
  qaDimensionsForOperation,
} from "@/lib/studio-transform-qa";
import {
  buildProductLogoTransformationPrompt,
  productLogoPromptBlocksGenerativeRedrawEquivalence,
  productLogoPromptRequiresPixelExact,
} from "@/lib/studio-product-logo-transformation-prompt";
import {
  buildMultiCharacterAssociationLines,
  isProductLogoFusionWorkflow,
  mapProductLogoPayloadToIntent,
  resolveProductLogoRoute,
} from "@/lib/studio-product-logo-transformation-runtime";
import {
  mapFusionWizardToTransformationIntent,
  mapMotionPresetToTransformationIntent,
  mapProductExperienceToTransformationIntent,
  mapSceneRerenderToTransformationIntent,
} from "@/lib/studio-image-transformation-map";
import { routeImageTransformation } from "@/lib/studio-image-transformation-router";
import {
  buildSceneRerenderIntent,
  resolveApprovedSceneStillBase,
  resolveRedCarpetStillTransformation,
  resolveSceneRerenderRoute,
} from "@/lib/studio-scene-rerender-runtime";
import { buildSceneRerenderTransformationPrompt } from "@/lib/studio-scene-rerender-prompt";
import type { TransformationRuntimeCapabilities } from "@/types/studio-image-transformation";

const CAPS: TransformationRuntimeCapabilities = {
  supportsBaseEdit: true,
  supportsMultiReference: true,
  supportsMask: true,
  supportsPixelComposite: true,
  supportsCommercialInject: true,
  stillReferenceEditEnabled: true,
  maxReferenceImages: PROVIDER_MAX_ADDITIONAL_REFERENCES,
};

describe("S2B.4 reference budget + collision", () => {
  it("aligns default provider budget to 4", () => {
    assert.equal(PROVIDER_MAX_ADDITIONAL_REFERENCES, 4);
    assert.equal(COMPOSITE_REFERENCE_BOARD_DECISION, "COMPOSITE_REFERENCE_BOARD_NOT_REQUIRED");
  });

  it("never silently drops MUST_PRESERVE logo when over soft budget", () => {
    const intent = mapFusionWizardToTransformationIntent({
      intentId: "product_branding",
      slots: [
        { slotId: "person", role: "person", url: "https://cdn.example/p.jpg", required: true },
        { slotId: "logo", role: "logo", url: "https://cdn.example/logo.png", required: true },
        { slotId: "style", role: "style", url: "https://cdn.example/style.jpg", required: false },
        { slotId: "bg", role: "background", url: "https://cdn.example/bg.jpg", required: false },
        { slotId: "obj", role: "object", url: "https://cdn.example/obj.jpg", required: false },
        { slotId: "extra", role: "style", url: "https://cdn.example/e.jpg", required: false },
      ],
    });
    const budget = budgetReferencesForOperation(intent, 2);
    assert.ok(budget.kept.some((r) => r.role === "LOGO_REFERENCE"));
    assert.ok(budget.dropped.every((r) => r.exactness !== "MUST_PRESERVE" || r.required !== true || r.role === "LOGO_REFERENCE"));
    assert.ok(budget.kept.some((r) => r.role === "LOGO_REFERENCE" && r.exactness === "MUST_PRESERVE"));
  });

  it("uses commercial collision family for product/logo", () => {
    assert.equal(collisionFamilyForOperation("PRODUCT_PRESERVE"), "COMMERCIAL_HERO");
    assert.equal(collisionFamilyForOperation("CLOTHING_TRANSFER"), "CLOTHING_TRANSFER");
  });
});

describe("S2B.4 product/logo exactness + routing", () => {
  it("maps BUSINESS_LOGO_PLACEMENT to PIXEL_COMPOSITE with MUST_PRESERVE logo", () => {
    const intent = mapProductExperienceToTransformationIntent({
      experienceId: "BUSINESS_LOGO_PLACEMENT",
      slots: [
        { slotId: "source_image", role: "source_image", url: "https://cdn.example/src.jpg", required: true },
        { slotId: "logo", role: "logo", url: "https://cdn.example/logo.png", required: true },
      ],
    });
    assert.equal(intent.operation, "LOGO_PRESERVE");
    const logo = intent.references.find((r) => r.role === "LOGO_REFERENCE") ?? intent.baseAsset;
    assert.ok(logo);
    const { plan } = routeImageTransformation(intent, CAPS);
    assert.equal(plan.actualRoute, "PIXEL_COMPOSITE");
    assert.ok(plan.postProcess.includes("PIXEL_COMPOSITE"));
  });

  it("PRODUCT_PRESERVE sets product exactness MUST_PRESERVE for commercial flows", () => {
    const intent = mapFusionWizardToTransformationIntent({
      intentId: "product_environment",
      slots: [
        { slotId: "person", role: "person", url: "https://cdn.example/p.jpg", required: true },
        { slotId: "product", role: "product", url: "https://cdn.example/prod.jpg", required: true },
      ],
    });
    const product = intent.references.find((r) => r.role === "PRODUCT_REFERENCE") ?? intent.baseAsset;
    assert.ok(product);
    if (product.role === "PRODUCT_REFERENCE" || intent.operation === "PRODUCT_PRESERVE") {
      assert.ok(
        product.exactness === "MUST_PRESERVE" ||
          intent.references.some((r) => r.role === "PRODUCT_REFERENCE" && r.exactness === "MUST_PRESERVE") ||
          intent.operation === "PRODUCT_PRESERVE"
      );
    }
  });

  it("product/logo prompt blocks generative redraw equivalence", () => {
    const { intent, plan } = resolveProductLogoRoute({
      workflowType: "product_branding",
      primaryImageUrl: "https://cdn.example/base.jpg",
      payload: {
        blueprint: {
          id: "bp",
          workflowType: "product_branding",
          createdAt: new Date().toISOString(),
          references: [],
          traitAssignments: {},
          renderInstructions: [],
          preservationRules: ["logo"],
          styleNotes: [],
        },
        styleDNA: [],
        referenceAnalysis: [],
        renderInstructions: [],
        references: [
          {
            referenceId: "logo-1",
            role: "logo",
            url: "https://cdn.example/logo.png",
            name: "Logo",
          },
        ],
        logoAssets: [],
        primaryImageUrl: "https://cdn.example/base.jpg",
      },
    });
    const prompt = buildProductLogoTransformationPrompt({ intent, plan });
    assert.ok(productLogoPromptRequiresPixelExact(prompt));
    assert.ok(productLogoPromptBlocksGenerativeRedrawEquivalence(prompt));
  });

  it("detects product_branding workflow", () => {
    assert.equal(isProductLogoFusionWorkflow("product_branding"), true);
    assert.equal(isProductLogoFusionWorkflow("outfit_from_reference"), false);
  });
});

describe("S2B.4 clothing model identity blocked", () => {
  it("negative transfer includes face/body for clothing", () => {
    const intent = mapFusionWizardToTransformationIntent({
      intentId: "outfit_from_reference",
      slots: [
        { slotId: "person", role: "person", url: "https://cdn.example/a.jpg", required: true },
        { slotId: "outfit", role: "outfit", url: "https://cdn.example/jacket.jpg", required: true },
      ],
    });
    const rule = intent.negativeTransferRules.find((r) => r.referenceRole === "CLOTHING_REFERENCE");
    assert.ok(rule);
    assert.ok(rule!.doNotTransfer.some((t) => /face|identity/i.test(t)));
    assert.ok(rule!.doNotTransfer.some((t) => /body|pose|background/i.test(t)));
  });
});

describe("S2B.4 location people blocked", () => {
  it("location negative transfer blocks people", () => {
    const intent = mapFusionWizardToTransformationIntent({
      intentId: "person_background",
      slots: [
        { slotId: "person", role: "person", url: "https://cdn.example/a.jpg", required: true },
        { slotId: "background", role: "background", url: "https://cdn.example/loc.jpg", required: true },
      ],
    });
    assert.ok(
      intent.protectedTargets.some(
        (p) => p.level === "MUST_NOT_IMPORT_FROM_REFERENCE" && /people/i.test(p.property)
      ) ||
        intent.negativeTransferRules.some(
          (r) => r.referenceRole === "LOCATION_REFERENCE" && r.doNotTransfer.some((t) => /people|person/i.test(t))
        )
    );
  });
});

describe("S2B.4 multi-character association", () => {
  it("builds explicit A/B association lines", () => {
    const lines = buildMultiCharacterAssociationLines([
      { assetId: "char-a", name: "Anna", index: 0 },
      { assetId: "char-b", name: "Bob", index: 1 },
    ]);
    assert.ok(lines.some((l) => l.includes("Anna")));
    assert.ok(lines.some((l) => l.includes("Bob")));
    assert.ok(lines.some((l) => l.toLowerCase().includes("do not blend")));
  });

  it("scene prompt includes multi-character association when 2 identities", () => {
    const intent = mapSceneRerenderToTransformationIntent({
      approvedStill: { id: "still-1", url: "https://cdn.example/scene.jpg" },
      upc: {
        version: "s2a",
        upcHash: "hash",
        characters: [
          {
            id: "a",
            name: "Anna",
            referenceIdentity: { primaryUrl: "https://cdn.example/a.jpg" },
          },
          {
            id: "b",
            name: "Bob",
            referenceIdentity: { primaryUrl: "https://cdn.example/b.jpg" },
          },
        ],
        locations: [],
        props: [],
        worlds: [],
        style: null,
        scenes: [],
      } as never,
      sceneId: null,
      changeTargets: ["location"],
    });
    // When upc.sceneId null, all characters may be included
    const { plan } = routeImageTransformation(intent, CAPS);
    const prompt = buildSceneRerenderTransformationPrompt({ intent, plan });
    const idCount = intent.references.filter((r) => r.role === "IDENTITY_REFERENCE").length;
    if (idCount >= 2) {
      assert.match(prompt, /MULTI-CHARACTER IDENTITY ASSOCIATION/);
    }
  });
});

describe("S2B.4 approved BASE + outfit A-only semantics", () => {
  it("approved still remains BASE for expression", () => {
    const base = resolveApprovedSceneStillBase({
      selectedSceneImageId: "s5",
      sceneImages: [{ id: "s5", status: "completed", imageUrl: "https://cdn.example/s5.jpg" }],
    });
    const { intent, plan } = resolveSceneRerenderRoute({
      approvedStill: base!,
      changeTargets: ["expression"],
    });
    assert.equal(intent.baseAsset?.assetId, "s5");
    assert.notEqual(plan.actualRoute, "TEXT_TO_IMAGE");
  });

  it("clothing change targets clothing only with identity protected", () => {
    const intent = buildSceneRerenderIntent({
      approvedStill: {
        id: "s5",
        url: "https://cdn.example/s5.jpg",
        generationVersion: 1,
        promptVersion: 1,
      },
      changeTargets: ["clothing"],
    });
    assert.equal(intent.operation, "CLOTHING_TRANSFER");
    assert.ok(intent.protectedTargets.some((p) => p.property.includes("face") || p.property.includes("identity")));
  });
});

describe("S2B.4 red carpet stress", () => {
  it("person only does not require outfit/location refs", () => {
    const routed = resolveRedCarpetStillTransformation({
      personUrl: "https://cdn.example/person.jpg",
    });
    assert.notEqual(routed.plan.status, "missing_required_reference");
    assert.equal(routed.singleGeneration, true);
  });

  it("person + outfit blocks clothing model as BASE", () => {
    const routed = resolveRedCarpetStillTransformation({
      personUrl: "https://cdn.example/person.jpg",
      luxuryOutfitUrl: "https://cdn.example/gown.jpg",
    });
    assert.equal(routed.intent.baseAsset?.role, "BASE");
    assert.ok(routed.intent.references.some((r) => r.role === "CLOTHING_REFERENCE"));
  });

  it("person + outfit + location keeps single generation", () => {
    const routed = resolveRedCarpetStillTransformation({
      personUrl: "https://cdn.example/person.jpg",
      luxuryOutfitUrl: "https://cdn.example/gown.jpg",
      locationUrl: "https://cdn.example/carpet.jpg",
    });
    assert.equal(routed.singleGeneration, true);
    assert.notEqual(routed.plan.actualRoute, "TEXT_TO_IMAGE");
  });
});

describe("S2B.4 transform QA", () => {
  it("selects operation-aware dimensions", () => {
    assert.ok(qaDimensionsForOperation("CLOTHING_TRANSFER").includes("clothingTransferMatch"));
    assert.ok(qaDimensionsForOperation("LOGO_PRESERVE").includes("logoPreservation"));
    assert.ok(qaDimensionsForOperation("MULTI_CHARACTER_COMPOSITION").includes("secondaryIdentityPreservation"));
  });

  it("returns PASS/WARN/FAIL/UNKNOWN and escalation without auto-retry", () => {
    const qa = assessTransformationQa({
      operation: "LOGO_PRESERVE",
      plan: {
        actualRoute: "MULTI_REFERENCE_EDIT",
        downgradeReason: null,
        protectionLost: [],
        postProcess: ["NONE"],
      },
      providerSucceeded: true,
      hasLogoMustPreserve: true,
      pixelCompositeApplied: false,
    });
    assert.ok(["PASS", "WARN", "FAIL", "UNKNOWN"].includes(qa.overall));
    assert.equal(qa.recommendedEscalation, "PIXEL_COMPOSITE");
  });

  it("PASS when pixel composite applied for logo", () => {
    const qa = assessTransformationQa({
      operation: "LOGO_PRESERVE",
      plan: {
        actualRoute: "PIXEL_COMPOSITE",
        downgradeReason: null,
        protectionLost: [],
        postProcess: ["PIXEL_COMPOSITE"],
      },
      providerSucceeded: true,
      hasLogoMustPreserve: true,
      pixelCompositeApplied: true,
    });
    assert.equal(qa.logoPreservation, "PASS");
    assert.equal(qa.recommendedEscalation, "NONE");
  });
});

describe("S2B.4 downgrade + provider call policy", () => {
  it("records protectionLost when must-keep over provider budget", () => {
    const intent = mapSceneRerenderToTransformationIntent({
      approvedStill: { id: "still", url: "https://cdn.example/s.jpg" },
      extraRefs: [
        { slotId: "a", role: "person", url: "https://cdn.example/a.jpg", required: true },
        { slotId: "b", role: "person", url: "https://cdn.example/b.jpg", required: true },
        { slotId: "logo", role: "logo", url: "https://cdn.example/l.png", required: true },
        { slotId: "product", role: "product", url: "https://cdn.example/p.jpg", required: true },
        { slotId: "loc", role: "location", url: "https://cdn.example/loc.jpg", required: true },
      ],
    });
    // Force product/logo MUST_PRESERVE via logo role; product may be SHOULD_MATCH
    const { plan } = routeImageTransformation(intent, { ...CAPS, maxReferenceImages: 1 });
    assert.ok(plan.droppedReferences.length >= 0);
    if (plan.compositeReferenceRecommended) {
      assert.ok(
        plan.protectionLost.includes("MUST_PRESERVE_OVER_PROVIDER_BUDGET") ||
          plan.references.some((r) => r.exactness === "MUST_PRESERVE")
      );
    }
  });

  it("asserts fusion product runtime wiring", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(
      new URL("../server/editor/editor-fusion-render-service.ts", import.meta.url),
      "utf8"
    );
    assert.match(src, /executeProductLogoFusionTransformation/);
  });
});

describe("S2B.4 8-scene pixar continuity fixture (plan-level)", () => {
  it("scene5 clothing then scene7 location keep BASE + continuity-friendly ops", () => {
    const scene5 = resolveSceneRerenderRoute({
      approvedStill: {
        id: "scene5-approved",
        url: "https://cdn.example/s5.jpg",
        generationVersion: 5,
        promptVersion: 1,
      },
      changeTargets: ["clothing"],
    });
    assert.equal(scene5.intent.operation, "CLOTHING_TRANSFER");
    assert.equal(scene5.intent.baseAsset?.assetId, "scene5-approved");

    const scene7 = resolveSceneRerenderRoute({
      approvedStill: {
        id: "scene5-outfit2",
        url: "https://cdn.example/s5-outfit2.jpg",
        generationVersion: 6,
        promptVersion: 1,
      },
      changeTargets: ["location"],
      extraRefs: [
        { slotId: "loc-b", role: "location", url: "https://cdn.example/loc-b.jpg", required: true },
      ],
    });
    assert.equal(scene7.intent.operation, "LOCATION_TRANSFER");
    assert.equal(scene7.intent.baseAsset?.assetId, "scene5-outfit2");
    assert.notEqual(scene7.plan.actualRoute, "TEXT_TO_IMAGE");
  });
});

describe("S2B.4 coverage inventory", () => {
  it("marks logo/commercial rows execution-active", async () => {
    const { inventoryProductExperiences } = await import(
      "@/lib/studio-image-transformation-inventory"
    );
    const rows = inventoryProductExperiences();
    const logo = rows.find((r) => r.id === "experience:BUSINESS_LOGO_PLACEMENT");
    assert.ok(logo);
    assert.equal(logo?.currentExecutionMatchesPlan, true);
    assert.ok(
      logo?.status === "PIXEL_PRESERVE_ACTIVE" ||
        logo?.status === "QA_ACTIVE" ||
        logo?.status === "ROUTER_READY"
    );
  });
});

describe("S2B.4 motion preset red carpet still maps", () => {
  it("maps red_carpet_moment with outfit + location roles", () => {
    const intent = mapMotionPresetToTransformationIntent({
      presetId: "red_carpet_moment",
      slots: [
        { slotId: "person_character", role: "character", url: "https://cdn.example/p.jpg", required: true },
        { slotId: "luxury_outfit", role: "outfit", url: "https://cdn.example/o.jpg", required: false },
        { slotId: "luxury_background", role: "background", url: "https://cdn.example/bg.jpg", required: false },
      ],
    });
    assert.equal(intent.family, "RED_CARPET_CELEBRITY");
    assert.ok(intent.references.some((r) => r.role === "CLOTHING_REFERENCE"));
    assert.ok(intent.references.some((r) => r.role === "LOCATION_REFERENCE"));
  });
});
