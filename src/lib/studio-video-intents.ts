/**
 * Canonical video intent detection — routes Copilot directly to Studio production.
 */

import type { StudioVideoIntent } from "@/types/studio-video-production";
import { STUDIO_VIDEO_INTENTS } from "@/types/studio-video-production";

export type StudioVideoIntentMatch = {
  intent: StudioVideoIntent;
  confidence: "high" | "medium";
  matchedPhrase: string;
};

type IntentRule = {
  intent: StudioVideoIntent;
  phrases: string[];
};

const INTENT_RULES: IntentRule[] = [
  {
    intent: "music_video",
    phrases: [
      "music video",
      "muziekvideo",
      "videoclip",
      "video clip",
      "mv ",
      "song video",
      "clip voor mijn nummer",
    ],
  },
  {
    intent: "travel_vlog",
    phrases: ["travel vlog", "reisvlog", "vlog reis", "travel video", "reisblogger", "travel movie", "reis film"],
  },
  {
    intent: "product_commercial",
    phrases: [
      "product commercial",
      "product reclame",
      "commercial",
      "product video",
      "product launch",
      "product showcase",
      "reclame",
    ],
  },
  {
    intent: "social_campaign",
    phrases: [
      "social media campaign",
      "social campaign",
      "social media",
      "instagram campaign",
      "tiktok campaign",
      "content campaign",
    ],
  },
  {
    intent: "podcast_video",
    phrases: ["podcast video", "podcast clip", "podcast", "interview video"],
  },
  {
    intent: "restaurant_promo",
    phrases: ["restaurant promo", "restaurant video", "horeca video", "menu video"],
  },
  {
    intent: "cooking_show",
    phrases: ["cooking show", "kookshow", "cooking tutorial", "recipe video", "recept video"],
  },
  {
    intent: "fashion_reel",
    phrases: ["fashion reel", "mode reel", "fashion video", "runway", "catwalk", "influencer reel"],
  },
  {
    intent: "documentary",
    phrases: ["documentary", "documentaire", "docu ", "netflix style"],
  },
  {
    intent: "event_video",
    phrases: ["event video", "evenement video", "wedding video", "bruiloft video", "festival video"],
  },
  {
    intent: "presentation_video",
    phrases: [
      "presentation video",
      "presentatie video",
      "business presentation",
      "conference speaker",
      "keynote video",
    ],
  },
  {
    intent: "slideshow",
    phrases: ["slideshow", "dia show", "photo slideshow", "foto slideshow"],
  },
  {
    intent: "photo_story",
    phrases: ["photo story", "foto verhaal", "photo movie", "foto film", "photos to video"],
  },
  {
    intent: "brand_story",
    phrases: ["brand story", "merkverhaal", "founder story", "brand film"],
  },
  {
    intent: "company_video",
    phrases: ["company video", "bedrijfsvideo", "corporate video", "bedrijfsfilm"],
  },
];

function normalizeIntentInput(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

export function detectStudioVideoIntent(input: string): StudioVideoIntentMatch | null {
  const text = normalizeIntentInput(input);
  if (!text) return null;

  for (const rule of INTENT_RULES) {
    for (const phrase of rule.phrases) {
      if (text.includes(phrase)) {
        return {
          intent: rule.intent,
          confidence: phrase.length >= 8 ? "high" : "medium",
          matchedPhrase: phrase,
        };
      }
    }
  }
  return null;
}

export function isStudioVideoIntent(value: string): value is StudioVideoIntent {
  return (STUDIO_VIDEO_INTENTS as readonly string[]).includes(value);
}

export function studioVideoIntentToDirectorProfile(intent: StudioVideoIntent): string {
  const map: Record<StudioVideoIntent, string> = {
    music_video: "cinematic",
    travel_vlog: "documentary",
    product_commercial: "commercial",
    social_campaign: "social_media",
    podcast_video: "educational",
    restaurant_promo: "commercial",
    cooking_show: "educational",
    fashion_reel: "social_media",
    documentary: "documentary",
    event_video: "storytelling",
    presentation_video: "educational",
    slideshow: "storytelling",
    photo_story: "storytelling",
    brand_story: "storytelling",
    company_video: "commercial",
  };
  return map[intent];
}

export function studioVideoIntentDefaultDuration(intent: StudioVideoIntent): number {
  const map: Record<StudioVideoIntent, number> = {
    music_video: 180,
    travel_vlog: 180,
    product_commercial: 30,
    social_campaign: 60,
    podcast_video: 90,
    restaurant_promo: 30,
    cooking_show: 120,
    fashion_reel: 30,
    documentary: 300,
    event_video: 120,
    presentation_video: 180,
    slideshow: 60,
    photo_story: 30,
    brand_story: 90,
    company_video: 120,
  };
  return map[intent];
}

export function buildStudioStartHref(params?: {
  intent?: StudioVideoIntent;
  hcProject?: string;
  idea?: string;
  characterId?: string;
  autoProduce?: boolean;
}): string {
  const q = new URLSearchParams();
  if (params?.intent) q.set("intent", params.intent);
  if (params?.hcProject) q.set("hcProject", params.hcProject);
  if (params?.idea) q.set("idea", params.idea.slice(0, 500));
  if (params?.characterId) q.set("characterId", params.characterId);
  if (params?.autoProduce) q.set("autoProduce", "1");
  const qs = q.toString();
  return qs ? `/studio/start?${qs}` : "/studio/start";
}
