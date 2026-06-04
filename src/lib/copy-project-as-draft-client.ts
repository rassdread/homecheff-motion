import { fetchSameOriginJson, sameOriginApiPath } from "@/lib/client-api-fetch";

export function copyProjectAsDraftPath(sourceProjectId: string): string {
  return sameOriginApiPath(
    `/api/instant-premium/projects/${encodeURIComponent(sourceProjectId)}/copy-as-draft`
  );
}

export type CopyProjectAsDraftResponse = {
  ok: boolean;
  error?: string;
  code?: string;
  draftProjectId?: string;
  sourceProjectId?: string;
  editVersionPath?: string;
  copyAsDraft?: {
    ok: boolean;
    draftProjectId?: string;
    sourceProjectId?: string;
    editVersionPath?: string;
    message?: string;
  };
};

export async function postCopyProjectAsDraft(sourceProjectId: string): Promise<{
  ok: boolean;
  status: number;
  data: CopyProjectAsDraftResponse;
  networkError?: boolean;
}> {
  const result = await fetchSameOriginJson<CopyProjectAsDraftResponse>(
    copyProjectAsDraftPath(sourceProjectId),
    { method: "POST" }
  );
  return {
    ok: result.ok && result.data.ok === true,
    status: result.status,
    data: result.data,
    networkError: result.networkError,
  };
}
