import { fetchSameOriginJson, sameOriginApiPath } from "@/lib/client-api-fetch";
import type { StudioProjectMemoryResponse } from "@/types/studio-project-memory";

export async function fetchStudioProjectMemory() {
  return fetchSameOriginJson<StudioProjectMemoryResponse>(
    sameOriginApiPath("/api/studio/project-memory")
  );
}
