import { buildMotionCharacterBlockingHandoffPlan } from "@/lib/studio-character-blocking-director";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";
import type { StudioStoryboardDetail } from "@/types/studio-api";

export function attachCharacterBlockingToHandoffPayload(
  payload: MotionHandoffPayload,
  options: { storyboard: StudioStoryboardDetail }
): MotionHandoffPayload {
  const characterBlockingPlan = buildMotionCharacterBlockingHandoffPlan(options.storyboard);

  return {
    ...payload,
    characterBlockingPlan,
    characterActions: characterBlockingPlan.characterActions,
    characterPoses: characterBlockingPlan.characterPoses,
    characterInteractions: characterBlockingPlan.characterInteractions,
    attentionTargets: characterBlockingPlan.attentionTargets,
    blockingWarnings: characterBlockingPlan.blockingWarnings,
  };
}
