import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPhotoIntentPrefillPackage } from "@/lib/motion-hub-navigation";
import { buildStudioAiHomeIntentPlan } from "@/lib/studio-ai-home-intent";
import { STUDIO_AI_HOME_INSPIRATION } from "@/lib/studio-ai-home-inspiration";
import {
  classifyStudioCreativeIntent,
  creativeIntentHandoffHref,
} from "@/lib/studio-v23-intent";
import { pickReferenceUrlsForStillAdapter } from "@/lib/studio-production-prompt-orchestrator";
import type { ProductionInstructions } from "@/types/studio-unified-production-context";
import {
  filmSceneWizardLinks,
  inspirationWizardHref,
  mergePresetPromptWithUserIdea,
  studioStoryboardOpenHref,
} from "@/lib/studio-v27-workflow-routes";

describe("V27 preset routes open existing wizards", () => {
  it("maps every homepage preset to a real wizard and spends nothing on open", () => {
    const expected: Record<string, string> = {
      photo_video: "/studio/photo-video",
      product_photo: "/editor/start",
      advertisement: "/studio/quick-ad",
      social_video: "/animate/instant",
      animation: "/animate/instant",
      story: "/studio/storyboards/new",
      logo: "/editor/start",
      presentation: "/studio/storyboards/new",
    };
    for (const chip of STUDIO_AI_HOME_INSPIRATION) {
      const target = inspirationWizardHref(chip.id, { idea: "Bewaar dit idee" });
      assert.equal(target.spendsCreditsOnOpen, false);
      assert.equal(target.href.startsWith(expected[chip.id]), true, chip.id);
      assert.match(target.href, /idea=/);
      assert.doesNotMatch(target.href, /\/studio\/experience\?/);
    }
  });

  it("keeps a preset prompt and appends the user idea", () => {
    const preset = buildPhotoIntentPrefillPackage("photo_to_video");
    const merged = mergePresetPromptWithUserIdea(preset.promptDraft ?? "", "Animeer deze foto van Anna");
    assert.match(merged, /Preserve the subject identity exactly/);
    assert.match(merged, /User direction: Animeer deze foto van Anna/);
    assert.equal(preset.creditsConsumed, 0);
  });

  it("routes the owner's example sentences to the existing workflow", () => {
    assert.equal(classifyStudioCreativeIntent("Animeer deze foto"), "ANIMATION");
    assert.equal(classifyStudioCreativeIntent("Maak een productfoto"), "IMAGE");
    assert.equal(classifyStudioCreativeIntent("Maak een reclamevideo"), "VIDEO");
    assert.equal(classifyStudioCreativeIntent("Ik wil een film maken met zes personages"), "FILM");
    assert.match(creativeIntentHandoffHref("VIDEO", "Maak een reclamevideo") ?? "", /\/studio\/quick-ad\?idea=/);
    assert.match(creativeIntentHandoffHref("VIDEO", "Maak een video.") ?? "", /\/studio\/experience\?idea=/);
    assert.match(
      creativeIntentHandoffHref("ANIMATION", "Animeer deze foto.", {
        mediaUrl: "https://cdn.example/still.jpg",
      }) ?? "",
      /photoIntent=photo_to_video/,
    );
    assert.match(creativeIntentHandoffHref("IMAGE", "Maak een productfoto") ?? "", /\/editor\/start\?idea=/);
  });

  it("does not send photo-to-video or social inspiration through the experience chooser", () => {
    const photo = buildStudioAiHomeIntentPlan({
      prompt: "Maak van mijn foto's een snelle video.",
      inspirationId: "photo_video",
    });
    assert.match(photo.handoffHref, /\/studio\/photo-video/);
    const social = buildStudioAiHomeIntentPlan({
      prompt: "Maak een verticale social-media video voor Instagram Reels.",
      inspirationId: "social_video",
    });
    assert.match(social.handoffHref, /\/animate\/instant/);
    assert.match(social.handoffHref, /experience=SOCIAL_REELS/);
    assert.match(social.handoffHref, /photoIntent=photo_to_video/);
  });

  it("keeps the voice tool when a storyboard link opens", () => {
    const href = studioStoryboardOpenHref({
      storyboardId: "board-9",
      tool: "voice",
      scene: "scene-2",
      idea: "Keuken",
      returnTo: "/studio/projects/film-1?section=scenes&workflow=film&scene=scene-2",
      stage: "javascript:alert(1)",
    });
    assert.match(href ?? "", /\/studio\/open\/storyboard\/board-9\?/);
    assert.match(href ?? "", /tool=voice/);
    assert.match(href ?? "", /scene=scene-2/);
    assert.match(href ?? "", /returnTo=/);
    assert.doesNotMatch(href ?? "", /javascript/);
    assert.equal(studioStoryboardOpenHref({ storyboardId: "../etc", tool: "voice" }), null);
  });

  it("opens film scene wizards with the scene return path and reference image", () => {
    const links = filmSceneWizardLinks({
      projectId: "film-1",
      sceneId: "scene-1",
      storyboardId: "board-1",
      idea: "Ending logo",
      imageUrl: "https://cdn.example/scene.jpg",
    });
    const image = links.find((link) => link.workflowId === "FILM_SCENE_IMAGE");
    const animation = links.find((link) => link.workflowId === "FILM_SCENE_ANIMATION");
    assert.match(image?.href ?? "", /\/editor\/start/);
    assert.match(image?.href ?? "", /sourceImage=/);
    assert.match(image?.href ?? "", /returnTo=/);
    assert.match(animation?.href ?? "", /photoIntent=photo_to_video/);
    assert.equal(links.some((link) => link.workflowId === "FILM_STORYBOARD"), true);
    for (const link of links) assert.equal(link.spendsCreditsOnOpen, false);
  });

  it("keeps reference images in the still adapter payload", () => {
    const picked = pickReferenceUrlsForStillAdapter({
      references: [
        {
          url: "https://cdn.example/hero.jpg",
          entityId: "char-1",
          role: "identity",
          exactness: "MUST_PRESERVE",
          entityKind: "character",
        },
        {
          url: "https://cdn.example/logo.png",
          entityId: "logo-1",
          role: "logo",
          exactness: "MUST_PRESERVE",
          entityKind: "logo",
        },
      ],
    } as ProductionInstructions);
    assert.deepEqual(
      picked.map((item) => item.url),
      ["https://cdn.example/logo.png", "https://cdn.example/hero.jpg"],
    );
  });
});
