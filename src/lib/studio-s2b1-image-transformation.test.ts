import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EDITOR_FUSION_INTENT_DEFINITIONS } from "@/lib/editor-image-fusion-catalog";
import { STUDIO_PRODUCT_EXPERIENCE_IDS } from "@/lib/studio-creative-director/product-experience-ids";
import { getAllMotionActionPresets } from "@/lib/motion-action-presets";
import {
  buildTransformationCoverageMatrix,
  coverageSummary,
  inventoryFusionWizards,
} from "@/lib/studio-image-transformation-inventory";
import {
  mapEditorInstructionToTransformationIntent,
  mapFusionWizardToTransformationIntent,
  mapLegacyToTransformationIntent,
  mapMorphActionToTransformationIntent,
  mapMotionPresetToTransformationIntent,
  mapOutfitWizardToTransformationIntent,
  mapProductExperienceToTransformationIntent,
  mapSceneRerenderToTransformationIntent,
} from "@/lib/studio-image-transformation-map";
import {
  canonicalRoleFromWizardSlot,
  negativeTransferForRole,
} from "@/lib/studio-image-transformation-roles";
import { routeImageTransformation } from "@/lib/studio-image-transformation-router";
import { resolveUnifiedProductionContext } from "@/lib/studio-unified-production-context";
import {
  studioCharacterListItem,
  studioLocationListItem,
  studioPropListItem,
  studioSceneDetail,
  studioStoryboardDetail,
  studioWorldProfileListItem,
} from "@/test/studio-api-fixtures";
import type { TransformationRuntimeCapabilities } from "@/types/studio-image-transformation";

const CAPS: TransformationRuntimeCapabilities = {
  supportsBaseEdit: true,
  supportsMultiReference: true,
  supportsMask: true,
  supportsPixelComposite: true,
  supportsCommercialInject: true,
  stillReferenceEditEnabled: true,
  maxReferenceImages: 4,
};

const personOutfitSlots = [
  {
    slotId: "person",
    role: "person",
    url: "https://cdn.example/me.jpg?sig=secret",
    assetId: "person",
    required: true,
  },
  {
    slotId: "outfit",
    role: "outfit",
    url: "https://cdn.example/jacket.jpg?sig=secret",
    assetId: "outfit",
    required: true,
  },
];

describe("S2B.1 image transformation roles", () => {
  it("maps existing wizard slot roles without inventing extras", () => {
    assert.equal(canonicalRoleFromWizardSlot("person", "person"), "IDENTITY_REFERENCE");
    assert.equal(canonicalRoleFromWizardSlot("outfit", "outfit"), "CLOTHING_REFERENCE");
    assert.equal(canonicalRoleFromWizardSlot("source_image", "source_image"), "IDENTITY_REFERENCE");
    assert.equal(canonicalRoleFromWizardSlot("outfit_reference", "outfit_reference"), "CLOTHING_REFERENCE");
    assert.equal(canonicalRoleFromWizardSlot("logo", "logo"), "LOGO_REFERENCE");
    assert.equal(canonicalRoleFromWizardSlot("background", "background"), "LOCATION_REFERENCE");
    assert.equal(canonicalRoleFromWizardSlot("product", "product"), "PRODUCT_REFERENCE");
  });

  it("keeps clothing negative-transfer from importing identity", () => {
    const rule = negativeTransferForRole("CLOTHING_REFERENCE");
    assert.ok(rule.transfer.includes("clothing"));
    assert.ok(rule.doNotTransfer.includes("face"));
    assert.ok(rule.doNotTransfer.includes("identity"));
    assert.ok(rule.doNotTransfer.includes("pose"));
    assert.ok(rule.doNotTransfer.includes("background"));
  });
});

describe("S2B.1 outfit mapping", () => {
  it("treats person as BASE and outfit as CLOTHING_REFERENCE", () => {
    const intent = mapOutfitWizardToTransformationIntent({ slots: personOutfitSlots });
    assert.equal(intent.operation, "CLOTHING_TRANSFER");
    assert.equal(intent.family, "OUTFIT");
    assert.equal(intent.baseAsset?.role, "BASE");
    assert.equal(intent.baseAsset?.sourceSlotId, "person");
    assert.ok(intent.baseAsset?.pointer && !intent.baseAsset.pointer.includes("sig="));
    const clothing = intent.references.find((r) => r.role === "CLOTHING_REFERENCE");
    assert.ok(clothing);
    assert.equal(clothing?.sourceSlotId, "outfit");
    assert.ok(intent.changeTargets.includes("clothing") || intent.changeTargets.includes("clothing.outerwear"));
    assert.ok(intent.protectedTargets.some((p) => p.property.includes("face") && p.level === "MUST_PRESERVE"));
    assert.ok(
      intent.protectedTargets.some(
        (p) => p.property.includes("reference person face") && p.level === "MUST_NOT_IMPORT_FROM_REFERENCE"
      )
    );
    assert.ok(intent.negativeTransferRules.some((r) => r.referenceRole === "CLOTHING_REFERENCE"));
  });

  it("routes clothing to masked multi-ref when a clothing mask exists", () => {
    const intent = mapOutfitWizardToTransformationIntent({
      slots: [
        ...personOutfitSlots,
        {
          slotId: "outfit",
          role: "outfit",
          url: "https://cdn.example/jacket.jpg",
          maskPointer: "https://cdn.example/clothing-mask.png",
          required: true,
        },
      ],
    });
    const { plan, trace } = routeImageTransformation(intent, CAPS);
    assert.equal(plan.requestedRoute, "MASKED_MULTI_REFERENCE_EDIT");
    assert.equal(plan.actualRoute, "MASKED_MULTI_REFERENCE_EDIT");
    assert.equal(plan.downgradeReason, null);
    assert.deepEqual(plan.needsMask, ["CLOTHING_REGION"]);
    assert.equal(trace.actualRoute, "MASKED_MULTI_REFERENCE_EDIT");
    assert.ok(plan.references.some((r) => r.role === "CLOTHING_REFERENCE"));
  });

  it("downgrades clothing to Fusion/multi-ref when no mask, never silent T2I", () => {
    const intent = mapFusionWizardToTransformationIntent({
      intentId: "outfit_from_reference",
      slots: personOutfitSlots,
    });
    const { plan } = routeImageTransformation(intent, CAPS);
    assert.equal(plan.requestedRoute, "MASKED_MULTI_REFERENCE_EDIT");
    assert.equal(plan.actualRoute, "FUSION");
    assert.equal(plan.downgradeReason, "clothing mask unavailable");
    assert.ok(plan.protectionLost.includes("region-level clothing isolation"));
    assert.notEqual(plan.actualRoute, "TEXT_TO_IMAGE");
    assert.ok(plan.promptPolicy.includes("DO_NOT_IMPORT_REFERENCE_IDENTITY"));
    assert.ok(plan.qaHooks.includes("identity preservation"));
  });

  it("returns MISSING_REQUIRED_REFERENCE when outfit image is absent", () => {
    const intent = mapOutfitWizardToTransformationIntent({
      slots: [personOutfitSlots[0]!],
    });
    const { plan } = routeImageTransformation(intent, CAPS);
    assert.equal(plan.status, "missing_required_reference");
    assert.equal(plan.actualRoute, null);
    assert.equal(plan.downgradeReason, "MISSING_REQUIRED_REFERENCE");
    assert.ok(plan.missingRequired.includes("CLOTHING_REFERENCE"));
  });

  it("maps IDENTITY_OUTFIT experience slots into the same contract", () => {
    const intent = mapProductExperienceToTransformationIntent({
      experienceId: "IDENTITY_OUTFIT",
      slots: [
        { slotId: "source_image", role: "source_image", url: "https://cdn.example/me.jpg", required: true },
        { slotId: "outfit_reference", role: "outfit_reference", url: "https://cdn.example/look.jpg", required: true },
      ],
    });
    assert.equal(intent.operation, "CLOTHING_TRANSFER");
    assert.equal(intent.baseAsset?.role, "BASE");
    assert.ok(intent.references.some((r) => r.role === "CLOTHING_REFERENCE"));
    const { plan } = routeImageTransformation(intent, CAPS);
    assert.ok(plan.references.some((r) => r.role === "CLOTHING_REFERENCE"));
    assert.notEqual(plan.actualRoute, "TEXT_TO_IMAGE");
  });
});

describe("S2B.1 red carpet mapping", () => {
  it("maps motion preset red_carpet_moment from structured id", () => {
    const intent = mapMotionPresetToTransformationIntent({
      presetId: "red_carpet_moment",
      slots: [
        {
          slotId: "person_character",
          role: "character",
          url: "https://cdn.example/me.jpg",
          required: true,
        },
      ],
    });
    assert.equal(intent.operation, "LOCATION_TRANSFER");
    assert.equal(intent.family, "RED_CARPET_CELEBRITY");
    assert.equal(intent.baseAsset?.role, "BASE");
    assert.equal(intent.styleIntent, "celebrity cinematic");
    assert.ok((intent.compositionIntent ?? "").includes("red carpet"));
    const { plan } = routeImageTransformation(intent, CAPS);
    assert.ok(plan.motionHints.includes("walk"));
    assert.ok(plan.motionHints.includes("pose"));
    assert.ok(plan.protectionPolicy.some((p) => p.level === "MUST_PRESERVE"));
    assert.notEqual(plan.actualRoute, "TEXT_TO_IMAGE");
  });

  it("maps PEOPLE_RED_CARPET experience without duplicating wizard questions", () => {
    const intent = mapProductExperienceToTransformationIntent({
      experienceId: "PEOPLE_RED_CARPET",
      slots: [
        { slotId: "source_image", role: "source_image", url: "https://cdn.example/me.jpg", required: true },
      ],
    });
    assert.equal(intent.family, "RED_CARPET_CELEBRITY");
    assert.equal(intent.operation, "LOCATION_TRANSFER");
    assert.equal(intent.baseAsset?.role, "BASE");
  });
});

describe("S2B.1 product / logo mapping", () => {
  it("prefers pixel composite for logo preserve", () => {
    const intent = mapProductExperienceToTransformationIntent({
      experienceId: "BUSINESS_LOGO_PLACEMENT",
      slots: [
        { slotId: "source_image", role: "source_image", url: "https://cdn.example/scene.jpg", required: true },
        { slotId: "logo", role: "logo", url: "https://cdn.example/logo.png", required: true },
      ],
    });
    assert.equal(intent.operation, "LOGO_PRESERVE");
    assert.ok(intent.references.some((r) => r.role === "LOGO_REFERENCE" && r.exactness === "MUST_PRESERVE"));
    const { plan } = routeImageTransformation(intent, CAPS);
    assert.equal(plan.requestedRoute, "PIXEL_COMPOSITE");
    assert.equal(plan.actualRoute, "PIXEL_COMPOSITE");
    assert.ok(plan.postProcess.includes("PIXEL_COMPOSITE"));
    assert.ok(plan.qaHooks.includes("exact logo preservation"));
  });

  it("does not choose generative redraw when pixel composite is available", () => {
    const intent = mapFusionWizardToTransformationIntent({
      intentId: "product_branding",
      slots: [
        { slotId: "product", role: "product", url: "https://cdn.example/box.jpg", required: true },
        { slotId: "logo", role: "logo", url: "https://cdn.example/logo.png", required: false },
      ],
    });
    const { plan } = routeImageTransformation(intent, CAPS);
    assert.equal(plan.actualRoute, "PIXEL_COMPOSITE");
    assert.notEqual(plan.actualRoute, "TEXT_TO_IMAGE");
  });
});

describe("S2B.1 scene rerender mapping", () => {
  it("uses the approved still as BASE and UPC as truth, not fresh T2I", () => {
    const amina = studioCharacterListItem({
      id: "char-a",
      name: "Amina",
      referenceImageUrl: "https://cdn.example/amina.jpg",
    });
    const bakery = studioLocationListItem({
      id: "loc-bakery",
      name: "Harbor Bakery",
      referenceImageUrl: "https://cdn.example/bakery.jpg",
    });
    const box = studioPropListItem({
      id: "prop-box",
      name: "red box",
      category: "packaging",
      referenceImageUrl: "https://cdn.example/box.jpg",
    });
    const upc = resolveUnifiedProductionContext({
      storyboard: studioStoryboardDetail({
        id: "sb-s2b1",
        title: "S2B.1 rerender",
        scenes: [
          studioSceneDetail({
            id: "scene-4",
            order: 0,
            storyboardId: "sb-s2b1",
            location: bakery,
            locationId: bakery.id,
            characters: [amina],
            props: [box],
          }),
        ],
      }),
      worlds: [
        studioWorldProfileListItem({
          id: "world-1",
          name: "Stylized Kitchen World",
          visualStyle: "warm stylized 3D",
        }),
      ],
      source: "workspace",
    });
    const intent = mapSceneRerenderToTransformationIntent({
      approvedStill: { id: "still-approved", url: "https://cdn.example/approved.jpg?token=secret" },
      upc,
      sceneId: "scene-4",
      changeTargets: ["expression"],
    });
    assert.equal(intent.operation, "SCENE_RERENDER");
    assert.equal(intent.baseAsset?.assetId, "still-approved");
    assert.equal(intent.baseAsset?.role, "BASE");
    assert.ok(intent.baseAsset?.pointer && !intent.baseAsset.pointer.includes("token="));
    assert.equal(intent.upcHash, upc.upcHash);
    assert.ok(intent.references.some((r) => r.role === "IDENTITY_REFERENCE"));
    assert.deepEqual(intent.changeTargets, ["expression"]);
    const { plan } = routeImageTransformation(intent, CAPS);
    assert.notEqual(plan.actualRoute, "TEXT_TO_IMAGE");
    assert.ok(plan.actualRoute === "BASE_IMAGE_EDIT" || plan.actualRoute === "MULTI_REFERENCE_EDIT");
    assert.ok(plan.promptPolicy.includes("DELTA_ONLY"));
  });
});

describe("S2B.1 expression / pose / location", () => {
  it("maps expression to base edit and protects identity", () => {
    const intent = mapMorphActionToTransformationIntent({
      morphId: "expression_change",
      slots: [{ slotId: "person", role: "person", url: "https://cdn.example/me.jpg", required: true }],
    });
    assert.equal(intent.operation, "EXPRESSION_CHANGE");
    assert.ok(intent.changeTargets.includes("expression"));
    const { plan } = routeImageTransformation(intent, CAPS);
    assert.equal(plan.actualRoute, "BASE_IMAGE_EDIT");
    assert.notEqual(plan.actualRoute, "TEXT_TO_IMAGE");
  });

  it("marks pose change as high drift", () => {
    const intent = mapEditorInstructionToTransformationIntent({
      action: "change_pose",
      base: { slotId: "person", role: "person", url: "https://cdn.example/me.jpg", required: true },
    });
    const { plan } = routeImageTransformation(intent, CAPS);
    assert.equal(plan.providerDriftRisk, "HIGH");
  });

  it("maps location transfer with person BASE", () => {
    const intent = mapFusionWizardToTransformationIntent({
      intentId: "person_background",
      slots: [
        { slotId: "person", role: "person", url: "https://cdn.example/me.jpg", required: true },
        { slotId: "background", role: "background", url: "https://cdn.example/paris.jpg", required: false },
      ],
    });
    assert.equal(intent.operation, "LOCATION_TRANSFER");
    assert.equal(intent.baseAsset?.sourceSlotId, "person");
    assert.ok(intent.references.some((r) => r.role === "LOCATION_REFERENCE"));
    const { plan } = routeImageTransformation(intent, CAPS);
    assert.ok(plan.actualRoute === "FUSION" || plan.actualRoute === "MULTI_REFERENCE_EDIT");
  });
});

describe("S2B.1 multi-character and reference budget", () => {
  it("assigns explicit identity roles and never silently drops the main character", () => {
    const intent = mapFusionWizardToTransformationIntent({
      intentId: "character_fusion",
      slots: [
        { slotId: "character_a", role: "character", url: "https://cdn.example/a.jpg", required: true },
        { slotId: "character_b", role: "character", url: "https://cdn.example/b.jpg", required: true },
      ],
    });
    assert.equal(intent.operation, "MULTI_CHARACTER_COMPOSITION");
    assert.equal(intent.baseAsset?.sourceSlotId, "character_a");
    assert.ok(intent.references.some((r) => r.role === "IDENTITY_REFERENCE" && r.sourceSlotId === "character_b"));
    const { plan } = routeImageTransformation(intent, { ...CAPS, maxReferenceImages: 1 });
    assert.ok(plan.references.some((r) => r.role === "IDENTITY_REFERENCE") || plan.base?.sourceSlotId === "character_a");
    assert.equal(plan.compositeReferenceRecommended, true);
  });

  it("prioritizes commercial refs product/logo first", () => {
    const intent = mapSceneRerenderToTransformationIntent({
      approvedStill: { id: "still-1", url: "https://cdn.example/still.jpg" },
      extraRefs: [
        { slotId: "style", role: "style", url: "https://cdn.example/style.jpg", required: false },
        { slotId: "logo", role: "logo", url: "https://cdn.example/logo.png", required: true },
        { slotId: "person", role: "person", url: "https://cdn.example/me.jpg", required: false },
      ],
    });
    intent.operation = "LOGO_PRESERVE";
    const { plan } = routeImageTransformation(intent, { ...CAPS, maxReferenceImages: 1 });
    assert.equal(plan.references[0]?.role, "LOGO_REFERENCE");
  });
});

describe("S2B.1 NL/EN structured parity and legacy", () => {
  it("routes the same structured preset id regardless of language labels", () => {
    const en = mapMotionPresetToTransformationIntent({
      presetId: "red_carpet_moment",
      slots: [{ slotId: "person_character", role: "person", url: "https://cdn.example/me.jpg", required: true }],
    });
    const nl = mapMotionPresetToTransformationIntent({
      presetId: "red_carpet_moment",
      slots: [{ slotId: "person_character", role: "person", url: "https://cdn.example/ik.jpg", required: true }],
    });
    assert.equal(en.operation, nl.operation);
    assert.equal(en.family, nl.family);
    const enPlan = routeImageTransformation(en, CAPS).plan;
    const nlPlan = routeImageTransformation(nl, CAPS).plan;
    assert.equal(enPlan.requestedRoute, nlPlan.requestedRoute);
    assert.equal(enPlan.actualRoute, nlPlan.actualRoute);
  });

  it("does not route from prompt keywords", () => {
    const byId = mapProductExperienceToTransformationIntent({
      experienceId: "IDENTITY_OUTFIT",
      slots: personOutfitSlots,
    });
    assert.equal(byId.operation, "CLOTHING_TRANSFER");
    assert.notEqual(byId.sourcePreset, "rode loper");
  });

  it("infers safest legacy intent and traces origin LEGACY", () => {
    const intent = mapLegacyToTransformationIntent({
      slots: [{ slotId: "base", role: "object", url: "https://cdn.example/old.jpg", required: true }],
      hint: "old-project",
    });
    assert.equal(intent.origin, "LEGACY");
    const { plan, trace } = routeImageTransformation(intent, CAPS);
    assert.equal(plan.status, "legacy_inferred");
    assert.equal(trace.origin, "LEGACY");
    assert.ok(plan.actualRoute);
  });
});

describe("S2B.1 inventory and coverage", () => {
  it("inventories current fusion wizards from catalog code", () => {
    const rows = inventoryFusionWizards();
    assert.equal(rows.length, EDITOR_FUSION_INTENT_DEFINITIONS.length);
    assert.ok(rows.some((r) => r.id === "fusion:outfit_from_reference"));
    const outfit = rows.find((r) => r.id === "fusion:outfit_from_reference");
    assert.equal(outfit?.family, "OUTFIT");
    assert.equal(outfit?.baseIdentified, true);
    assert.equal(outfit?.roleMapped, true);
  });

  it("covers preset families including product experiences and motion presets", () => {
    const rows = buildTransformationCoverageMatrix();
    const summary = coverageSummary(rows);
    assert.ok(summary.total >= EDITOR_FUSION_INTENT_DEFINITIONS.length + STUDIO_PRODUCT_EXPERIENCE_IDS.length);
    assert.ok(rows.some((r) => r.id === "experience:IDENTITY_OUTFIT"));
    assert.ok(rows.some((r) => r.id === "experience:PEOPLE_RED_CARPET"));
    assert.ok(rows.some((r) => r.id === "experience:BUSINESS_LOGO_PLACEMENT"));
    assert.ok(rows.some((r) => r.id === "motion:red_carpet_moment"));
    assert.ok(rows.some((r) => r.id === "scene_rerender"));
    assert.ok(getAllMotionActionPresets().length > 0);
    assert.ok(summary.byFamily.OUTFIT >= 1);
    assert.ok(summary.byFamily.RED_CARPET_CELEBRITY >= 1);
    assert.ok(!rows.some((r) => r.status === "BLOCKED" && r.id === "fusion:outfit_from_reference"));
  });
});
