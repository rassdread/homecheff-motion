/**
 * Same-origin client for text rerender (rebuild-final-video) and language-export APIs.
 */

import {
  fetchSameOriginJson,
  isAbortLikeError,
  sameOriginApiPath,
} from "@/lib/client-api-fetch";
import { languageExportPrepareUrl } from "@/lib/language-export-prepare";
import type { InstantSceneText } from "@/lib/story-overlay-templates";
import type { FullRerenderResponse, InstantPremiumStatusResponse } from "@/types/animation-api";
import type { VideoLanguageExportSummary } from "@/types/animation-api";

export type InstantExportClientErrorKind = "abort" | "network" | "http";

export function languageExportsPath(projectId: string): string {
  return languageExportPrepareUrl(projectId);
}

export function rebuildFinalVideoPath(projectId: string): string {
  return sameOriginApiPath(
    `/api/instant-premium/projects/${encodeURIComponent(projectId)}/rebuild-final-video`
  );
}

export function fullRerenderPath(projectId: string): string {
  return sameOriginApiPath(
    `/api/instant-premium/projects/${encodeURIComponent(projectId)}/full-rerender`
  );
}

export function classifyInstantExportClientError(
  error: unknown
): InstantExportClientErrorKind {
  if (isAbortLikeError(error)) {
    return "abort";
  }
  return "network";
}

export function instantExportUserErrorMessage(params: {
  kind: InstantExportClientErrorKind;
  abortedMessage: string;
  networkMessage: string;
  httpMessage?: string;
  adminDetail?: string;
  isAdmin?: boolean;
}): string {
  if (params.isAdmin && params.adminDetail?.trim()) {
    return params.adminDetail.trim();
  }
  if (params.kind === "abort") {
    return params.abortedMessage;
  }
  if (params.httpMessage?.trim()) {
    return params.httpMessage.trim();
  }
  return params.networkMessage;
}

export async function getProjectLanguageExports(
  projectId: string
): Promise<{
  exports: VideoLanguageExportSummary[];
  networkError: boolean;
  errorMessage: string | null;
}> {
  const result = await fetchSameOriginJson<{
    exports?: VideoLanguageExportSummary[];
    error?: string;
  }>(languageExportsPath(projectId));

  if (result.networkError) {
    return {
      exports: [],
      networkError: true,
      errorMessage:
        typeof result.data.error === "string" ? result.data.error : result.data.error ?? null,
    };
  }
  if (!result.ok || !Array.isArray(result.data.exports)) {
    const msg =
      typeof result.data.error === "string" ? result.data.error : `HTTP ${result.status}`;
    return { exports: [], networkError: false, errorMessage: msg };
  }
  return { exports: result.data.exports, networkError: false, errorMessage: null };
}

export async function postLanguageExportAction<T extends Record<string, unknown>>(
  projectId: string,
  body: Record<string, unknown>
): Promise<{
  ok: boolean;
  status: number;
  data: T;
  networkError: boolean;
  errorKind: InstantExportClientErrorKind | null;
}> {
  const result = await fetchSameOriginJson<T>(languageExportsPath(projectId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const errorKind =
    result.networkError ?
      result.aborted ? "abort"
      : "network"
    : null;

  return {
    ok: result.ok && (result.data as { ok?: boolean }).ok !== false,
    status: result.status,
    data: result.data,
    networkError: result.networkError,
    errorKind,
  };
}

export type RebuildFinalVideoResponse = {
  error?: string;
  code?: string;
  rebuild?: {
    ok?: boolean;
    clipsReady?: boolean;
    message?: string;
    suggestRepair?: boolean;
    finalVideoUrlPresent?: boolean;
  };
  status?: InstantPremiumStatusResponse;
};

export async function postRebuildFinalVideo(
  projectId: string,
  options?: { sceneTexts?: InstantSceneText[]; versionNote?: string }
): Promise<{
  ok: boolean;
  status: number;
  data: RebuildFinalVideoResponse;
  networkError: boolean;
  errorKind: InstantExportClientErrorKind | null;
}> {
  const hasBody = Boolean(options?.sceneTexts || options?.versionNote?.trim());
  const result = await fetchSameOriginJson<RebuildFinalVideoResponse>(
    rebuildFinalVideoPath(projectId),
    {
      method: "POST",
      headers: hasBody ? { "Content-Type": "application/json" } : undefined,
      body: hasBody
        ? JSON.stringify({
            sceneTexts: options?.sceneTexts,
            versionNote: options?.versionNote?.trim() || undefined,
          })
        : undefined,
    }
  );

  const errorKind =
    result.networkError ?
      result.aborted ? "abort"
      : "network"
    : null;

  return {
    ok: result.ok,
    status: result.status,
    data: result.data,
    networkError: result.networkError,
    errorKind,
  };
}

export async function postFullRerenderInstantProject(
  projectId: string,
  options?: {
    sceneTexts?: InstantSceneText[];
    instantUserIntent?: string;
    instantTransitionSeconds?: number;
    instantSelectedChips?: unknown;
    versionNote?: string;
  }
): Promise<{
  ok: boolean;
  status: number;
  data: FullRerenderResponse & { error?: string };
  networkError: boolean;
  errorKind: InstantExportClientErrorKind | null;
}> {
  const hasBody =
    Boolean(options?.sceneTexts) ||
    Boolean(options?.instantUserIntent?.trim()) ||
    typeof options?.instantTransitionSeconds === "number" ||
    Boolean(options?.versionNote?.trim());

  const result = await fetchSameOriginJson<FullRerenderResponse & { error?: string }>(
    fullRerenderPath(projectId),
    {
      method: "POST",
      headers: hasBody ? { "Content-Type": "application/json" } : undefined,
      body: hasBody
        ? JSON.stringify({
            sceneTexts: options?.sceneTexts,
            instantUserIntent: options?.instantUserIntent?.trim() || undefined,
            instantTransitionSeconds: options?.instantTransitionSeconds,
            instantSelectedChips: options?.instantSelectedChips,
            versionNote: options?.versionNote?.trim() || undefined,
          })
        : undefined,
    }
  );

  const errorKind =
    result.networkError ?
      result.aborted ? "abort"
      : "network"
    : null;

  return {
    ok: result.ok && result.data.fullRerender?.ok === true,
    status: result.status,
    data: result.data,
    networkError: result.networkError,
    errorKind,
  };
}

/** @deprecated Use postFullRerenderInstantProject */
export const postFullRerender = postFullRerenderInstantProject;
