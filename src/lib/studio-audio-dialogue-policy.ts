/**
 * S2E — Dialogue vs scene duration policy (deterministic, no silent truncation).
 */

import type { DialogueDurationPolicy } from "@/types/studio-audio-timeline";

export const DEFAULT_DIALOGUE_DURATION_POLICY: DialogueDurationPolicy = "EXTEND_SCENE";

export type DialogueFitResult = {
  policy: DialogueDurationPolicy;
  sceneId: string;
  visualDurationMs: number;
  voiceDurationMs: number;
  /** Effective scene duration after policy. */
  effectiveDurationMs: number;
  extended: boolean;
  clipped: boolean;
  status: "FITS" | "VOICE_TOO_LONG" | "EXTENDED" | "CLIPPED";
};

const PAD_MS = 300;

/**
 * Apply deterministic policy when voice is longer than the visual scene.
 * EXTEND_SCENE — grow scene span (story-friendly).
 * WARN_ONLY — keep visual length; mark VOICE_TOO_LONG (no silent clip of intent).
 * CLIP_TO_SCENE — hard clip (legacy mux behavior); never default for story.
 */
export function applyDialogueDurationPolicy(input: {
  sceneId: string;
  visualDurationMs: number;
  voiceDurationMs: number;
  policy?: DialogueDurationPolicy;
}): DialogueFitResult {
  const policy = input.policy ?? DEFAULT_DIALOGUE_DURATION_POLICY;
  const visual = Math.max(500, input.visualDurationMs);
  const voice = Math.max(0, input.voiceDurationMs);

  if (voice <= visual) {
    return {
      policy,
      sceneId: input.sceneId,
      visualDurationMs: visual,
      voiceDurationMs: voice,
      effectiveDurationMs: visual,
      extended: false,
      clipped: false,
      status: "FITS",
    };
  }

  if (policy === "EXTEND_SCENE") {
    const effective = voice + PAD_MS;
    return {
      policy,
      sceneId: input.sceneId,
      visualDurationMs: visual,
      voiceDurationMs: voice,
      effectiveDurationMs: effective,
      extended: true,
      clipped: false,
      status: "EXTENDED",
    };
  }

  if (policy === "CLIP_TO_SCENE") {
    return {
      policy,
      sceneId: input.sceneId,
      visualDurationMs: visual,
      voiceDurationMs: voice,
      effectiveDurationMs: visual,
      extended: false,
      clipped: true,
      status: "CLIPPED",
    };
  }

  // WARN_ONLY — keep visual; caller surfaces VOICE_TOO_LONG; do not invent clip
  return {
    policy,
    sceneId: input.sceneId,
    visualDurationMs: visual,
    voiceDurationMs: voice,
    effectiveDurationMs: visual,
    extended: false,
    clipped: false,
    status: "VOICE_TOO_LONG",
  };
}

export function hashDialogueText(text: string): string {
  let h = 0;
  const s = text.trim();
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function hashVoiceConfig(input: {
  voiceProfile?: string | null;
  voiceLanguage?: string | null;
  voiceProvider?: string | null;
  speakerId?: string | null;
}): string {
  return [
    input.voiceProfile ?? "",
    input.voiceLanguage ?? "",
    input.voiceProvider ?? "",
    input.speakerId ?? "",
  ].join("|");
}

export function isVoiceAssetStale(input: {
  currentTextHash: string;
  assetTextHash: string | null | undefined;
  currentVoiceConfigHash: string;
  assetVoiceConfigHash: string | null | undefined;
}): boolean {
  if (!input.assetTextHash || !input.assetVoiceConfigHash) {
    return Boolean(input.currentTextHash);
  }
  return (
    input.currentTextHash !== input.assetTextHash ||
    input.currentVoiceConfigHash !== input.assetVoiceConfigHash
  );
}
