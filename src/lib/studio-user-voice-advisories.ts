/**
 * Advisory clone voice suggestions from production memory — never auto-select.
 */

import {
  isClonedVoiceProfileRef,
  resolveProviderVoiceIdFromProfile,
} from "@/lib/studio-voice-profile-ref";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";

export type FrequentCloneVoiceAdvisory = {
  voiceProfile: string;
  cloneId: string;
  voiceName: string;
  characterCount: number;
  storyboardCount: number;
};

export function topFrequentCloneVoices(
  memory?: StudioProjectMemorySnapshot,
  limit = 3
): FrequentCloneVoiceAdvisory[] {
  if (!memory?.voices?.length) {
    return [];
  }

  return memory.voices
    .filter((entry) => isClonedVoiceProfileRef(entry.profileId) && entry.storyboardCount > 0)
    .sort(
      (a, b) =>
        b.storyboardCount - a.storyboardCount || b.characterCount - a.characterCount
    )
    .slice(0, limit)
    .map((entry) => {
      const cloneId = resolveProviderVoiceIdFromProfile(entry.profileId) ?? entry.profileId;
      return {
        voiceProfile: entry.profileId,
        cloneId,
        voiceName: entry.displayName?.trim() || cloneId,
        characterCount: entry.characterCount,
        storyboardCount: entry.storyboardCount,
      };
    });
}

export function buildFrequentCloneAdvisories(memory?: StudioProjectMemorySnapshot): Array<{
  id: string;
  messageKey: "studio.directorProposal.voice.advisory.frequentClone";
  messageParams: { voiceName: string };
  voiceProfile: string;
  storyboardCount: number;
  characterCount: number;
}> {
  return topFrequentCloneVoices(memory, 2).map((entry) => ({
    id: `frequent-clone-${entry.cloneId}`,
    messageKey: "studio.directorProposal.voice.advisory.frequentClone",
    messageParams: { voiceName: entry.voiceName },
    voiceProfile: entry.voiceProfile,
    storyboardCount: entry.storyboardCount,
    characterCount: entry.characterCount,
  }));
}

export function buildProductionBriefCloneAdvisories(memory?: StudioProjectMemorySnapshot): Array<{
  id: string;
  messageKey: "studio.productionBrief.recommendation.frequentClone";
  messageParams: { voiceName: string };
  priority: "medium";
}> {
  const top = topFrequentCloneVoices(memory, 1)[0];
  if (!top) {
    return [];
  }
  return [
    {
      id: `brief-frequent-clone-${top.cloneId}`,
      messageKey: "studio.productionBrief.recommendation.frequentClone",
      messageParams: { voiceName: top.voiceName },
      priority: "medium",
    },
  ];
}
