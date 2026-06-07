/**
 * Attach character voice orchestration plan to motion handoff (P1/P2 prep — motion may ignore).
 */

import { buildCharacterVoiceOrchestration, buildStoryboardVoicePlan } from "@/lib/studio-character-voice-orchestration";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type { MotionCharacterVoicePlanHandoff } from "@/types/studio-character-voice-orchestration";
import type { StudioStoryboardDetail } from "@/types/studio-api";

export function attachCharacterVoicePlanToHandoff(
  payload: MotionHandoffPayload,
  params: { storyboard: StudioStoryboardDetail }
): MotionHandoffPayload {
  const orchestration = buildCharacterVoiceOrchestration({ storyboard: params.storyboard });
  const voicePlan = buildStoryboardVoicePlan({
    storyboard: params.storyboard,
    orchestration,
  });

  const characterVoicePlan: MotionCharacterVoicePlanHandoff = {
    dialogueReadiness: orchestration.dialogueReadiness.status,
    castMemberCount: orchestration.castMembers.filter((m) => m.appearsInSceneCount > 0).length,
    voiceAssignedCount: orchestration.castMembers.filter((m) => m.status === "assigned").length,
    sceneSpeakerAssignments: voicePlan.sceneSpeakerAssignments.map((row) => ({
      sceneOrder: row.sceneOrder,
      speakerName: row.speakerName,
      characterId: row.speakerCharacterId,
      voiceProfile: row.voiceProfile,
    })),
  };

  return {
    ...payload,
    characterVoicePlan,
  };
}
