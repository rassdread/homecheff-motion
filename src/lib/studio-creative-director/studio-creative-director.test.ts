import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  STUDIO_CREATIVE_DIRECTOR_OWNERSHIP,
  STUDIO_CREATIVE_DIRECTOR_VERSION,
  STUDIO_PRODUCT_EXPERIENCE_IDS,
  STUDIO_PRODUCT_EXPERIENCE_REGISTRY,
  assertUniqueProductExperienceOwnership,
  filterPlannersForMode,
  getModePolicy,
  getProductExperience,
  listProductExperiencesByFamily,
  orchestrateCreativeDirector,
  resolveCreativeExperience,
  resolveProductMode,
} from "@/lib/studio-creative-director";
import { assembleCreativeSpecification } from "@/lib/studio-prompt-matrix/assemble";
import { emptyContinuityBundle } from "@/lib/studio-prompt-matrix/continuity-bundle";

describe("S.6F Creative Director", () => {
  it("exposes version and ownership boundaries", () => {
    assert.equal(STUDIO_CREATIVE_DIRECTOR_VERSION, "6f.1");
    assert.ok(STUDIO_CREATIVE_DIRECTOR_OWNERSHIP.owns.includes("experience_selection"));
    assert.ok(STUDIO_CREATIVE_DIRECTOR_OWNERSHIP.neverOwns.includes("continuity_bundle"));
    assert.ok(STUDIO_CREATIVE_DIRECTOR_OWNERSHIP.neverOwns.includes("prompt_assembly"));
    assert.ok(STUDIO_CREATIVE_DIRECTOR_OWNERSHIP.neverOwns.includes("credits"));
    assert.ok(STUDIO_CREATIVE_DIRECTOR_OWNERSHIP.neverOwns.includes("billing"));
  });

  it("keeps product experience registry unique and complete", () => {
    assert.equal(STUDIO_PRODUCT_EXPERIENCE_IDS.length, 51);
    assert.equal(Object.keys(STUDIO_PRODUCT_EXPERIENCE_REGISTRY).length, 51);
    assert.deepEqual(assertUniqueProductExperienceOwnership(), []);
    for (const id of STUDIO_PRODUCT_EXPERIENCE_IDS) {
      const entry = getProductExperience(id);
      assert.equal(entry.experienceId, id);
      assert.ok(entry.family);
      assert.ok(entry.matrixExperienceId);
    }
  });

  it("assigns every experience to exactly one family", () => {
    const families = ["PEOPLE", "BUSINESS", "SOCIAL", "CREATIVE", "IDENTITY"] as const;
    let total = 0;
    for (const family of families) {
      total += listProductExperiencesByFamily(family).length;
    }
    assert.equal(total, 51);
  });

  it("resolves LinkedIn consumer door", () => {
    const resolved = resolveCreativeExperience({ entryFan: "linkedin_photo" });
    assert.equal(resolved.experienceId, "PEOPLE_LINKEDIN_PHOTO");
    assert.equal(resolved.family, "PEOPLE");
    assert.equal(resolved.matrixExperienceId, "PERSON_BACKGROUND");
    assert.equal(resolved.resolveSource, "entryFan");
  });

  it("resolves restaurant professional door", () => {
    const resolved = resolveCreativeExperience({ doorHint: "restaurant" });
    assert.equal(resolved.experienceId, "BUSINESS_RESTAURANT");
    assert.equal(resolved.matrixExperienceId, "RESTAURANT_PROMO");
  });

  it("implements three product modes architecturally", () => {
    assert.equal(resolveProductMode({}), "QUICK");
    assert.equal(resolveProductMode({ preferProfessional: true }), "PROFESSIONAL");
    assert.equal(resolveProductMode({ preferDirector: true }), "DIRECTOR");
    assert.equal(getModePolicy("QUICK").allowProfessionalTerminology, false);
    assert.equal(getModePolicy("PROFESSIONAL").allowBrandControls, true);
    assert.equal(getModePolicy("DIRECTOR").allowFusionMotionMovieProduction, true);
    assert.ok(getModePolicy("DIRECTOR").defaultPlanners.includes("movie_builder"));
  });

  it("orchestrates Quick LinkedIn without owning Continuity or prompts", () => {
    const result = orchestrateCreativeDirector({
      entryFan: "linkedin_photo",
      mode: "QUICK",
      answers: {
        businessStyle: "corporate",
        background: "office",
        smile: "soft",
        suit: "navy",
      },
    });
    assert.equal(result.mode, "QUICK");
    assert.equal(result.experience.experienceId, "PEOPLE_LINKEDIN_PHOTO");
    assert.equal(result.handoff.requiresContinuityBundle, true);
    assert.equal(result.handoff.matrixExperienceId, "PERSON_BACKGROUND");
    assert.equal(result.handoff.detailLevel, "QUICK");
    assert.ok(result.plan.matrixSelections.styleProfile);
    assert.equal(result.handoff.delegatedSystems.credits, "credits_unchanged");
    assert.equal(result.handoff.delegatedSystems.billing, "billing_unchanged");
    assert.ok(!STUDIO_CREATIVE_DIRECTOR_OWNERSHIP.owns.includes("continuity_bundle"));
  });

  it("orchestrates Professional restaurant with brand/platform intent", () => {
    const result = orchestrateCreativeDirector({
      experienceId: "BUSINESS_RESTAURANT",
      mode: "PROFESSIONAL",
      answers: {
        logo: true,
        brandColors: "warm_red",
        audience: "local_diners",
        platform: "instagram",
        commercialTone: "appetizing",
      },
    });
    assert.equal(result.experience.matrixExperienceId, "RESTAURANT_PROMO");
    assert.equal(result.plan.intent.platform, "instagram");
    assert.ok(result.plan.intent.qualityNotes.some((n) => n.includes("logo")));
    assert.ok(result.recommendedPlanners.length > 0);
  });

  it("orchestrates Director storyboard with full planner access", () => {
    const result = orchestrateCreativeDirector({
      experienceId: "CREATIVE_STORYBOARD",
      mode: "DIRECTOR",
    });
    assert.equal(result.modePolicy.allowSceneShotPlanning, true);
    assert.ok(result.recommendedPlanners.includes("movie_builder") || result.modePolicy.defaultPlanners.includes("movie_builder"));
    assert.ok(result.plan.workflowSteps.includes("link_characters_locations_props_worlds"));
  });

  it("filters Quick planners away from movie builder", () => {
    const filtered = filterPlannersForMode(
      ["movie_builder", "fusion_intelligence", "animation_planner"],
      "QUICK"
    );
    assert.ok(!filtered.includes("movie_builder"));
    assert.ok(filtered.includes("fusion_intelligence"));
  });

  it("hands Matrix selections into assemble without rewriting Continuity", () => {
    const orchestration = orchestrateCreativeDirector({
      entryFan: "food_promo",
      mode: "PROFESSIONAL",
      answers: { platform: "instagram", energy: "high" },
    });
    const continuity = emptyContinuityBundle();
    const spec = assembleCreativeSpecification({
      experienceId: orchestration.handoff.matrixExperienceId,
      continuity,
      selections: orchestration.handoff.selections,
      detailLevel: orchestration.handoff.detailLevel,
    });
    assert.equal(spec.experience, "FOOD_PROMO");
    assert.equal(spec.platform, "instagram");
    assert.equal(spec.detailLevel, "PROFESSIONAL");
  });

  it("keeps MISSING packs honest (dating / memorial)", () => {
    const dating = orchestrateCreativeDirector({
      experienceId: "PEOPLE_DATING_PROFILE",
      mode: "QUICK",
    });
    assert.equal(dating.experience.status, "MISSING");
    assert.ok(dating.plan.intent.qualityNotes.includes("experience_pack_not_implemented"));
  });
});
