/**
 * Motion — resolve copy-as-draft source from selected slot (render / language export).
 */

import { parseSelectionKeyIds } from "@/lib/bundle-slot-identity";
import {
  hasPlayableOutputVideoUrl,
  isCompletedStatusToken,
  isProjectPlayablyComplete,
} from "@/lib/project-display-status";
import type {
  RenderPromptSnapshot,
  RenderSettingsSnapshot,
  RenderStoryboardSnapshot,
} from "@/lib/render-version-snapshots";
import type { AnimationProjectWithMedia } from "@/server/animation-projects/queries";
import type { ProjectRenderVersion, VideoLanguageExport } from "@prisma/client";

export const COPY_SOURCE_NOT_FOUND = "COPY_SOURCE_NOT_FOUND";

export type CopyAsDraftRequest = {
  renderVersionId?: string | null;
  languageExportId?: string | null;
  selectionKey?: string | null;
  sourceLanguage?: string | null;
  sourceVersion?: number | null;
};

export type CopyAsDraftProjectOverrides = {
  instantSceneTexts?: unknown;
  instantUserIntent?: string | null;
  instantSelectedChips?: unknown;
  instantMode?: string;
  instantTransitionSeconds?: number;
  instantOutputDurationSeconds?: number | null;
  instantStoryboardDurationSeconds?: number | null;
  stylePreset?: string | null;
  aspectRatio?: string | null;
  presetId?: string;
  instantLockedTextMode?: boolean;
  instantTextRenderMode?: string;
  instantHybridOverlayStyle?: string;
  languageTextLayersJson?: unknown;
  userPrompt?: string | null;
  intent?: string | null;
  globalPromptContext?: string | null;
};

export type ResolvedCopyAsDraftSource = {
  sourceLanguage: string;
  sourceVersion: number;
  renderVersion: ProjectRenderVersion | null;
  languageExport: VideoLanguageExport | null;
  overrides: CopyAsDraftProjectOverrides;
};

function parseIdsFromRequest(request: CopyAsDraftRequest): {
  renderVersionId?: string;
  languageExportId?: string;
} {
  const fromKey = parseSelectionKeyIds(request.selectionKey);
  return {
    renderVersionId: request.renderVersionId?.trim() || fromKey.renderVersionId,
    languageExportId: request.languageExportId?.trim() || fromKey.languageExportId,
  };
}

function overridesFromRenderVersion(
  renderVersion: ProjectRenderVersion
): CopyAsDraftProjectOverrides {
  const story = renderVersion.storyboardSnapshot as RenderStoryboardSnapshot | null;
  const settings = renderVersion.settingsSnapshot as RenderSettingsSnapshot | null;
  const prompt = renderVersion.promptSnapshot as RenderPromptSnapshot | null;
  const overrides: CopyAsDraftProjectOverrides = {};
  if (story?.instantSceneTexts != null) {
    overrides.instantSceneTexts = story.instantSceneTexts;
  }
  if (prompt) {
    overrides.userPrompt = prompt.userPrompt;
    overrides.intent = prompt.intent;
    overrides.globalPromptContext = prompt.globalPromptContext;
    overrides.instantUserIntent = prompt.instantUserIntent;
    overrides.instantSelectedChips = prompt.instantSelectedChips;
  }
  if (settings) {
    overrides.instantMode = settings.instantMode;
    overrides.instantTransitionSeconds = settings.instantTransitionSeconds;
    overrides.instantOutputDurationSeconds = settings.instantOutputDurationSeconds;
    overrides.instantStoryboardDurationSeconds = settings.instantStoryboardDurationSeconds;
    overrides.stylePreset = settings.stylePreset;
    overrides.aspectRatio = settings.aspectRatio;
    overrides.presetId = settings.presetId;
    overrides.instantLockedTextMode = settings.instantLockedTextMode;
    overrides.instantTextRenderMode = settings.instantTextRenderMode;
    overrides.instantHybridOverlayStyle = settings.instantHybridOverlayStyle;
    overrides.languageTextLayersJson = settings.languageTextLayersJson;
  }
  return overrides;
}

function overridesFromLanguageExport(
  languageExport: VideoLanguageExport
): CopyAsDraftProjectOverrides {
  const overrides: CopyAsDraftProjectOverrides = {};
  if (languageExport.sceneTextsJson != null) {
    overrides.instantSceneTexts = languageExport.sceneTextsJson;
  }
  if (languageExport.textLayerJson != null) {
    overrides.languageTextLayersJson = languageExport.textLayerJson;
  }
  return overrides;
}

export function isRenderVersionCopyReady(renderVersion: ProjectRenderVersion): boolean {
  return (
    isCompletedStatusToken(renderVersion.status) &&
    hasPlayableOutputVideoUrl(renderVersion.finalVideoUrl)
  );
}

export function isLanguageExportCopyReady(languageExport: VideoLanguageExport): boolean {
  return (
    isCompletedStatusToken(languageExport.status) &&
    hasPlayableOutputVideoUrl(languageExport.outputVideoUrl)
  );
}

export function isCopyAsDraftSourceReady(params: {
  project: AnimationProjectWithMedia;
  resolved: ResolvedCopyAsDraftSource;
}): boolean {
  if (params.project.images.length < 2) {
    return false;
  }
  if (params.resolved.renderVersion && isRenderVersionCopyReady(params.resolved.renderVersion)) {
    return true;
  }
  if (
    params.resolved.languageExport &&
    isLanguageExportCopyReady(params.resolved.languageExport)
  ) {
    return true;
  }
  const latestExport = params.project.exports[0] ?? null;
  return isProjectPlayablyComplete({
    projectStatus: params.project.status,
    exportStatus: latestExport?.status ?? null,
    outputVideoUrl: latestExport?.outputVideoUrl,
  });
}

/**
 * Priority: renderVersionId → languageExportId → project export fallback.
 */
export function resolveCopyAsDraftSource(
  project: AnimationProjectWithMedia,
  request: CopyAsDraftRequest
): ResolvedCopyAsDraftSource | null {
  const ids = parseIdsFromRequest(request);
  const fallbackLanguage = request.sourceLanguage?.trim() || "nl";
  const fallbackVersion =
    request.sourceVersion != null && request.sourceVersion > 0 ? request.sourceVersion : 1;

  if (ids.renderVersionId) {
    const renderVersion =
      project.renderVersions.find((row) => row.id === ids.renderVersionId) ?? null;
    if (!renderVersion || !isRenderVersionCopyReady(renderVersion)) {
      return null;
    }
    return {
      sourceLanguage: fallbackLanguage,
      sourceVersion: renderVersion.renderVersionNumber,
      renderVersion,
      languageExport: null,
      overrides: overridesFromRenderVersion(renderVersion),
    };
  }

  if (ids.languageExportId) {
    const languageExport =
      project.languageExports.find((row) => row.id === ids.languageExportId) ?? null;
    if (!languageExport || !isLanguageExportCopyReady(languageExport)) {
      return null;
    }
    return {
      sourceLanguage: languageExport.languageCode,
      sourceVersion: languageExport.version,
      renderVersion: null,
      languageExport,
      overrides: overridesFromLanguageExport(languageExport),
    };
  }

  const latestExport = project.exports[0] ?? null;
  const exportReady = isProjectPlayablyComplete({
    projectStatus: project.status,
    exportStatus: latestExport?.status ?? null,
    outputVideoUrl: latestExport?.outputVideoUrl,
  });
  const completedRender =
    project.renderVersions.find((row) => isRenderVersionCopyReady(row)) ?? null;

  if (!exportReady && !completedRender) {
    return null;
  }

  if (completedRender && !exportReady) {
    return {
      sourceLanguage: fallbackLanguage,
      sourceVersion: completedRender.renderVersionNumber,
      renderVersion: completedRender,
      languageExport: null,
      overrides: overridesFromRenderVersion(completedRender),
    };
  }

  return {
    sourceLanguage: fallbackLanguage,
    sourceVersion: fallbackVersion,
    renderVersion: null,
    languageExport: null,
    overrides: {},
  };
}
