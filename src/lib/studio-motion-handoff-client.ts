import { fetchSameOriginJson, sameOriginApiPath } from "@/lib/client-api-fetch";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";

export type MotionHandoffResponse = {
  payload: MotionHandoffPayload;
};

export async function fetchMotionHandoffPayload(storyboardId: string) {
  return fetchSameOriginJson<MotionHandoffResponse>(
    sameOriginApiPath(`/api/studio/storyboards/${encodeURIComponent(storyboardId)}/handoff`)
  );
}
