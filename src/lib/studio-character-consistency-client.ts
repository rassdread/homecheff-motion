import { fetchSameOriginJson, sameOriginApiPath } from "@/lib/client-api-fetch";
import type { StudioStoryboardCharacterConsistencyResponse } from "@/types/studio-character-consistency";

export async function analyzeStoryboardCharacterConsistencyApi(storyboardId: string) {
  return fetchSameOriginJson<StudioStoryboardCharacterConsistencyResponse>(
    sameOriginApiPath(
      `/api/studio/storyboards/${encodeURIComponent(storyboardId)}/analyze-character-consistency`
    ),
    { method: "POST" }
  );
}
