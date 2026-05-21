/**
 * Client-side language export prepare — request body, response parsing, UI state.
 */

import type { LanguageTextLayerSourceStats } from "@/lib/canonical-language-text-layers";
import type { LanguageTextLayerRecord } from "@/lib/video-language-export";

export const LANGUAGE_EXPORT_NO_LAYERS = "NO_TRANSLATABLE_LAYERS";
export const LANGUAGE_EXPORT_TRANSLATION_FAILED = "TRANSLATION_FAILED";

export type LanguageExportPreparePhase =
  | "idle"
  | "loading_layers"
  | "translating"
  | "ready"
  | "failed";

export type LanguageExportPreviewDto = {
  layerId: string;
  dataUrl: string;
};

export type LanguageExportPrepareApiResponse = {
  ok?: boolean;
  code?: string;
  message?: string;
  error?: string;
  exportId?: string | null;
  languageCode?: string;
  layers?: LanguageTextLayerRecord[];
  textLayers?: LanguageTextLayerRecord[];
  previews?: LanguageExportPreviewDto[];
  translationProvider?: string | null;
  typographyRenderQuality?: string;
  translationFailed?: boolean;
  layerCount?: number;
  layerSourceStats?: LanguageTextLayerSourceStats;
};

export type LanguageExportPrepareMessages = {
  prepareFailed: string;
  noLayers: string;
  translationFailed: string;
};

export type LanguageExportPrepareUiResult = {
  phase: LanguageExportPreparePhase;
  layers: LanguageTextLayerRecord[];
  error: string;
  info: string;
  typographyQuality: string | null;
  debug: LanguageExportPrepareDebug;
};

export type LanguageExportPrepareDebug = {
  lastHttpStatus: number | null;
  lastApiOk: boolean | null;
  exportId: string | null;
  layerCount: number;
  translationProvider: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  layerSourceStats: LanguageTextLayerSourceStats | null;
};

export function buildLanguageExportPrepareRequest(languageCode: string): {
  action: "prepare";
  languageCode: string;
} {
  return { action: "prepare", languageCode };
}

export function languageExportPrepareUrl(projectId: string): string {
  return `/api/instant-premium/projects/${encodeURIComponent(projectId)}/language-exports`;
}

export function buildLanguageExportPreviews(
  layers: LanguageTextLayerRecord[]
): LanguageExportPreviewDto[] {
  return layers
    .filter((layer) => Boolean(layer.previewDataUrl?.trim()))
    .map((layer) => ({
      layerId: layer.id,
      dataUrl: layer.previewDataUrl!.trim(),
    }));
}

export function resolveLanguageExportPrepareLayers(
  data: LanguageExportPrepareApiResponse
): LanguageTextLayerRecord[] {
  if (Array.isArray(data.layers) && data.layers.length > 0) {
    return data.layers;
  }
  if (Array.isArray(data.textLayers)) {
    return data.textLayers;
  }
  return [];
}

export type LanguageExportPrepareButtonKey =
  | "instant.languageExport.loadTexts"
  | "instant.languageExport.loadTranslating"
  | "instant.languageExport.loadReady"
  | "instant.languageExport.loadFailed";

export function languageExportPrepareButtonKey(
  phase: LanguageExportPreparePhase,
  loading: boolean
): LanguageExportPrepareButtonKey {
  if (loading || phase === "loading_layers" || phase === "translating") {
    return "instant.languageExport.loadTranslating";
  }
  if (phase === "ready") {
    return "instant.languageExport.loadReady";
  }
  if (phase === "failed") {
    return "instant.languageExport.loadFailed";
  }
  return "instant.languageExport.loadTexts";
}

export function applyLanguageExportPrepareResponse(params: {
  httpOk: boolean;
  httpStatus: number;
  data: LanguageExportPrepareApiResponse;
  messages: LanguageExportPrepareMessages;
  previousTypographyQuality?: string;
}): LanguageExportPrepareUiResult {
  const { httpOk, httpStatus, data, messages, previousTypographyQuality } = params;
  const layers = resolveLanguageExportPrepareLayers(data);
  const layerCount =
    typeof data.layerCount === "number" ? data.layerCount : layers.length;
  const debug: LanguageExportPrepareDebug = {
    lastHttpStatus: httpStatus,
    lastApiOk: data.ok ?? (httpOk && layers.length > 0 ? true : httpOk ? false : null),
    exportId: data.exportId ?? null,
    layerCount,
    translationProvider: data.translationProvider ?? null,
    errorCode: data.code ?? null,
    errorMessage: data.message ?? data.error ?? null,
    layerSourceStats: data.layerSourceStats ?? null,
  };

  const typographyQuality =
    data.typographyRenderQuality?.trim() ||
    previousTypographyQuality ||
    null;

  if (!httpOk || data.ok === false) {
    const code = data.code ?? "";
    const message =
      data.message?.trim() ||
      data.error?.trim() ||
      (code === LANGUAGE_EXPORT_NO_LAYERS
        ? messages.noLayers
        : messages.prepareFailed);
    return {
      phase: "failed",
      layers: [],
      error: message,
      info: "",
      typographyQuality,
      debug: {
        ...debug,
        lastApiOk: false,
        errorCode: code || debug.errorCode,
        errorMessage: message,
        layerCount: 0,
      },
    };
  }

  if (layers.length === 0 || layerCount === 0) {
    return {
      phase: "failed",
      layers: [],
      error: messages.noLayers,
      info: "",
      typographyQuality,
      debug: {
        ...debug,
        lastApiOk: false,
        errorCode: LANGUAGE_EXPORT_NO_LAYERS,
        errorMessage: messages.noLayers,
        layerCount: 0,
      },
    };
  }

  const translationFailed = Boolean(data.translationFailed);
  const info = translationFailed ? messages.translationFailed : "";

  return {
    phase: "ready",
    layers,
    error: "",
    info,
    typographyQuality,
    debug: {
      ...debug,
      lastApiOk: true,
      layerCount: layers.length,
      errorCode: translationFailed ? LANGUAGE_EXPORT_TRANSLATION_FAILED : null,
      errorMessage: translationFailed ? messages.translationFailed : null,
    },
  };
}

export function logLanguageExportUi(
  event: string,
  fields: Record<string, unknown>
): void {
  if (typeof console === "undefined") {
    return;
  }
  console.info("[language-export-ui]", { event, ...fields });
}
