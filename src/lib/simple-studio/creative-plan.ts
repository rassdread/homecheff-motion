/**
 * Simple Studio Creative Plan V2 — executable intent, not decorative metadata.
 */

import type { SimpleStudioPlatform, SimpleStudioPurpose } from "@/lib/simple-studio/catalog";

export type SimpleStudioMediaKind = "image" | "video";

export type SimpleStudioMediaItem = {
  id: string;
  kind: SimpleStudioMediaKind;
  url: string;
  name?: string | null;
};

export type SimpleStudioEngineStage =
  | "photo_story"
  | "slideshow"
  | "video_overlay"
  | "voice_tts"
  | "lipsync_avatar"
  | "free_music"
  | "music_generation"
  | "audio_mux"
  | "text_overlays"
  | "motion_deeplink"
  | "photo_video_deeplink";

export type SimpleStudioSpeechMode = "none" | "dialogue" | "narration";

export type SimpleStudioMusicMood =
  | "none"
  | "happy"
  | "calm"
  | "warm"
  | "upbeat"
  | "corporate"
  | "cinematic"
  | "auto";

export type SimpleStudioCreativePlan = {
  intent: SimpleStudioPurpose | "universal";
  purpose: SimpleStudioPurpose;
  sourceMedia: SimpleStudioMediaItem[];
  subject: string | null;
  product: string | null;
  audience: string | null;
  location: string | null;
  tone: string;
  platforms: SimpleStudioPlatform[];
  aspectRatio: "9:16" | "1:1" | "16:9";
  durationSeconds: 10 | 15 | 20;
  scenes: Array<{ title: string; overlayText: string }>;
  dialogue: string | null;
  narration: string | null;
  speechMode: SimpleStudioSpeechMode;
  voice: {
    required: boolean;
    language: "nl" | "en";
    gender: "auto" | "female" | "male";
    profile: string;
  };
  lipsync: {
    requested: boolean;
    available: boolean;
    /** Set when true lipsync is configured and will execute (else honest fallback copy). */
    reasonNl: string | null;
  };
  motion: "none" | "subtle" | "ken_burns" | "deeplink_motion";
  music: {
    required: boolean;
    mood: SimpleStudioMusicMood;
    volume: number;
    duckUnderVoice: boolean;
  };
  textOverlays: boolean;
  captions: boolean;
  cta: string | null;
  engineChain: SimpleStudioEngineStage[];
  hcActions: string[];
  warningsNl: string[];
  unsupportedNl: string[];
};

export type SimpleStudioPlanSummaryNl = {
  headline: string;
  bullets: string[];
  costLabel: string;
  warnings: string[];
};

export function summarizeCreativePlanNl(
  plan: SimpleStudioCreativePlan,
  totalCredits: number | null,
): SimpleStudioPlanSummaryNl {
  const bullets: string[] = [];
  const format =
    plan.aspectRatio === "9:16"
      ? "verticale social video (9:16)"
      : plan.aspectRatio === "1:1"
        ? "vierkante video"
        : "liggende video";
  bullets.push(`${format} · ongeveer ${plan.durationSeconds} seconden`);

  if (plan.sourceMedia.length > 1) {
    bullets.push(`${plan.sourceMedia.length} foto’s in volgorde`);
  } else if (plan.sourceMedia.some((m) => m.kind === "video")) {
    bullets.push("bestaande video als bron");
  } else {
    bullets.push("één foto als bron");
  }

  if (plan.speechMode === "dialogue" && plan.dialogue) {
    bullets.push(`persoon praat: “${truncate(plan.dialogue, 80)}”`);
  } else if (plan.speechMode === "narration" && plan.narration) {
    bullets.push(`voice-over: “${truncate(plan.narration, 80)}”`);
  }

  if (plan.voice.required) {
    bullets.push(
      plan.voice.language === "nl" ? "Nederlandse stem" : "Engelse stem",
    );
  }

  if (plan.lipsync.requested) {
    bullets.push(
      plan.lipsync.available
        ? "lipsync"
        : "geen lipsync (voice-over / tekst in beeld)",
    );
  }

  if (plan.motion === "subtle" || plan.motion === "ken_burns") {
    bullets.push("subtiele beweging");
  }

  if (plan.music.required && plan.music.mood !== "none") {
    bullets.push(musicMoodLabelNl(plan.music.mood));
  } else if (plan.music.mood === "none") {
    bullets.push("geen muziek");
  }

  if (plan.cta) {
    bullets.push(`tekst: “${plan.cta}”`);
  }

  const purposeLabel =
    plan.purpose === "advertisement"
      ? "Advertentie"
      : plan.purpose === "talking_photo"
        ? "Pratende foto"
        : plan.purpose === "product_video"
          ? "Productvideo"
          : plan.purpose === "story"
            ? "Verhaal"
            : plan.purpose === "social_video"
              ? "Social video"
              : "Studio-video";

  return {
    headline: `Studio gaat maken: ${purposeLabel}`,
    bullets,
    costLabel:
      totalCredits == null
        ? "Kosten worden berekend…"
        : totalCredits === 0
          ? "Kosten: gratis voor deze stappen"
          : `Kosten: ${totalCredits} HC`,
    warnings: [...plan.warningsNl, ...plan.unsupportedNl],
  };
}

function truncate(s: string, n: number): string {
  const t = s.trim();
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}

function musicMoodLabelNl(mood: SimpleStudioMusicMood): string {
  switch (mood) {
    case "happy":
    case "upbeat":
      return "vrolijke achtergrondmuziek";
    case "calm":
    case "warm":
      return "rustige warme achtergrondmuziek";
    case "corporate":
      return "professionele zakelijke muziek";
    case "cinematic":
      return "cinematische achtergrondmuziek";
    case "auto":
      return "passende achtergrondmuziek";
    default:
      return "achtergrondmuziek";
  }
}
