import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { en } from "@/i18n/locales/en";
import { nl } from "@/i18n/locales/nl";
import { buildStudioAiHomeIntentPlan } from "@/lib/studio-ai-home-intent";
import {
  STUDIO_AI_HOME_INSPIRATION,
  studioAiHomeInspiration,
} from "@/lib/studio-ai-home-inspiration";
import { characterReferenceExactness } from "@/lib/studio-unified-production-context";
import { readFileSync } from "node:fs";

const AI_HOME_I18N_KEYS = [
  "studio.aiHome.prompt.title",
  "studio.aiHome.prompt.placeholder",
  "studio.aiHome.prompt.submit",
  "studio.aiHome.attach.media",
  "studio.aiHome.attach.character",
  "studio.aiHome.attach.product",
  "studio.aiHome.attach.brand",
  "studio.aiHome.characters.title",
  "studio.aiHome.character.keepConsistent",
  "studio.aiHome.inspiration.title",
  "studio.aiHome.confirm.title",
  "studio.aiHome.confirm.make",
  "studio.aiHome.confirm.adjust",
  "studio.aiHome.confirm.estimatedCost",
  "studio.aiHome.shortcuts.title",
] as const;

describe("Studio AI-first home — IntentPlan", () => {
  it("routes advertisement prompts to orchestrator with product_commercial", () => {
    const plan = buildStudioAiHomeIntentPlan({
      prompt: "Maak van deze productfoto een luxe Instagram-advertentie van 15 seconden met Anna",
      attachments: [
        {
          kind: "character",
          id: "char-anna",
          name: "Anna",
          url: "https://cdn.example/anna.jpg",
        },
        {
          kind: "media",
          id: "media-1",
          name: "product.jpg",
          url: "https://cdn.example/product.jpg",
        },
      ],
    });
    assert.equal(plan.purpose, "advertisement");
    assert.equal(plan.recommendedPipeline, "quick_ad");
    assert.equal(plan.videoIntent, "product_commercial");
    assert.equal(plan.durationSeconds, 15);
    assert.equal(plan.aspectRatio, "9:16");
    assert.equal(plan.keepCharacterConsistent, true);
    assert.match(plan.handoffHref, /\/studio\/quick-ad/);
    assert.equal(plan.free, false);
    assert.equal(plan.billingActionType, "publish_photo_story");
  });

  it("routes photo→video inspiration to free photo_video pipeline", () => {
    const plan = buildStudioAiHomeIntentPlan({
      prompt: "",
      inspirationId: "photo_video",
    });
    // inspiration prefill happens in UI; empty prompt + inspiration still resolves pipeline
    const withPrefill = buildStudioAiHomeIntentPlan({
      prompt: "Maak van mijn foto's een snelle video.",
      inspirationId: "photo_video",
    });
    assert.equal(withPrefill.recommendedPipeline, "photo_video");
    assert.equal(withPrefill.free, true);
    const photoVideoHref = new URL(withPrefill.handoffHref, "https://studio.local");
    assert.equal(photoVideoHref.pathname, "/studio/photo-video");
    assert.equal(photoVideoHref.searchParams.get("idea"), "Maak van mijn foto's een snelle video.");
    assert.equal(withPrefill.billingActionType, null);
    assert.equal(plan.recommendedPipeline, "photo_video");
  });

  it("routes image edit style prompts to editor", () => {
    const plan = buildStudioAiHomeIntentPlan({
      prompt: "Verander alleen de achtergrond van deze productfoto",
    });
    assert.equal(plan.recommendedPipeline, "editor");
    assert.equal(plan.target, "image");
    assert.match(plan.handoffHref, /\/editor\/start/);
  });

  it("routes standalone creative requests to existing editors", () => {
    const voice = buildStudioAiHomeIntentPlan({ prompt: "Maak een voice-over voor mijn reclame." });
    assert.equal(voice.recommendedPipeline, "voice_library");
    assert.equal(voice.free, true);
    assert.match(voice.handoffHref, /\/studio\/assets\/media\/voices\?idea=/);

    const audio = buildStudioAiHomeIntentPlan({ prompt: "Genereer achtergrondmuziek." });
    assert.equal(audio.recommendedPipeline, "audio_library");
    assert.match(audio.handoffHref, /\/studio\/assets\/media\/audio\?idea=/);
    assert.doesNotMatch(audio.handoffHref, /\/editor\/start/);

    const character = buildStudioAiHomeIntentPlan({ prompt: "Ontwerp een personage met donker krullend haar." });
    assert.equal(character.recommendedPipeline, "character_new");
    assert.match(character.handoffHref, /\/studio\/characters\/new\?idea=/);
    assert.equal(character.free, true);

    const animation = buildStudioAiHomeIntentPlan({ prompt: "Maak een animatie van mijn foto." });
    assert.equal(animation.recommendedPipeline, "motion");
    assert.match(animation.handoffHref, /^\/motion\?idea=/);
    assert.equal(animation.free, true);

    const photoVideo = buildStudioAiHomeIntentPlan({ prompt: "Maak een video van deze foto." });
    assert.equal(photoVideo.recommendedPipeline, "photo_video");
    assert.match(photoVideo.handoffHref, /\/studio\/photo-video\?idea=/);

    const fromPhoto = buildStudioAiHomeIntentPlan({ prompt: "Ik wil een personage maken van deze foto." });
    assert.equal(fromPhoto.recommendedPipeline, "character_from_reference");

    const reopen = buildStudioAiHomeIntentPlan({ prompt: "Open mijn laatste project." });
    assert.equal(reopen.missingRequired.length, 0);
    assert.equal(reopen.free, true);
    assert.equal(reopen.billingActionType, null);
    const reopenEn = buildStudioAiHomeIntentPlan({ prompt: "Open my last project." });
    assert.equal(reopenEn.missingRequired.length, 0);

    const vague = buildStudioAiHomeIntentPlan({ prompt: "Maak iets moois." });
    assert.equal(vague.missingQuestionKey, "studio.aiHome.missing.medium");
    const vagueOverride = buildStudioAiHomeIntentPlan({
      prompt: "Maak iets moois.",
      interpretation: {
        originalMessage: "Maak iets moois.",
        understoodGoal: "Maak iets moois.",
        detectedIntent: "video",
        confidence: "medium",
        targetModule: "studio",
        likelyActionId: "create_video_production",
        extractedEntities: {},
        inferredSettings: {},
        missingInputs: [],
        followUpQuestions: [],
        source: "rules",
      },
    });
    assert.equal(vagueOverride.missingQuestionKey, "studio.aiHome.missing.medium");
    assert.equal(vagueOverride.billingActionType, null);
    const advert = buildStudioAiHomeIntentPlan({ prompt: "Maak een reclame." });
    assert.equal(advert.missingQuestionKey, "studio.aiHome.missing.advertisement");
  });

  it("routes animation prompts to motion", () => {
    const plan = buildStudioAiHomeIntentPlan({
      prompt: "Breng deze foto tot leven met een animatie",
      attachments: [
        { kind: "media", id: "m1", name: "still.jpg", url: "https://cdn.example/still.jpg" },
      ],
    });
    assert.equal(plan.recommendedPipeline, "motion");
    assert.match(plan.handoffHref, /\/motion\/start/);
  });

  it("prefills experience handoff for social inspiration", () => {
    const plan = buildStudioAiHomeIntentPlan({
      prompt: "Maak een verticale social-media video voor Instagram Reels.",
      inspirationId: "social_video",
    });
    assert.equal(plan.experienceId, "SOCIAL_REELS");
    assert.match(plan.handoffHref, /experience=SOCIAL_REELS/);
  });
});

describe("Studio AI-first home — inspiration + i18n", () => {
  it("exposes curated inspiration chips with NL/EN parity", () => {
    assert.ok(STUDIO_AI_HOME_INSPIRATION.length >= 6);
    for (const chip of STUDIO_AI_HOME_INSPIRATION) {
      assert.ok(nl[chip.titleKey].trim());
      assert.ok(en[chip.titleKey].trim());
      assert.ok(nl[chip.prefillKey].trim());
      assert.ok(en[chip.prefillKey].trim());
    }
    assert.equal(studioAiHomeInspiration("advertisement").experienceId, "BUSINESS_COMMERCIAL");
  });

  it("has NL/EN keys for AI home surface", () => {
    for (const key of AI_HOME_I18N_KEYS) {
      assert.ok(nl[key].trim(), `missing nl ${key}`);
      assert.ok(en[key].trim(), `missing en ${key}`);
    }
    assert.match(nl["studio.aiHome.character.keepConsistent"], /consistent/i);
    assert.match(en["studio.aiHome.character.keepConsistent"], /consistent/i);
    assert.doesNotMatch(nl["studio.aiHome.character.keepConsistent"], /FaceID|vergrendeld/i);
    assert.doesNotMatch(en["studio.aiHome.character.keepConsistent"], /FaceID|locked/i);
  });

  it("mounts AI composer on unified home and keeps intent shortcuts", () => {
    const home = readFileSync("src/components/studio/studio-unified-home-page.tsx", "utf8");
    assert.match(home, /StudioAiHomeComposer/);
    assert.match(home, /STUDIO_HOME_INTENTS/);
    assert.match(home, /data-testid="studio-unified-home"/);
    const composer = readFileSync("src/components/studio/studio-ai-home-composer.tsx", "utf8");
    assert.match(composer, /studio-ai-home-prompt/);
    assert.match(composer, /studio-ai-home-confirm/);
    assert.match(composer, /interpretStudioAiHomePrompt/);
    assert.match(composer, /previewStudioAiHomeCredits/);
  });

  it("fixes assistant interpret locale to active locale", () => {
    const provider = readFileSync(
      "src/components/assistant/homecheff-assistant-provider.tsx",
      "utf8"
    );
    assert.match(provider, /useLocale/);
    assert.match(provider, /locale === "en" \? "en" : "nl"/);
    assert.doesNotMatch(provider, /locale: "nl"/);
  });
});

describe("Character consistency harden", () => {
  it("maps strong/strict identity to MUST_PRESERVE", () => {
    assert.equal(characterReferenceExactness("strong"), "MUST_PRESERVE");
    assert.equal(characterReferenceExactness("strict"), "MUST_PRESERVE");
    assert.equal(characterReferenceExactness("normal"), "SHOULD_MATCH");
    assert.equal(characterReferenceExactness("low"), "SHOULD_MATCH");
  });

  it("records identityPreservation on OpenAI provider fallback path", () => {
    const src = readFileSync("src/server/scene-image-providers/openai-provider.ts", "utf8");
    assert.match(src, /identityPreservation: "text_fallback"/);
    assert.match(src, /identityPreservation: "reference_edit"/);
  });
});
