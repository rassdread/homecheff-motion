import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildIdentityProfileRecommendation,
  buildIdentityProfileRules,
  formatCreativityWeightPercent,
  formatIdentityWeightPercent,
  mapVisionObjectTypeToIdentityAssetType,
  resolveIdentityImportanceLabel,
  resolveIdentityProfileRecommendationReason,
  resolveVariantFidelityThresholdsForProfile,
  seedIdentityProfileFromVision,
  suggestIdentityProfileLevel,
} from "@/lib/studio-asset-identity-profile";
import { IDENTITY_PROFILE_LEVELS } from "@/types/studio-asset-identity-profile";
import { emptyAssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import { recordWizardSourceReference } from "@/lib/studio-asset-wizard-source-reference";
import { mapVisionJsonToAnalysis } from "@/lib/studio-asset-vision-analysis";
import { wizardStepSequenceForDraft } from "@/lib/studio-asset-wizard-flow";

describe("studio-asset-identity-profile", () => {
  it("maps vision object types to universal identity asset types", () => {
    assert.equal(mapVisionObjectTypeToIdentityAssetType("mascot"), "mascot");
    assert.equal(mapVisionObjectTypeToIdentityAssetType("logo"), "logo");
    assert.equal(mapVisionObjectTypeToIdentityAssetType("packaging"), "packaging");
    assert.equal(mapVisionObjectTypeToIdentityAssetType("environment"), "world");
    assert.equal(mapVisionObjectTypeToIdentityAssetType("human"), "person");
  });

  it("suggests profile levels from asset type", () => {
    assert.equal(suggestIdentityProfileLevel("character"), "strict");
    assert.equal(suggestIdentityProfileLevel("logo"), "brand_lock");
    assert.equal(suggestIdentityProfileLevel("location"), "balanced");
    assert.equal(
      suggestIdentityProfileLevel(
        "mascot",
        mapVisionJsonToAnalysis(
          {
            objectType: "Mascot",
            brandIdentity: "HomeCheff Globe Mascot",
            assetFamily: "HomeCheff Mascots",
            suggestedPreserve: [],
            suggestedChange: [],
            suggestedForbidden: [],
            confidence: 0.9,
          },
          { sourceName: "Globe Man" }
        )
      ),
      "master_character"
    );
  });

  it("builds stricter preserve/forbidden rules for brand lock", () => {
    const relaxed = buildIdentityProfileRules({
      assetType: "logo",
      profileLevel: "relaxed",
    });
    const brandLock = buildIdentityProfileRules({
      assetType: "logo",
      profileLevel: "brand_lock",
    });
    assert.ok(brandLock.preserve.length >= relaxed.preserve.length);
    assert.ok(brandLock.forbidden.some((r) => /brand break|logo removal/i.test(r)));
  });

  it("seeds wizard draft from vision analysis", () => {
    let draft = emptyAssetWizardDraft("character", "image_only");
    draft = {
      ...draft,
      ...recordWizardSourceReference({
        imageUrl: "https://example.com/globe.png",
        storageKey: "globe",
        name: "Globe Man",
      }),
      sourceVisionAnalysis: mapVisionJsonToAnalysis(
        {
          objectType: "Mascot",
          visualStyle: "Flat cartoon",
          brandIdentity: "HomeCheff Globe Mascot",
          assetFamily: "HomeCheff Mascots",
          suggestedPreserve: ["face"],
          suggestedChange: ["outfit"],
          suggestedForbidden: ["style break"],
          confidence: 0.9,
        },
        { sourceName: "Globe Man" }
      ),
      sourceVisionAnalysisStatus: "ready",
    };
    const patch = seedIdentityProfileFromVision(draft);
    assert.equal(patch.identityAssetType, "mascot");
    assert.equal(patch.identityProfileLevel, "master_character");
    assert.ok(patch.sourceTransformPreserve?.includes("face"));
    assert.equal(resolveIdentityImportanceLabel(patch.identityProfileLevel!), "critical");
  });

  it("builds distinct rules per profile level for the same asset type", () => {
    const mascotVision = mapVisionJsonToAnalysis(
      {
        objectType: "Mascot",
        brandIdentity: "HomeCheff Globe Mascot",
        assetFamily: "HomeCheff Mascots",
        suggestedPreserve: [],
        suggestedChange: [],
        suggestedForbidden: [],
        confidence: 0.9,
      },
      { sourceName: "Globe Man" }
    );
    const byLevel = Object.fromEntries(
      IDENTITY_PROFILE_LEVELS.map((level) => [
        level,
        buildIdentityProfileRules({
          assetType: "mascot",
          profileLevel: level,
          vision: mascotVision,
        }),
      ])
    ) as Record<(typeof IDENTITY_PROFILE_LEVELS)[number], ReturnType<typeof buildIdentityProfileRules>>;

    assert.ok(byLevel.relaxed.forbidden.length < byLevel.master_character.forbidden.length);
    assert.ok(byLevel.relaxed.preserve.length <= byLevel.brand_lock.preserve.length);
    assert.ok(byLevel.master_character.preserve.some((r) => /source identity/i.test(r)));
    assert.ok(byLevel.brand_lock.forbidden.some((r) => /logo removal|brand break/i.test(r)));
  });

  it("exposes profile-specific fidelity thresholds", () => {
    const relaxed = resolveVariantFidelityThresholdsForProfile("relaxed");
    const master = resolveVariantFidelityThresholdsForProfile("master_character");
    assert.ok(relaxed.warning < master.warning);
    assert.ok(relaxed.identityFailure < master.identityFailure);
  });

  it("formats preserve and creativity percentages", () => {
    assert.equal(formatIdentityWeightPercent("relaxed"), 30);
    assert.equal(formatCreativityWeightPercent("relaxed"), 80);
    assert.equal(formatIdentityWeightPercent("master_character"), 98);
    assert.equal(formatCreativityWeightPercent("master_character"), 10);
  });

  it("explains mascot recommendation reason", () => {
    const vision = mapVisionJsonToAnalysis(
      {
        objectType: "Mascot",
        brandIdentity: "HomeCheff Globe Mascot",
        assetFamily: "HomeCheff Mascots",
        suggestedPreserve: [],
        suggestedChange: [],
        suggestedForbidden: [],
        confidence: 0.9,
      },
      { sourceName: "Globe Man" }
    );
    const recommendation = buildIdentityProfileRecommendation(vision);
    assert.equal(recommendation.profileLevel, "master_character");
    assert.equal(
      resolveIdentityProfileRecommendationReason(
        recommendation.assetType,
        recommendation.profileLevel,
        vision
      ),
      "master_character_brand_mascot"
    );
  });

  it("keeps asset type independent from profile level", () => {
    const packagingStrict = buildIdentityProfileRules({
      assetType: "packaging",
      profileLevel: "strict",
    });
    const mascotBrandLock = buildIdentityProfileRules({
      assetType: "mascot",
      profileLevel: "brand_lock",
    });
    assert.notEqual(packagingStrict.preserve.join(","), mascotBrandLock.preserve.join(","));
    assert.equal(suggestIdentityProfileLevel("packaging"), "brand_lock");
    assert.equal(suggestIdentityProfileLevel("mascot"), "brand_lock");
  });

  it("inserts identity_profile after asset_vision in image_only flow", () => {
    let draft = emptyAssetWizardDraft("character", "image_only");
    draft = {
      ...draft,
      ...recordWizardSourceReference({
        imageUrl: "https://example.com/globe.png",
        storageKey: "globe",
        name: "Globe Man",
      }),
    };
    const steps = wizardStepSequenceForDraft(draft, { includeKind: false });
    const visionIdx = steps.indexOf("asset_vision");
    const profileIdx = steps.indexOf("identity_profile");
    const transformIdx = steps.indexOf("source_transform");
    assert.ok(visionIdx >= 0);
    assert.equal(profileIdx, visionIdx + 1);
    assert.ok(transformIdx > profileIdx);
  });
});
