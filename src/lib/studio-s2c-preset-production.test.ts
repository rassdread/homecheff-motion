/**
 * S2C — Universal Preset/Wizard → Canonical Studio Production Integration tests.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONTINUE_IN_STUDIO_COPY,
  resolveContinueInStudioDestination,
  shouldShowContinueInStudio,
} from "@/lib/studio-continue-in-studio";
import {
  buildPresetLifecycleCoverageMatrix,
  classifyExperiencePackLifecycle,
  classifyFusionWizardLifecycle,
  classifyMotionPresetLifecycle,
  classifyMorphActionLifecycle,
  classifyPresetSource,
  presetLifecycleCoverageSummary,
} from "@/lib/studio-preset-lifecycle";
import {
  createInMemoryMaterializationAdapters,
  materializePresetIntoStudioProjectWithAdapters,
} from "@/lib/studio-preset-materialization-execute";
import { planPresetMaterialization } from "@/lib/studio-preset-materialization-plan";
import {
  buildPresetProductionContext,
  continuationSupported,
  shouldMaterializeNow,
  studioWorkspaceHrefForStoryboard,
} from "@/lib/studio-preset-production-context";
import { resolveUnifiedProductionContext } from "@/lib/studio-unified-production-context";
import {
  studioCharacterListItem,
  studioLocationListItem,
  studioPropListItem,
  studioSceneDetail,
  studioStoryboardDetail,
} from "@/test/studio-api-fixtures";

describe("S2C lifecycle classification", () => {
  it("classifies red carpet / outfit / logo / commercial / story / social / motion / image", () => {
    assert.equal(classifyExperiencePackLifecycle("PEOPLE_RED_CARPET").lifecycleClass, "QUICK_WITH_CONTINUE");
    assert.equal(classifyExperiencePackLifecycle("IDENTITY_OUTFIT").lifecycleClass, "IMAGE_ONLY");
    assert.equal(classifyExperiencePackLifecycle("BUSINESS_LOGO_PLACEMENT").lifecycleClass, "IMAGE_ONLY");
    assert.equal(classifyExperiencePackLifecycle("BUSINESS_PRODUCT").lifecycleClass, "CANONICAL_SINGLE_SCENE");
    assert.equal(classifyExperiencePackLifecycle("BUSINESS_COMMERCIAL").lifecycleClass, "CANONICAL_SINGLE_SCENE");
    assert.equal(classifyExperiencePackLifecycle("CREATIVE_FILM").lifecycleClass, "ADVANCED_STORY");
    assert.equal(classifyExperiencePackLifecycle("CREATIVE_STORYBOARD").lifecycleClass, "ADVANCED_STORY");
    assert.equal(classifyExperiencePackLifecycle("SOCIAL_TIKTOK").lifecycleClass, "QUICK_ONE_SHOT");
    assert.equal(classifyExperiencePackLifecycle("IDENTITY_CHARACTER").lifecycleClass, "CANONICAL_SINGLE_SCENE");
    assert.equal(classifyExperiencePackLifecycle("IDENTITY_PERSON_BACKGROUND").lifecycleClass, "IMAGE_ONLY");

    assert.equal(classifyMotionPresetLifecycle("red_carpet_moment").lifecycleClass, "QUICK_WITH_CONTINUE");
    assert.equal(classifyMotionPresetLifecycle("moonwalk").lifecycleClass, "MOTION_ONLY");
    assert.equal(classifyMotionPresetLifecycle("product_launch").lifecycleClass, "CANONICAL_MULTI_SCENE");

    assert.equal(classifyFusionWizardLifecycle("outfit_from_reference").lifecycleClass, "IMAGE_ONLY");
    assert.equal(classifyFusionWizardLifecycle("person_background").lifecycleClass, "IMAGE_ONLY");
    assert.equal(classifyFusionWizardLifecycle("product_branding").lifecycleClass, "IMAGE_ONLY");

    assert.equal(classifyMorphActionLifecycle("outfit_change").lifecycleClass, "IMAGE_ONLY");
    assert.equal(classifyMorphActionLifecycle("human_to_cartoon").lifecycleClass, "QUICK_ONE_SHOT");
  });

  it("covers every registry row with a lifecycle class", () => {
    const rows = buildPresetLifecycleCoverageMatrix();
    const summary = presetLifecycleCoverageSummary(rows);
    assert.ok(summary.total >= 100, `expected broad coverage, got ${summary.total}`);
    for (const row of rows) {
      assert.ok(row.lifecycleClass, row.id);
      assert.ok(row.status, row.id);
    }
  });
});

describe("S2C PresetProductionContext", () => {
  it("builds red carpet context with transform intent + audio hints", () => {
    const ctx = buildPresetProductionContext({
      sourceType: "EXPERIENCE_PACK",
      sourceId: "PEOPLE_RED_CARPET",
      assets: [
        {
          role: "person",
          assetId: "person-1",
          url: "https://cdn.example/person.jpg",
          pointer: "ptr-person-1",
        },
        {
          role: "outfit",
          assetId: "outfit-1",
          url: "https://cdn.example/outfit.jpg",
          pointer: "ptr-outfit-1",
        },
      ],
      returnUrl: "/homecheff/item/1",
      homecheffItemId: "item-1",
    });
    assert.equal(ctx.lifecycleClass, "QUICK_WITH_CONTINUE");
    assert.equal(ctx.continuationSupported, true);
    assert.ok(ctx.transformationIntent);
    assert.ok(ctx.audioHints.sfxSuggestions?.includes("camera_flash"));
    assert.equal(ctx.origin.returnUrl, "/homecheff/item/1");
    assert.equal(ctx.origin.homecheffItemId, "item-1");
    assert.equal(shouldMaterializeNow(ctx), false);
    assert.equal(continuationSupported(ctx), true);
  });

  it("builds commercial product context for immediate single-scene materialization", () => {
    const ctx = buildPresetProductionContext({
      sourceType: "EXPERIENCE_PACK",
      sourceId: "BUSINESS_PRODUCT",
      assets: [
        { role: "product", assetId: "p1", url: "https://cdn.example/product.png", pointer: "ptr-p" },
        { role: "logo", assetId: "l1", url: "https://cdn.example/logo.png", pointer: "ptr-l", exactness: "MUST_PRESERVE" },
        { role: "person", assetId: "h1", url: "https://cdn.example/host.jpg", pointer: "ptr-h" },
        { role: "location", assetId: "loc1", url: "https://cdn.example/store.jpg", pointer: "ptr-loc" },
      ],
    });
    assert.equal(ctx.lifecycleClass, "CANONICAL_SINGLE_SCENE");
    assert.equal(shouldMaterializeNow(ctx), true);
    assert.ok(ctx.transformationIntent);
  });
});

describe("S2C materialization", () => {
  it("red carpet Continue in Studio preserves person/outfit/result and is idempotent", async () => {
    const ctx = buildPresetProductionContext({
      sourceType: "MOTION_PRESET",
      sourceId: "red_carpet_moment",
      displayTitle: "Rode loper",
      assets: [
        { role: "person", assetId: "person-1", url: "https://cdn.example/person.jpg", pointer: "ptr-person" },
        { role: "outfit", assetId: "outfit-1", url: "https://cdn.example/gown.jpg", pointer: "ptr-outfit" },
        { role: "location", assetId: "loc-1", url: "https://cdn.example/carpet.jpg", pointer: "ptr-loc" },
        { role: "result_still", assetId: "still-1", url: "https://cdn.example/result.jpg", pointer: "ptr-still" },
        { role: "result_video", assetId: "vid-1", url: "https://cdn.example/result.mp4", pointer: "ptr-vid" },
      ],
      sourceQuickProjectId: "quick-rc-1",
    });

    const { adapters } = createInMemoryMaterializationAdapters();
    const first = await materializePresetIntoStudioProjectWithAdapters("user-1", ctx, adapters);
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.equal(first.reused, false);
    assert.equal(first.providerCalls, 0);
    assert.equal(first.creditsDebited, 0);
    assert.equal(first.plan.characters.length, 1);
    assert.equal(first.plan.locations.length, 1);
    assert.ok(first.plan.characters[0].defaultClothing === "" || first.plan.characters[0].referenceNotes.includes("outfit"));
    assert.ok(first.record.resultAssetIds.length >= 1);
    assert.ok(first.workspaceHref.includes(first.storyboardId));
    assert.ok(first.plan.metadata.transformationIntent);
    assert.ok(first.plan.musicEnabled || first.plan.soundEnabled);

    const second = await materializePresetIntoStudioProjectWithAdapters("user-1", ctx, adapters);
    assert.equal(second.ok, true);
    if (!second.ok) return;
    assert.equal(second.reused, true);
    assert.equal(second.storyboardId, first.storyboardId);
    assert.equal(second.providerCalls, 0);
    assert.equal(second.creditsDebited, 0);
  });

  it("product commercial materializes product MUST_PRESERVE + logo brand_asset + person + location", async () => {
    const ctx = buildPresetProductionContext({
      sourceType: "EXPERIENCE_PACK",
      sourceId: "BUSINESS_COMMERCIAL",
      displayTitle: "Productvideo",
      assets: [
        { role: "product", assetId: "prod", url: "https://cdn.example/prod.png", pointer: "ptr-prod" },
        { role: "logo", assetId: "logo", url: "https://cdn.example/logo.png", pointer: "ptr-logo", exactness: "MUST_PRESERVE" },
        { role: "person", assetId: "host", url: "https://cdn.example/host.jpg", pointer: "ptr-host" },
        { role: "location", assetId: "loc", url: "https://cdn.example/loc.jpg", pointer: "ptr-loc" },
        { role: "result_still", assetId: "still", url: "https://cdn.example/still.jpg", pointer: "ptr-still" },
      ],
    });
    const plan = planPresetMaterialization(ctx);
    assert.equal(plan.status, "READY");
    assert.equal(plan.characters.length, 1);
    assert.equal(plan.locations.length, 1);
    assert.equal(plan.props.filter((p) => p.category === "packaging").length, 1);
    assert.equal(plan.props.filter((p) => p.category === "brand_asset").length, 1);
    assert.ok(plan.props.some((p) => p.brandingRules.includes("MUST_PRESERVE")));
    assert.equal(plan.providerCalls, 0);
    assert.equal(plan.creditsDebited, 0);

    const { adapters } = createInMemoryMaterializationAdapters();
    const result = await materializePresetIntoStudioProjectWithAdapters("user-1", ctx, adapters);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.record.propIds.length, 2);
    assert.equal(result.providerCalls, 0);
  });

  it("story preset preserves multi-scene order", () => {
    const ctx = buildPresetProductionContext({
      sourceType: "EXPERIENCE_PACK",
      sourceId: "CREATIVE_FILM",
      displayTitle: "Film",
    });
    assert.equal(ctx.lifecycleClass, "ADVANCED_STORY");
    const plan = planPresetMaterialization(ctx);
    assert.equal(plan.status, "READY");
    assert.ok(plan.scenes.length >= 2);
    for (let i = 0; i < plan.scenes.length; i++) {
      assert.equal(plan.scenes[i].order, i);
    }
  });

  it("motion-only does not force immediate storyboard; continue can materialize later", () => {
    const ctx = buildPresetProductionContext({
      sourceType: "MOTION_PRESET",
      sourceId: "moonwalk",
      assets: [
        { role: "source_image", assetId: "s1", url: "https://cdn.example/photo.jpg", pointer: "ptr-s" },
        { role: "result_video", assetId: "v1", url: "https://cdn.example/out.mp4", pointer: "ptr-v" },
      ],
    });
    assert.equal(ctx.lifecycleClass, "MOTION_ONLY");
    assert.equal(shouldMaterializeNow(ctx), false);
    assert.equal(continuationSupported(ctx), true);
    const plan = planPresetMaterialization(ctx);
    assert.equal(plan.status, "READY");
  });

  it("outfit continuation keeps same person + clothing state", () => {
    const ctx = buildPresetProductionContext({
      sourceType: "FUSION_WIZARD",
      sourceId: "outfit_from_reference",
      assets: [
        { role: "person", assetId: "person-1", url: "https://cdn.example/person.jpg", pointer: "ptr-p" },
        { role: "outfit", assetId: "outfit-1", url: "https://cdn.example/outfit.jpg", pointer: "ptr-o" },
        { role: "result_still", assetId: "r1", url: "https://cdn.example/dressed.jpg", pointer: "ptr-r" },
      ],
    });
    const plan = planPresetMaterialization(ctx);
    assert.equal(plan.status, "READY");
    assert.equal(plan.characters.length, 1);
    assert.ok(plan.characters[0].referenceNotes.includes("outfit"));
    assert.ok(plan.metadata.transformationIntent);
  });

  it("location continuation links same identity + location", () => {
    const ctx = buildPresetProductionContext({
      sourceType: "FUSION_WIZARD",
      sourceId: "person_background",
      assets: [
        { role: "person", assetId: "person-1", url: "https://cdn.example/person.jpg", pointer: "ptr-p" },
        { role: "location", assetId: "loc-1", url: "https://cdn.example/bg.jpg", pointer: "ptr-l" },
        { role: "result_still", assetId: "r1", url: "https://cdn.example/out.jpg", pointer: "ptr-r" },
      ],
    });
    const plan = planPresetMaterialization(ctx);
    assert.equal(plan.characters.length, 1);
    assert.equal(plan.locations.length, 1);
    assert.equal(plan.scenes[0].locationSourceKey, plan.locations[0].sourceKey);
  });

  it("missing required person returns MATERIALIZATION_MISSING_INPUT without inventing identity", () => {
    const ctx = buildPresetProductionContext({
      sourceType: "EXPERIENCE_PACK",
      sourceId: "PEOPLE_RED_CARPET",
      assets: [],
    });
    const plan = planPresetMaterialization(ctx);
    assert.equal(plan.status, "MISSING_INPUT");
    assert.match(plan.reason, /MATERIALIZATION_MISSING_INPUT/);
    assert.equal(plan.characters.length, 0);
  });

  it("quick one-shot social is skipped (no heavy project)", () => {
    const ctx = buildPresetProductionContext({
      sourceType: "EXPERIENCE_PACK",
      sourceId: "SOCIAL_TIKTOK",
    });
    assert.equal(ctx.lifecycleClass, "QUICK_ONE_SHOT");
    const plan = planPresetMaterialization(ctx);
    assert.equal(plan.status, "SKIPPED_ONE_SHOT");
  });

  it("legacy without result stays unsupported safely", () => {
    const ctx = buildPresetProductionContext({
      sourceType: "LEGACY",
      sourceId: "old_preset_x",
    });
    assert.equal(ctx.lifecycleClass, "LEGACY");
    const plan = planPresetMaterialization(ctx);
    assert.equal(plan.status, "UNSUPPORTED");
  });

  it("no re-upload: assets reused by pointer/url only", () => {
    const ctx = buildPresetProductionContext({
      sourceType: "EXPERIENCE_PACK",
      sourceId: "BUSINESS_PRODUCT",
      assets: [
        { role: "product", assetId: "prod", url: "https://cdn.example/prod.png", pointer: "existing-blob-key" },
      ],
    });
    const plan = planPresetMaterialization(ctx);
    assert.equal(plan.props[0].referenceStorageKey, "existing-blob-key");
    assert.equal(plan.props[0].referenceImageUrl, "https://cdn.example/prod.png");
  });

  it("HomeCheff + returnUrl preserved in metadata", () => {
    const ctx = buildPresetProductionContext({
      sourceType: "EXPERIENCE_PACK",
      sourceId: "BUSINESS_PRODUCT",
      assets: [{ role: "product", assetId: "p", url: "https://cdn.example/p.png", pointer: "k" }],
      returnUrl: "/homecheff/listings/99",
      homecheffItemId: "99",
      homecheffItemType: "listing",
      growthLeadId: "lead-x",
    });
    const plan = planPresetMaterialization(ctx);
    assert.equal(plan.metadata.returnUrl, "/homecheff/listings/99");
    assert.equal(plan.metadata.homecheffItemId, "99");
    assert.equal(plan.metadata.growthLeadId, "lead-x");
  });

  it("UPC resolves after simulated materialization shape", () => {
    const character = studioCharacterListItem({
      id: "char-1",
      name: "Character",
      referenceImageUrl: "https://cdn.example/person.jpg",
    });
    const location = studioLocationListItem({
      id: "loc-1",
      name: "Red carpet",
      category: "street",
      referenceImageUrl: "https://cdn.example/carpet.jpg",
    });
    const logo = studioPropListItem({
      id: "logo-1",
      name: "Logo",
      category: "brand_asset",
      brandingRules: "MUST_PRESERVE",
      referenceImageUrl: "https://cdn.example/logo.png",
    });
    const product = studioPropListItem({
      id: "prod-1",
      name: "Product",
      category: "packaging",
      brandingRules: "MUST_PRESERVE product appearance",
      referenceImageUrl: "https://cdn.example/prod.png",
    });
    const scene = studioSceneDetail({
      id: "scene-0",
      order: 0,
      title: "Hero",
      characters: [character],
      location,
      props: [product, logo],
    });
    const storyboard = studioStoryboardDetail({
      id: "sb-s2c",
      title: "Productvideo",
      scenes: [scene],
    });
    const upc = resolveUnifiedProductionContext({
      storyboard,
      source: "workspace",
      experienceId: "BUSINESS_COMMERCIAL",
    });
    assert.ok(upc.characters.some((c) => c.id === "char-1"));
    assert.ok(upc.locations.some((l) => l.id === "loc-1"));
    assert.ok(upc.props.some((p) => p.kind === "logo"));
    assert.ok(upc.scenes.length >= 1);
  });
});

describe("S2C Continue in Studio UX helpers", () => {
  it("shows continue for quick-with-continue but not inside workspace or one-shot", () => {
    assert.equal(
      shouldShowContinueInStudio({ lifecycleClass: "QUICK_WITH_CONTINUE" }),
      true
    );
    assert.equal(
      shouldShowContinueInStudio({
        lifecycleClass: "QUICK_WITH_CONTINUE",
        alreadyInCanonicalWorkspace: true,
      }),
      false
    );
    assert.equal(shouldShowContinueInStudio({ lifecycleClass: "QUICK_ONE_SHOT" }), false);
    assert.equal(resolveContinueInStudioDestination("ADVANCED_STORY"), "storyboard_workspace");
    assert.equal(resolveContinueInStudioDestination("IMAGE_ONLY"), "image_editor");
    assert.ok(CONTINUE_IN_STUDIO_COPY.nl);
    assert.ok(CONTINUE_IN_STUDIO_COPY.en);
    assert.ok(studioWorkspaceHrefForStoryboard("abc").includes("abc"));
  });

  it("classifyPresetSource covers director / character / homecheff", () => {
    assert.equal(classifyPresetSource({ sourceType: "DIRECTOR", sourceId: "x" }).lifecycleClass, "ADVANCED_STORY");
    assert.equal(
      classifyPresetSource({ sourceType: "CHARACTER_STUDIO", sourceId: "x" }).lifecycleClass,
      "CANONICAL_SINGLE_SCENE"
    );
    assert.equal(
      classifyPresetSource({ sourceType: "HOMECHEFF", sourceId: "x" }).lifecycleClass,
      "QUICK_WITH_CONTINUE"
    );
  });
});
