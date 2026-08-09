/**
 * S.7E — Subtitle speaker identity (does not duplicate Character voice identity).
 */

export type StudioSubtitleSpeakerKind =
  | "character"
  | "narrator"
  | "unknown"
  | "multi_speaker";

export type StudioSubtitleSpeakerIdentity = {
  kind: StudioSubtitleSpeakerKind;
  characterId: string | null;
  speakerLabel: string;
  /** Optional display color for multi-speaker UIs — not Character identity */
  speakerColor: string | null;
};

export function resolveSubtitleSpeakerIdentity(input: {
  characterId?: string | null;
  characterName?: string | null;
  speakerLabel?: string | null;
  isNarrator?: boolean;
}): StudioSubtitleSpeakerIdentity {
  if (input.characterId) {
    return {
      kind: "character",
      characterId: input.characterId,
      speakerLabel: input.characterName?.trim() || input.speakerLabel?.trim() || "Speaker",
      speakerColor: null,
    };
  }
  if (input.isNarrator || (input.speakerLabel ?? "").toLowerCase() === "narrator") {
    return {
      kind: "narrator",
      characterId: null,
      speakerLabel: "Narrator",
      speakerColor: null,
    };
  }
  const label = input.speakerLabel?.trim();
  if (label) {
    return {
      kind: "unknown",
      characterId: null,
      speakerLabel: label,
      speakerColor: null,
    };
  }
  return {
    kind: "unknown",
    characterId: null,
    speakerLabel: "Unknown",
    speakerColor: null,
  };
}
