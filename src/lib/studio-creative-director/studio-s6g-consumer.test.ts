import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  acceptCoachOnExperience,
  applyGuidedAnswer,
  assertUniqueProductExperienceOwnership,
  continueExperience,
  getGuidedQuestionsForPack,
  getProductExperience,
  isPackBlockedFromConsumerGenerate,
  MISSING_PACK_POLICY,
  normalizeConsumerDoor,
  openExperience,
  orchestrateCreativeDirector,
  resolveCreativeExperience,
} from "@/lib/studio-creative-director";
import { emptyContinuityBundle } from "@/lib/studio-prompt-matrix/continuity-bundle";
import { assembleCreativeSpecification } from "@/lib/studio-prompt-matrix/assemble";

describe("S.6G consumer entry & Experience Packs", () => {
  it("keeps unique product experience ownership", () => {
    assert.doesNotThrow(() => assertUniqueProductExperienceOwnership());
  });

  it("normalizes P0 doors to one pack each", () => {
    assert.equal(
      openExperience({ videoIntent: "restaurant_promo" }).orchestration?.experience.experienceId,
      "BUSINESS_RESTAURANT"
    );
    assert.equal(
      openExperience({ instantStyle: "food_promo" }).orchestration?.experience.experienceId,
      "BUSINESS_HOMECHEFF"
    );
    assert.equal(
      openExperience({ entryFan: "clean_business" }).orchestration?.experience.experienceId,
      "PEOPLE_BUSINESS_PORTRAIT"
    );
    assert.equal(
      openExperience({ photoIntent: "animate_photo" }).orchestration?.experience.experienceId,
      "CREATIVE_ANIMATION"
    );
    assert.equal(
      openExperience({ fusionIntent: "outfit_from_reference" }).orchestration?.experience
        .experienceId,
      "IDENTITY_OUTFIT"
    );
    assert.equal(
      openExperience({ characterStudioFlow: "outfit" }).orchestration?.experience.experienceId,
      "IDENTITY_OUTFIT"
    );
    assert.equal(
      openExperience({ motionPreset: "wedding_entrance" }).orchestration?.experience.experienceId,
      "PEOPLE_WEDDING"
    );
    assert.equal(
      openExperience({ motionPreset: "tiktok_trend" }).orchestration?.experience.experienceId,
      "SOCIAL_TIKTOK"
    );
  });

  it("LinkedIn entry goes through Director with PERSON_BACKGROUND", () => {
    const opened = openExperience({
      experienceId: "PEOPLE_LINKEDIN_PHOTO",
      mode: "QUICK",
      answers: {
        businessStyle: "corporate",
        background: "office",
        smile: "soft",
        suit: "navy",
      },
    });
    assert.equal(opened.ok, true);
    assert.equal(opened.orchestration?.handoff.requiresContinuityBundle, true);
    assert.equal(opened.orchestration?.handoff.matrixExperienceId, "PERSON_BACKGROUND");
    assert.equal(opened.continuityStrategy, "fusion_refs");
  });

  it("Restaurant / HomeCheff / Animation / Outfit Director entry", () => {
    for (const [id, matrix] of [
      ["BUSINESS_RESTAURANT", "RESTAURANT_PROMO"],
      ["BUSINESS_HOMECHEFF", "FOOD_PROMO"],
      ["CREATIVE_ANIMATION", "INSTANT_PHOTO_TO_VIDEO"],
      ["IDENTITY_OUTFIT", "OUTFIT_CHANGE"],
    ] as const) {
      const opened = openExperience({ experienceId: id, mode: "QUICK" });
      assert.equal(opened.ok, true, id);
      assert.equal(opened.orchestration?.handoff.matrixExperienceId, matrix);
      assert.ok(opened.nextHref?.includes("fromExperience=1") || opened.nextHref?.includes("experience="));
    }
  });

  it("blocks MISSING packs from consumer generate", () => {
    assert.equal(isPackBlockedFromConsumerGenerate("PEOPLE_DATING_PROFILE"), true);
    assert.equal(MISSING_PACK_POLICY.PEOPLE_DATING_PROFILE, "HIDDEN");
    assert.equal(MISSING_PACK_POLICY.PEOPLE_MEMORIAL, "PRODUCT_DESIGN_REQUIRED");
    const dating = openExperience({ experienceId: "PEOPLE_DATING_PROFILE", mode: "QUICK" });
    assert.equal(dating.blocked, true);
    assert.equal(dating.orchestration, null);
  });

  it("keeps slideshow / photo_story honestly unmapped", () => {
    const slide = openExperience({ videoIntent: "slideshow" });
    assert.equal(slide.blocked, true);
    assert.equal(normalizeConsumerDoor({ videoIntent: "slideshow" }).doorHint, "slideshow");
  });

  it("guided questions change Director answers and Matrix selections", () => {
    const questions = getGuidedQuestionsForPack({
      experienceId: "PEOPLE_LINKEDIN_PHOTO",
      mode: "QUICK",
    });
    assert.ok(questions.length >= 3);
    const q = questions.find((x) => x.id === "smile");
    assert.ok(q);
    const answers = applyGuidedAnswer({}, q!, "natural");
    const before = orchestrateCreativeDirector({
      experienceId: "PEOPLE_LINKEDIN_PHOTO",
      mode: "QUICK",
      answers: {},
    });
    const after = continueExperience({
      experienceId: "PEOPLE_LINKEDIN_PHOTO",
      mode: "QUICK",
      answers,
    });
    assert.notEqual(
      JSON.stringify(before.handoff.selections),
      JSON.stringify(after.orchestration!.handoff.selections)
    );
    assert.equal(after.orchestration!.plan.intent.emotion, "warm_smile");
  });

  it("Coach accept flows through answers, never forced", () => {
    const base = openExperience({ experienceId: "BUSINESS_RESTAURANT", mode: "QUICK" });
    const suggestion = base.orchestration!.coachSuggestions[0]!;
    assert.equal(suggestion.forced, false);
    const { accept, result } = acceptCoachOnExperience({
      experienceId: "BUSINESS_RESTAURANT",
      mode: "QUICK",
      answers: {},
      suggestion,
    });
    assert.equal(accept.applied, true);
    assert.ok(accept.changedKeys.length > 0);
    assert.equal(result.ok, true);
    assert.equal(result.orchestration?.handoff.requiresContinuityBundle, true);
  });

  it("hands Matrix selections into assemble without rewriting Continuity", () => {
    const opened = openExperience({
      experienceId: "BUSINESS_HOMECHEFF",
      mode: "PROFESSIONAL",
      answers: { dish: "pasta", appetite: "closeup", platform: "instagram" },
    });
    const continuity = emptyContinuityBundle();
    const spec = assembleCreativeSpecification({
      experienceId: opened.orchestration!.handoff.matrixExperienceId,
      continuity,
      selections: opened.orchestration!.handoff.selections,
      detailLevel: opened.orchestration!.handoff.detailLevel,
    });
    assert.equal(spec.experience, "FOOD_PROMO");
    assert.equal(spec.platform, "instagram");
  });

  it("Maak cards normalize to packs", () => {
    assert.equal(
      openExperience({ maakCard: "photos" }).orchestration?.experience.experienceId,
      "CREATIVE_ANIMATION"
    );
    assert.equal(
      openExperience({ maakCard: "new_story" }).orchestration?.experience.experienceId,
      "CREATIVE_STORYBOARD"
    );
  });

  it("studio start mapped intents resolve packs", () => {
    const map: Record<string, string> = {
      restaurant_promo: "BUSINESS_RESTAURANT",
      cooking_show: "BUSINESS_COOKING_SHOW",
      social_campaign: "SOCIAL_CAMPAIGN",
      fashion_reel: "BUSINESS_FASHION",
      music_video: "CREATIVE_MUSIC_VIDEO",
      travel_vlog: "CREATIVE_TRAVEL_VLOG",
      product_commercial: "BUSINESS_COMMERCIAL",
      podcast_video: "CREATIVE_PODCAST",
      documentary: "CREATIVE_DOCUMENTARY",
      event_video: "CREATIVE_EVENT_VIDEO",
      presentation_video: "CREATIVE_PRESENTATION",
      brand_story: "BUSINESS_BRANDING",
      company_video: "BUSINESS_CORPORATE",
    };
    for (const [intent, pack] of Object.entries(map)) {
      assert.equal(
        resolveCreativeExperience({ entryFan: intent }).experienceId,
        pack,
        intent
      );
    }
  });

  it("P0 packs expose guided questions", () => {
    for (const id of [
      "BUSINESS_RESTAURANT",
      "BUSINESS_HOMECHEFF",
      "PEOPLE_LINKEDIN_PHOTO",
      "CREATIVE_ANIMATION",
      "IDENTITY_OUTFIT",
    ] as const) {
      const qs = getGuidedQuestionsForPack({ experienceId: id, mode: "QUICK" });
      assert.ok(qs.length >= 1, id);
      assert.ok(getProductExperience(id).matrixExperienceId);
    }
  });
});
