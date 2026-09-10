/**
 * Semantic-ish intent routing for Simple Studio (NL/EN heuristics + structure).
 * Does not claim LLM understanding; patterns cover certification dialogue/music/lipsync cues.
 */

import type { SimpleStudioPlatform, SimpleStudioPurpose } from "@/lib/simple-studio/catalog";
import type {
  SimpleStudioCreativePlan,
  SimpleStudioEngineStage,
  SimpleStudioMediaItem,
  SimpleStudioMusicMood,
  SimpleStudioSpeechMode,
} from "@/lib/simple-studio/creative-plan";
import { inferSimpleStudioIntent } from "@/lib/simple-studio/intent-infer";

const QUOTE_RE =
  /[“"]([^”"]{8,400})[”"]|zeggen?\s*[:：]\s*[“"]?([^”"\n.]{8,400})|zeggen?\s+dat\s+(.{8,200}?)(?:\.|$)/iu;

const DIALOGUE_CUE =
  /\b(laat\s+(hem|haar|deze\s+persoon|de\s+persoon)|vertel(?:len)?|zeg(?:gen)?|praat|spreken|mond\s+meelopen|lipsync|lip[- ]?sync)\b/i;

const NARRATION_CUE =
  /\b(voice[- ]?over|vertelstem|narratie|als\s+verteller|spraak\s+erover)\b/i;

const LIPSYNC_CUE =
  /\b(lipsync|lip[- ]?sync|mond\s+(goed\s+)?meelopen|natuurlijk\s+(praten|spreken)|laten\s+praten)\b/i;

const NO_MUSIC_CUE = /\b(geen\s+muziek|zonder\s+muziek|mute\s+music|no\s+music)\b/i;

const MUSIC_PATTERNS: Array<{ re: RegExp; mood: SimpleStudioMusicMood }> = [
  { re: /\b(vrolijk|upbeat|energiek|feestelijk)\b/i, mood: "happy" },
  { re: /\b(rustig|kalm|zacht|chill)\b/i, mood: "calm" },
  { re: /\b(warm|gezellig)\b/i, mood: "warm" },
  { re: /\b(zakelijk|professioneel|corporate)\b/i, mood: "corporate" },
  { re: /\b(cinematisch|filmisch|spannend)\b/i, mood: "cinematic" },
  { re: /\b(muziek|achtergrondmuziek|soundtrack)\b/i, mood: "auto" },
];

const MOTION_CUE =
  /\b(beweg|bewegen|camera|zoom|naar\s+voren|glimlach|natuurlijk\s+beweg)\b/i;

const REEL_CUE = /\b(instagram|reel|tiktok|stories?|facebook|9\s*[:：]\s*16|verticaal)\b/i;

const AD_CUE = /\b(advertentie|reclame|ad\b|promo|campagne)\b/i;
const PRODUCT_CUE = /\b(productvideo|product\s*video|productfoto|aanbod)\b/i;
const STORY_CUE = /\b(verhaal|story|scène|scenes)\b/i;
const TALKING_CUE = /\b(pratende\s+foto|talking\s+photo|laat\s+(hem|haar)\s+zeggen)\b/i;
const ANIM_CUE = /\b(animatie|animate|motion)\b/i;

export function extractQuotedDialogue(story: string): string | null {
  const m = story.match(QUOTE_RE);
  if (!m) return null;
  const raw = (m[1] || m[2] || m[3] || "").trim();
  return raw.length >= 8 ? raw.replace(/\s+/g, " ") : null;
}

export function inferPurposeFromStory(
  story: string,
  preferred?: SimpleStudioPurpose | "universal" | null,
): SimpleStudioPurpose {
  if (preferred && preferred !== "universal") return preferred;
  if (TALKING_CUE.test(story) || (DIALOGUE_CUE.test(story) && extractQuotedDialogue(story))) {
    return "talking_photo";
  }
  if (AD_CUE.test(story)) return "advertisement";
  if (PRODUCT_CUE.test(story)) return "product_video";
  if (STORY_CUE.test(story)) return "story";
  if (ANIM_CUE.test(story)) return "animation";
  if (REEL_CUE.test(story)) return "social_video";
  return "social_video";
}

export function inferMusicMood(story: string): SimpleStudioMusicMood {
  if (NO_MUSIC_CUE.test(story)) return "none";
  for (const row of MUSIC_PATTERNS) {
    if (row.re.test(story)) return row.mood;
  }
  return "none";
}

export function buildCreativePlanV2(input: {
  story: string;
  media: SimpleStudioMediaItem[];
  purposeHint?: SimpleStudioPurpose | "universal" | null;
  platforms?: SimpleStudioPlatform[];
  revisionInstruction?: string | null;
}): SimpleStudioCreativePlan {
  const story = [input.story.trim(), input.revisionInstruction?.trim()]
    .filter(Boolean)
    .join(". ");
  const purpose = inferPurposeFromStory(story, input.purposeHint);
  const base = inferSimpleStudioIntent({
    story: input.story,
    purpose,
    platforms: input.platforms,
  });

  const images = input.media.filter((m) => m.kind === "image");
  const videos = input.media.filter((m) => m.kind === "video");
  const warningsNl: string[] = [];
  const unsupportedNl: string[] = [];

  if (videos.length > 0 && images.length === 0) {
    // Video-only: Simple Studio can route to overlay/export path, not full NLE.
    warningsNl.push(
      "Studio gebruikt je video als basis en kan tekst/muziek toevoegen. Een volledige video-editor is niet onderdeel van Eenvoudig maken.",
    );
  } else if (videos.length > 0 && images.length > 0) {
    unsupportedNl.push(
      "Gemengde foto + video-bronnen worden voor deze eenvoudige flow nog beperkt ondersteund. Studio gebruikt nu de foto’s; video blijft beschikbaar in de geavanceerde editor.",
    );
  }

  const dialogue = extractQuotedDialogue(story);
  const lipsyncRequested = LIPSYNC_CUE.test(story) || (DIALOGUE_CUE.test(story) && Boolean(dialogue));
  const wantsSpeech = DIALOGUE_CUE.test(story) || NARRATION_CUE.test(story) || Boolean(dialogue);
  const speechMode: SimpleStudioSpeechMode = !wantsSpeech
    ? "none"
    : NARRATION_CUE.test(story) && !dialogue
      ? "narration"
      : dialogue || DIALOGUE_CUE.test(story)
        ? "dialogue"
        : "narration";

  const musicMood = inferMusicMood(story);
  const musicRequired = musicMood !== "none";

  // Honest: no AI lipsync engine in production.
  const lipsyncAvailable = false;
  if (lipsyncRequested) {
    warningsNl.push(
      "Studio kan bij deze afbeelding wel een stem of tekst in beeld maken, maar de persoon niet betrouwbaar laten lipsyncen (lipsync-engine is nog niet beschikbaar).",
    );
  }

  const voiceRequired =
    speechMode !== "none" && (Boolean(dialogue) || Boolean(story.length > 20));

  const gender: "auto" | "female" | "male" = /\bvrouwelijk|female|haar\b/i.test(story)
    ? "female"
    : /\bman(?:nelijk)?|male|hem\b/i.test(story)
      ? "male"
      : "auto";

  const durationSeconds: 10 | 15 | 20 = /\b10\s*sec/i.test(story)
    ? 10
    : purpose === "advertisement" || purpose === "story"
      ? 20
      : 15;

  const engineChain: SimpleStudioEngineStage[] = [];
  if (purpose === "animation") {
    engineChain.push("motion_deeplink");
  } else if (purpose === "general") {
    engineChain.push("photo_video_deeplink");
  } else if (videos.length > 0 && images.length === 0) {
    engineChain.push("video_overlay");
  } else if (images.length >= 2) {
    engineChain.push("slideshow");
  } else {
    engineChain.push("photo_story");
  }

  if (voiceRequired) engineChain.push("voice_tts");
  if (musicRequired) engineChain.push("free_music");
  if (voiceRequired || musicRequired) engineChain.push("audio_mux");
  engineChain.push("text_overlays");

  const hcActions: string[] = [];
  if (engineChain.includes("slideshow")) hcActions.push("publish_slideshow");
  else if (engineChain.includes("video_overlay")) hcActions.push("publish_mp4_export");
  else if (!engineChain.includes("motion_deeplink") && !engineChain.includes("photo_video_deeplink")) {
    hcActions.push("publish_photo_story");
  }
  if (voiceRequired) hcActions.push("voice_generation");
  // free_music has no HC; music_generation only if free catalog unavailable (resolved later)

  const ctaMatch = story.match(/\b(bestel\s+vandaag|bestel\s+nu|bekijk\s+het\s+aanbod|meer\s+info|probeer\s+studio|probeer\s+growth)\b/i);
  const cta = ctaMatch?.[1]
    ? ctaMatch[1].replace(/^\w/, (c) => c.toUpperCase())
    : base.cta;

  const sceneSeed = dialogue || input.story.trim();
  const scenes =
    purpose === "story" && images.length >= 2
      ? images.slice(0, 4).map((m, i) => ({
          title: i === 0 ? "Begin" : i === images.length - 1 ? "Einde" : `Deel ${i + 1}`,
          overlayText:
            i === images.length - 1 && cta
              ? cta
              : sceneSeed.split(/[.!?]/).map((s) => s.trim()).filter(Boolean)[i] ||
                base.product ||
                "HomeCheff",
        }))
      : [
          { title: "Hook", overlayText: (dialogue || sceneSeed).slice(0, 60) },
          { title: "Kern", overlayText: base.product || base.tone },
          { title: "CTA", overlayText: cta },
        ];

  return {
    intent: input.purposeHint === "universal" ? "universal" : purpose,
    purpose,
    sourceMedia: input.media,
    subject: gender === "auto" ? null : gender === "female" ? "vrouw" : "man",
    product: base.product,
    audience: base.audience,
    location: base.location,
    tone: base.tone,
    platforms: base.platforms,
    aspectRatio: "9:16",
    durationSeconds,
    scenes,
    dialogue: speechMode === "dialogue" ? dialogue : null,
    narration:
      speechMode === "narration"
        ? dialogue || input.story.trim().slice(0, 280)
        : speechMode === "dialogue"
          ? null
          : null,
    speechMode,
    voice: {
      required: voiceRequired,
      language: /\benglish|in\s+het\s+engels\b/i.test(story) ? "en" : "nl",
      gender,
      profile: gender === "male" ? "documentary" : "warm_narrator",
    },
    lipsync: {
      requested: lipsyncRequested,
      available: lipsyncAvailable,
      reasonNl: lipsyncRequested
        ? "Lipsync-engine is in Studio nog niet geïmplementeerd."
        : null,
    },
    motion: MOTION_CUE.test(story) || purpose === "talking_photo" ? "ken_burns" : "ken_burns",
    music: {
      required: musicRequired,
      mood: musicMood,
      volume: voiceRequired ? 35 : 70,
      duckUnderVoice: voiceRequired,
    },
    textOverlays: true,
    captions: voiceRequired,
    cta,
    engineChain,
    hcActions,
    warningsNl,
    unsupportedNl,
  };
}

/** Map music mood → free-music category preference. */
export function freeMusicCategoryForMood(
  mood: SimpleStudioMusicMood,
): "UPBEAT" | "CHILL" | "LIFESTYLE" | "CORPORATE" | "CINEMATIC" | "SOCIAL" | "AMBIENT" {
  switch (mood) {
    case "happy":
    case "upbeat":
      return "UPBEAT";
    case "calm":
    case "warm":
      return "CHILL";
    case "corporate":
      return "CORPORATE";
    case "cinematic":
      return "CINEMATIC";
    case "auto":
      return "LIFESTYLE";
    default:
      return "CHILL";
  }
}
