/**
 * Language export render — request/response helpers and polling.
 */

import type { LanguageTextLayerRecord } from "@/lib/video-language-export";
import { LANGUAGE_EXPORT_OUTPUT_MISSING } from "@/lib/language-export-playback";
import { languageExportPrepareUrl } from "@/lib/language-export-prepare";
import type { VideoLanguageExportSummary } from "@/types/animation-api";

export type LanguageExportRenderPhase =
  | "idle"
  | "starting"
  | "rendering"
  | "completed"
  | "failed";

export type LanguageExportRenderApiResponse = {
  ok?: boolean;
  code?: string;
  message?: string;
  error?: string;
  exportId?: string | null;
  status?: string;
  outputVideoUrl?: string | null;
  languageCode?: string;
};

export type LanguageExportRenderUiResult = {
  phase: LanguageExportRenderPhase;
  exportId: string | null;
  status: string | null;
  outputVideoUrl: string | null;
  languageCode: string | null;
  error: string;
  info: string;
};

export type LanguageExportRenderDebug = {
  lastHttpStatus: number | null;
  lastApiOk: boolean | null;
  exportId: string | null;
  status: string | null;
  outputVideoUrlPresent: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  lastPollAtMs: number | null;
};

export type LanguageExportRenderMessages = {
  renderFailed: string;
  renderProgress: string;
  renderComplete: string;
  outputMissing: string;
};

export function buildLanguageExportRenderRequest(params: {
  languageCode: string;
  layers: LanguageTextLayerRecord[];
  exportId?: string | null;
}): {
  action: "render";
  languageCode: string;
  layers: LanguageTextLayerRecord[];
  exportId?: string;
} {
  const body: {
    action: "render";
    languageCode: string;
    layers: LanguageTextLayerRecord[];
    exportId?: string;
  } = {
    action: "render",
    languageCode: params.languageCode,
    layers: params.layers,
  };
  if (params.exportId?.trim()) {
    body.exportId = params.exportId.trim();
  }
  return body;
}

export function applyLanguageExportRenderStartResponse(params: {
  httpOk: boolean;
  httpStatus: number;
  data: LanguageExportRenderApiResponse;
  messages: LanguageExportRenderMessages;
}): LanguageExportRenderUiResult & { debug: LanguageExportRenderDebug } {
  const { httpOk, httpStatus, data, messages } = params;
  const exportId = data.exportId ?? null;
  const status = data.status ?? null;
  const debug: LanguageExportRenderDebug = {
    lastHttpStatus: httpStatus,
    lastApiOk: data.ok ?? (httpOk ? true : false),
    exportId,
    status,
    outputVideoUrlPresent: Boolean(data.outputVideoUrl?.trim()),
    errorCode: data.code ?? null,
    errorMessage: data.message ?? data.error ?? null,
    lastPollAtMs: null,
  };

  if (!httpOk || data.ok === false) {
    const message =
      data.message?.trim() ||
      data.error?.trim() ||
      messages.renderFailed;
    return {
      phase: "failed",
      exportId,
      status,
      outputVideoUrl: null,
      languageCode: data.languageCode ?? null,
      error: message,
      info: "",
      debug: { ...debug, lastApiOk: false, errorMessage: message },
    };
  }

  const outputUrl = data.outputVideoUrl?.trim() ?? null;
  if (status === "completed") {
    if (!outputUrl) {
      return {
        phase: "failed",
        exportId,
        status,
        outputVideoUrl: null,
        languageCode: data.languageCode ?? null,
        error: messages.outputMissing,
        info: "",
        debug: {
          ...debug,
          errorCode: LANGUAGE_EXPORT_OUTPUT_MISSING,
          errorMessage: messages.outputMissing,
        },
      };
    }
    return {
      phase: "completed",
      exportId,
      status,
      outputVideoUrl: outputUrl,
      languageCode: data.languageCode ?? null,
      error: "",
      info: messages.renderComplete,
      debug,
    };
  }

  return {
    phase: status === "failed" ? "failed" : "rendering",
    exportId,
    status,
    outputVideoUrl: outputUrl,
    languageCode: data.languageCode ?? null,
    error: status === "failed" ? (data.message ?? messages.renderFailed) : "",
    info: status === "failed" ? "" : messages.renderProgress,
    debug,
  };
}

export function applyLanguageExportPollRow(
  row: VideoLanguageExportSummary | undefined,
  messages: LanguageExportRenderMessages
): LanguageExportRenderUiResult | null {
  if (!row) {
    return null;
  }
  if (row.status === "completed") {
    const url = row.outputVideoUrl?.trim() ?? null;
    if (!url) {
      return {
        phase: "failed",
        exportId: row.id,
        status: row.status,
        outputVideoUrl: null,
        languageCode: row.languageCode,
        error: messages.outputMissing,
        info: "",
      };
    }
    return {
      phase: "completed",
      exportId: row.id,
      status: row.status,
      outputVideoUrl: url,
      languageCode: row.languageCode,
      error: "",
      info: messages.renderComplete,
    };
  }
  if (row.status === "failed") {
    return {
      phase: "failed",
      exportId: row.id,
      status: row.status,
      outputVideoUrl: null,
      languageCode: row.languageCode,
      error: row.errorMessage?.trim() || messages.renderFailed,
      info: "",
    };
  }
  return {
    phase: "rendering",
    exportId: row.id,
    status: row.status,
    outputVideoUrl: null,
    languageCode: row.languageCode,
    error: "",
    info: messages.renderProgress,
  };
}

export async function fetchProjectLanguageExports(
  projectId: string
): Promise<VideoLanguageExportSummary[]> {
  const res = await fetch(languageExportPrepareUrl(projectId), {
    credentials: "include",
  });
  const data = (await res.json().catch(() => ({}))) as {
    exports?: VideoLanguageExportSummary[];
    ok?: boolean;
  };
  if (!res.ok || !Array.isArray(data.exports)) {
    return [];
  }
  return data.exports;
}

export function logLanguageExportRenderUi(
  event: string,
  fields: Record<string, unknown>
): void {
  if (typeof console === "undefined") {
    return;
  }
  console.info("[language-export-ui]", { action: "render", event, ...fields });
}

const DRAFT_STORAGE_PREFIX = "hc-lang-export-draft:";
const PENDING_STORAGE_PREFIX = "hc-lang-export-pending:";

export type LanguageExportDraftStorage = {
  targetLang: string;
  textLayers: LanguageTextLayerRecord[];
  savedAt: string;
};

export type LanguageExportPendingStorage = {
  exportId: string;
  languageCode: string;
  savedAt: string;
};

export function saveLanguageExportDraft(
  projectId: string,
  draft: LanguageExportDraftStorage
): void {
  try {
    sessionStorage.setItem(`${DRAFT_STORAGE_PREFIX}${projectId}`, JSON.stringify(draft));
  } catch {
    /* ignore quota */
  }
}

export function loadLanguageExportDraft(
  projectId: string
): LanguageExportDraftStorage | null {
  try {
    const raw = sessionStorage.getItem(`${DRAFT_STORAGE_PREFIX}${projectId}`);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as LanguageExportDraftStorage;
  } catch {
    return null;
  }
}

export function saveLanguageExportPending(
  projectId: string,
  pending: LanguageExportPendingStorage
): void {
  try {
    sessionStorage.setItem(`${PENDING_STORAGE_PREFIX}${projectId}`, JSON.stringify(pending));
  } catch {
    /* ignore */
  }
}

export function loadLanguageExportPending(
  projectId: string
): LanguageExportPendingStorage | null {
  try {
    const raw = sessionStorage.getItem(`${PENDING_STORAGE_PREFIX}${projectId}`);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as LanguageExportPendingStorage;
  } catch {
    return null;
  }
}

export function clearLanguageExportPending(projectId: string): void {
  try {
    sessionStorage.removeItem(`${PENDING_STORAGE_PREFIX}${projectId}`);
  } catch {
    /* ignore */
  }
}
