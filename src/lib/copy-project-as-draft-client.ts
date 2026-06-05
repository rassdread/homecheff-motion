import { fetchSameOriginJson, sameOriginApiPath } from "@/lib/client-api-fetch";

export function copyProjectAsDraftPath(sourceProjectId: string): string {
  return sameOriginApiPath(
    `/api/instant-premium/projects/${encodeURIComponent(sourceProjectId)}/copy-as-draft`
  );
}

export type CopyProjectAsDraftResponse = {
  ok: boolean;
  error?: string;
  message?: string;
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

export type CopyProjectAsDraftOptions = {
  sourceLanguage?: string;
  sourceVersion?: number;
  renderVersionId?: string;
  languageExportId?: string;
  selectionKey?: string;
};

export async function postCopyProjectAsDraft(
  sourceProjectId: string,
  options?: CopyProjectAsDraftOptions
): Promise<{
  ok: boolean;
  status: number;
  data: CopyProjectAsDraftResponse;
  networkError?: boolean;
}> {
  const result = await fetchSameOriginJson<CopyProjectAsDraftResponse>(
    copyProjectAsDraftPath(sourceProjectId),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceLanguage: options?.sourceLanguage,
        sourceVersion: options?.sourceVersion,
        renderVersionId: options?.renderVersionId,
        languageExportId: options?.languageExportId,
        selectionKey: options?.selectionKey,
      }),
    }
  );
  return {
    ok: result.ok && result.data.ok === true,
    status: result.status,
    data: result.data,
    networkError: result.networkError,
  };
}
