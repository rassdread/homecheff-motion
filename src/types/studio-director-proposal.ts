/**
 * Studio V2 — AI Director proposal model (in-memory only, no DB writes until apply).
 */

import type { AiDirectorStyleStrength, InterpretedDirectorStyle } from "@/lib/studio-ai-director-interpreter";
import type { StoryArcPhase } from "@/lib/studio-story-arc";

export type DirectorProposalApplyMode = "all" | "scenes" | "assets";

export type ProposedNewAsset = {
  tempId: string;
  name: string;
  reasonKey: string;
};

export type ProposedAssetRef = {
  existingId: string;
  name: string;
};

export type ProposedScene = {
  tempId: string;
  existingSceneId?: string;
  order: number;
  arcPhase: StoryArcPhase;
  titleKey: string;
  titleParams: Record<string, string>;
  descriptionKey: string;
  descriptionParams: Record<string, string>;
  actionKey: string;
  actionParams: Record<string, string>;
  emotion: string;
  shotType: string;
  cameraMovement: string;
  sceneEnergy: string;
  camera: string;
  characterRefs: ProposedAssetRef[];
  proposedCharacters: ProposedNewAsset[];
  locationRef: ProposedAssetRef | null;
  proposedLocation: ProposedNewAsset | null;
  propRefs: ProposedAssetRef[];
  proposedProps: ProposedNewAsset[];
  textBeatKeys: string[];
  textBeatParams: Record<string, string>[];
  durationSeconds: number;
};

export type DirectorProposalStoryArc = {
  beginningKey: string;
  middleKey: string;
  endKey: string;
  topicParams: Record<string, string>;
};

export type DirectorProposalCameraSummary = {
  dominantShotType: string;
  dominantMovement: string;
  framingKey: string;
};

export type DirectorProposalEmotionSummary = {
  moodKeywords: string[];
  energyProfileKey: string;
  toneKey: string;
};

export type DirectorProposalAudio = {
  voiceProfile: string;
  voiceProfileLabelKey: string;
  narrationMode: string;
  voiceEnabled: boolean;
  musicProfile: string;
  musicProfileLabelKey: string;
  musicIntensity: string;
  musicEnabled: boolean;
  soundProfile: string;
  soundProfileLabelKey: string;
  soundDensity: string;
  soundEnabled: boolean;
  recommendationKeys: string[];
};

export type StudioDirectorProposal = {
  version: 1;
  ideaPrompt: string;
  interpretation: InterpretedDirectorStyle;
  styleStrength: AiDirectorStyleStrength;
  directorQualityScore: number;
  storyArc: DirectorProposalStoryArc;
  scenes: ProposedScene[];
  camera: DirectorProposalCameraSummary;
  emotion: DirectorProposalEmotionSummary;
  audio: DirectorProposalAudio;
};
