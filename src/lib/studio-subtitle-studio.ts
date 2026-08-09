/**
 * S.7E — Canonical Subtitle Studio contract.
 * Aggregates storyboard subtitle track SoT — no Prisma rewrite.
 */

import {
  normalizeStudioSubtitleStyle,
  STUDIO_SUBTITLE_STYLE_DESCRIPTORS,
  type StudioSubtitleStyleId,
} from "@/lib/studio-subtitle-style";
import {
  resolveSubtitleSpeakerIdentity,
  type StudioSubtitleSpeakerIdentity,
} from "@/lib/studio-subtitle-identity";
import type { SubtitleTrackEntry } from "@/types/studio-voice-execution";

export type StudioSubtitleTrackSummary = {
  language: string;
  status: "draft" | "ready" | string;
  entryCount: number;
  speakers: StudioSubtitleSpeakerIdentity[];
};

export type StudioSubtitleStudioContract = {
  version: "7e.1";
  storyboardId: string;
  tracks: StudioSubtitleTrackSummary[];
  style: StudioSubtitleStyleId;
  styleDescriptor: (typeof STUDIO_SUBTITLE_STYLE_DESCRIPTORS)[StudioSubtitleStyleId];
  visibility: {
    burnInMode: "off" | "burn_in" | "metadata_only" | "unknown";
    reviewStatus: "draft" | "ready" | "unknown";
  };
  accessibility: {
    closedCaptions: true;
    speakerLabels: boolean;
    soundDescriptions: false;
    highContrastStyleAvailable: true;
    readingSpeedHint: "medium";
  };
  reuse: { reuseWithoutRegeneration: true };
  /** Fixed ASS StudioNarration remains known burn-in limitation */
  burnInLimitation: "fixed_ass_studio_narration";
  futureCompatibility: {
    dubbing: "NOT_IMPLEMENTED";
    lipSync: "NOT_IMPLEMENTED";
  };
};

export function buildSubtitleStudio(input: {
  storyboardId: string;
  tracks: Array<{
    language: string;
    status?: string | null;
    entries?: SubtitleTrackEntry[] | null;
    speakerLabels?: string[] | null;
  }>;
  style?: string | null;
  burnInMode?: "off" | "burn_in" | "metadata_only" | null;
}): StudioSubtitleStudioContract {
  const style = normalizeStudioSubtitleStyle(input.style, "default");
  const tracks: StudioSubtitleTrackSummary[] = input.tracks.map((t) => {
    const labels = t.speakerLabels ?? [];
    const speakers =
      labels.length > 0
        ? labels.map((label) =>
            resolveSubtitleSpeakerIdentity({
              speakerLabel: label,
              isNarrator: label.toLowerCase() === "narrator",
            })
          )
        : [resolveSubtitleSpeakerIdentity({ isNarrator: true })];
    return {
      language: t.language.trim().toLowerCase().slice(0, 2) || "en",
      status: t.status ?? "draft",
      entryCount: t.entries?.length ?? 0,
      speakers,
    };
  });

  const primaryStatus = tracks[0]?.status ?? "unknown";

  return {
    version: "7e.1",
    storyboardId: input.storyboardId,
    tracks,
    style,
    styleDescriptor: STUDIO_SUBTITLE_STYLE_DESCRIPTORS[style],
    visibility: {
      burnInMode: input.burnInMode ?? "unknown",
      reviewStatus:
        primaryStatus === "ready" || primaryStatus === "draft" ? primaryStatus : "unknown",
    },
    accessibility: {
      closedCaptions: true,
      speakerLabels: input.tracks.some((t) => (t.speakerLabels?.length ?? 0) > 0),
      soundDescriptions: false,
      highContrastStyleAvailable: true,
      readingSpeedHint: "medium",
    },
    reuse: { reuseWithoutRegeneration: true },
    burnInLimitation: "fixed_ass_studio_narration",
    futureCompatibility: {
      dubbing: "NOT_IMPLEMENTED",
      lipSync: "NOT_IMPLEMENTED",
    },
  };
}
