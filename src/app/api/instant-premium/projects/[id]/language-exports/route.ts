import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { getAnimationProjectByIdForViewer } from "@/server/animation-projects/queries";
import { isInstantLikeProject } from "@/server/instant-premium/instant-project-utils";
import { VideoToolsMissingError } from "@/lib/ffmpeg/resolve-ffmpeg-binaries";
import {
  createAndRenderLanguageExport,
  listVideoLanguageExports,
  prepareLanguageExport,
  rerenderLanguageExport,
  updateLanguageExportTexts,
  LanguageExportPrepareError,
  LANGUAGE_EXPORT_IN_PROGRESS,
  LANGUAGE_EXPORT_LIMIT,
  LANGUAGE_EXPORT_NO_BASE,
} from "@/server/instant-premium/language-export-service";
import { LANGUAGE_EXPORT_NO_CLEAN } from "@/lib/story-language-export";
import {
  isLanguageExportCode,
  parseLanguageTextLayerJson,
  type LanguageExportCode,
  type LanguageTextLayerRecord,
} from "@/lib/video-language-export";
import type { InstantSceneText } from "@/lib/story-overlay-templates";
import { parseSceneTextsJson } from "@/lib/translate-scene-texts";
import { parseInstantMode } from "@/lib/instant-premium-mode-types";
import { projectUsesStoryOverlay } from "@/lib/story-language-export";
import { withEstimatedCredits } from "@/server/studio-account/studio-billed-route";
import {
  resolveAudioRouteIdempotencyKey,
  runAudioGenerationJobRoute,
} from "@/server/studio-generation/run-audio-generation-job-route";
import type { SessionUser } from "@/server/auth/session";

async function runTranslationJobRoute<T>(input: {
  request: Request;
  user: Pick<SessionUser, "id" | "email" | "role">;
  projectId: string;
  clientMutationId?: string | null;
  fingerprint: string;
  confirmed?: boolean;
  execute: () => Promise<T>;
  isFailure: (result: T) => boolean;
  getOutputAssetId: (result: T) => string | null;
  mapSuccess: (result: T, estimatedCredits?: number) => Record<string, unknown>;
  mapFailure: (result: T) => { error: string; code: string; status?: number };
}): Promise<import("next/server").NextResponse> {
  const idempotencyKey = resolveAudioRouteIdempotencyKey({
    request: input.request,
    clientMutationId: input.clientMutationId,
    fallbackPrefix: `translate:${input.projectId}`,
    operationFingerprint: input.fingerprint,
  });
  return runAudioGenerationJobRoute({
    user: input.user,
    capability: "TRANSLATE",
    actionType: "translation_export",
    idempotencyKey,
    projectId: input.projectId,
    confirmed: input.confirmed,
    inputSnapshot: {
      projectId: input.projectId,
      fingerprint: input.fingerprint,
      action: "translation_export",
    },
    execute: input.execute,
    isFailure: input.isFailure,
    getOutputAssetId: input.getOutputAssetId,
    mapSuccess: input.mapSuccess,
    mapFailure: input.mapFailure,
  });
}

type RouteContext = { params: Promise<{ id: string }> };

function mapExportRow(row: Awaited<ReturnType<typeof listVideoLanguageExports>>[number]) {
  return {
    id: row.id,
    languageCode: row.languageCode,
    languageLabel: row.languageLabel,
    status: row.status,
    outputVideoUrl: row.outputVideoUrl,
    sourceFinalVideoUrl: row.sourceFinalVideoUrl,
    sourceCleanVideoUrl: row.sourceCleanVideoUrl,
    overlayRenderMode: row.overlayRenderMode,
    sceneTextsJson: row.sceneTextsJson,
    textLayerJson: row.textLayerJson,
    translationProvider: row.translationProvider,
    isDefault: row.isDefault,
    version: row.version,
    errorMessage: row.errorMessage,
    versionNote: row.versionNote,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }
  const { id: projectId } = await context.params;
  const project = await getAnimationProjectByIdForViewer(projectId, user);
  if (!project || !isInstantLikeProject(project)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const exports = await listVideoLanguageExports(projectId);
  const latestExport = project.exports.find((e) => e.outputVideoUrl?.trim());
  return NextResponse.json({
    ok: true,
    cleanVideoUrl: project.instantCleanFinalVideoUrl?.trim() || null,
    finalVideoUrl: latestExport?.outputVideoUrl?.trim() || null,
    instantMode: parseInstantMode(project.instantMode),
    instantTransitionSeconds: project.instantTransitionSeconds ?? 5,
    usesStoryOverlay: projectUsesStoryOverlay(project),
    instantSceneTexts: project.instantSceneTexts ?? null,
    exports: exports.map(mapExportRow),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }
  const { id: projectId } = await context.params;
  const project = await getAnimationProjectByIdForViewer(projectId, user);
  if (!project || !isInstantLikeProject(project)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const raw = body as {
    action?: string;
    languageCode?: string;
    textLayers?: LanguageTextLayerRecord[];
    sceneTexts?: InstantSceneText[];
    exportId?: string;
    versionNote?: string;
    clientMutationId?: string;
    confirmed?: boolean;
  };
  const clientMutationId =
    typeof raw.clientMutationId === "string" && raw.clientMutationId.trim()
      ? raw.clientMutationId.trim().slice(0, 128)
      : null;
  const confirmed = raw.confirmed === true;

  if (raw.action === "update") {
    if (!raw.exportId?.trim()) {
      return NextResponse.json(
        { ok: false, code: "INVALID_EXPORT", message: "exportId required." },
        { status: 400 }
      );
    }
    try {
      await updateLanguageExportTexts({
        exportId: raw.exportId.trim(),
        viewer: user,
        sceneTexts: Array.isArray(raw.sceneTexts) ? parseSceneTextsJson(raw.sceneTexts) : undefined,
        textLayers: Array.isArray(raw.textLayers)
          ? parseLanguageTextLayerJson(raw.textLayers)
          : undefined,
      });
      const exports = await listVideoLanguageExports(projectId);
      return NextResponse.json({ ok: true, exports: exports.map(mapExportRow) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update failed.";
      return NextResponse.json({ ok: false, code: "UPDATE_FAILED", message }, { status: 400 });
    }
  }

  if (raw.action === "rerender") {
    if (!raw.exportId?.trim()) {
      return NextResponse.json(
        { ok: false, code: "INVALID_EXPORT", message: "exportId required." },
        { status: 400 }
      );
    }
    return runTranslationJobRoute({
      request,
      user,
      projectId,
      clientMutationId,
      confirmed,
      fingerprint: `translation_export:rerender:${projectId}:${raw.exportId.trim()}`,
      execute: async () => {
        try {
          const { exportId } = await rerenderLanguageExport({
            exportId: raw.exportId!.trim(),
            viewer: user,
          });
          const exports = await listVideoLanguageExports(projectId);
          const created = exports.find((e) => e.id === exportId);
          return { ok: true as const, exportId, created, exports };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Rerender failed.";
          const code =
            message === LANGUAGE_EXPORT_IN_PROGRESS ? LANGUAGE_EXPORT_IN_PROGRESS : "RERENDER_FAILED";
          return { ok: false as const, code, message };
        }
      },
      isFailure: (result) => !result.ok,
      getOutputAssetId: (result) => (result.ok ? result.exportId : null),
      mapFailure: (result) =>
        result.ok
          ? { error: "Rerender failed.", code: "RERENDER_FAILED" }
          : { error: result.message, code: result.code },
      mapSuccess: (result, estimatedCredits) => {
        if (!result.ok) {
          return { ok: false, code: result.code, message: result.message };
        }
        return withEstimatedCredits(
          {
            ok: true,
            exportId: result.exportId,
            status: result.created?.status ?? "queued",
            export: result.created ? mapExportRow(result.created) : null,
            exports: result.exports.map(mapExportRow),
          },
          estimatedCredits
        );
      },
    });
  }

  if (raw.action === "prepare") {
    if (!raw.languageCode || !isLanguageExportCode(raw.languageCode)) {
      return NextResponse.json(
        { ok: false, code: "INVALID_LANGUAGE", message: "Invalid languageCode." },
        { status: 400 }
      );
    }
    return runTranslationJobRoute({
      request,
      user,
      projectId,
      clientMutationId,
      confirmed,
      fingerprint: `translation_export:prepare:${projectId}:${raw.languageCode}`,
      execute: async () => {
        try {
          const prepared = await prepareLanguageExport({
            projectId,
            languageCode: raw.languageCode as LanguageExportCode,
            textLayerOverrides: raw.textLayers,
            sceneTextOverrides: Array.isArray(raw.sceneTexts)
              ? parseSceneTextsJson(raw.sceneTexts)
              : undefined,
            viewer: user,
          });
          return { ok: true as const, prepared };
        } catch (error) {
          if (error instanceof LanguageExportPrepareError) {
            return { ok: false as const, code: error.code, message: error.message, httpStatus: 200 };
          }
          const message = error instanceof Error ? error.message : "Prepare failed.";
          return { ok: false as const, code: "PREPARE_FAILED", message, httpStatus: 400 };
        }
      },
      isFailure: (result) => !result.ok,
      getOutputAssetId: (result) => {
        if (!result.ok) return null;
        if ("exportId" in result.prepared && result.prepared.exportId) {
          return result.prepared.exportId;
        }
        return `prepare:${projectId}:${raw.languageCode}`;
      },
      mapFailure: (result) =>
        result.ok
          ? { error: "Prepare failed.", code: "PREPARE_FAILED" }
          : { error: result.message, code: result.code, status: result.httpStatus },
      mapSuccess: (result, estimatedCredits) => {
        if (!result.ok) {
          return { ok: false, code: result.code, message: result.message };
        }
        const prepared = result.prepared;
        if (prepared.mode === "story_overlay") {
          return withEstimatedCredits(
            {
              ok: true,
              mode: "story_overlay",
              languageCode: raw.languageCode,
              exportId: prepared.exportId ?? null,
              sceneTexts: prepared.sceneTexts,
              translationProvider: prepared.translationProvider,
              translationFailed: prepared.translationFailed ?? false,
              message: prepared.message,
              sourceLanguage: prepared.sourceLanguage,
              targetLanguage: prepared.targetLanguage,
            },
            estimatedCredits
          );
        }
        return withEstimatedCredits(
          {
            ok: true,
            mode: "typography",
            exportId: null,
            languageCode: raw.languageCode,
            layers: prepared.layers,
            textLayers: prepared.textLayers,
            previews: prepared.previews,
            layerCount: prepared.layerCount,
            translationProvider: prepared.translationProvider,
            typographyRenderQuality: prepared.typographyRenderQuality,
            translationFailed: prepared.translationFailed,
            message: prepared.message,
            layerSourceStats: prepared.layerSourceStats,
          },
          estimatedCredits
        );
      },
    });
  }

  const isRenderAction = raw.action === "render" || raw.action === undefined;

  if (!isRenderAction) {
    return NextResponse.json(
      { ok: false, code: "INVALID_ACTION", message: "Unsupported action." },
      { status: 400 }
    );
  }

  if (!raw.languageCode || !isLanguageExportCode(raw.languageCode)) {
    return NextResponse.json(
      { ok: false, code: "INVALID_LANGUAGE", message: "Invalid languageCode." },
      { status: 400 }
    );
  }

  if (raw.languageCode === "original") {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_LANGUAGE",
        message: "Use the default final video for the original language.",
      },
      { status: 400 }
    );
  }

  const overrides = Array.isArray(raw.textLayers)
    ? parseLanguageTextLayerJson(raw.textLayers)
    : undefined;
  const sceneOverrides = Array.isArray(raw.sceneTexts)
    ? parseSceneTextsJson(raw.sceneTexts)
    : undefined;

  return runTranslationJobRoute({
    request,
    user,
    projectId,
    clientMutationId,
    confirmed,
    fingerprint: `translation_export:render:${projectId}:${raw.languageCode}:${raw.exportId?.trim() ?? "new"}`,
    execute: async () => {
      try {
        const { exportId } = await createAndRenderLanguageExport({
          projectId,
          viewer: user,
          languageCode: raw.languageCode as LanguageExportCode,
          textLayerOverrides: overrides,
          sceneTextOverrides: sceneOverrides,
          exportId: raw.exportId?.trim() || undefined,
          versionNote: raw.versionNote?.trim() || undefined,
        });
        const exports = await listVideoLanguageExports(projectId);
        const created = exports.find((e) => e.id === exportId);
        const status = created?.status ?? "queued";
        const outputVideoUrl = created?.outputVideoUrl?.trim() ?? null;
        if (status === "completed" && !outputVideoUrl) {
          return {
            ok: false as const,
            code: "LANGUAGE_EXPORT_OUTPUT_MISSING",
            message: "Language export completed without an output video URL.",
            exportId,
            status,
            languageCode: raw.languageCode,
          };
        }
        return {
          ok: true as const,
          exportId,
          status,
          outputVideoUrl,
          languageCode: raw.languageCode,
          created,
          exports,
        };
      } catch (error) {
        if (error instanceof VideoToolsMissingError) {
          return {
            ok: false as const,
            code: error.code,
            message: error.message,
            exportId: raw.exportId ?? null,
            status: "failed",
            languageCode: raw.languageCode,
            httpStatus: 400,
          };
        }
        const message = error instanceof Error ? error.message : "Language export failed.";
        const code =
          message === LANGUAGE_EXPORT_LIMIT
            ? LANGUAGE_EXPORT_LIMIT
            : message === LANGUAGE_EXPORT_IN_PROGRESS
              ? LANGUAGE_EXPORT_IN_PROGRESS
              : message === LANGUAGE_EXPORT_NO_BASE
                ? LANGUAGE_EXPORT_NO_BASE
                : message === LANGUAGE_EXPORT_NO_CLEAN
                  ? LANGUAGE_EXPORT_NO_CLEAN
                  : "LANGUAGE_EXPORT_FAILED";
        return {
          ok: false as const,
          code,
          message,
          exportId: raw.exportId ?? null,
          status: "failed",
          languageCode: raw.languageCode,
          httpStatus: 400,
        };
      }
    },
    isFailure: (result) => !result.ok,
    getOutputAssetId: (result) => (result.ok ? result.exportId : null),
    mapFailure: (result) =>
      result.ok
        ? { error: "Language export failed.", code: "LANGUAGE_EXPORT_FAILED" }
        : {
            error: result.message,
            code: result.code,
            status: "httpStatus" in result ? result.httpStatus : 400,
          },
    mapSuccess: (result, estimatedCredits) => {
      if (!result.ok) {
        return {
          ok: false,
          code: result.code,
          message: result.message,
          exportId: result.exportId ?? null,
          status: result.status ?? "failed",
          languageCode: result.languageCode,
        };
      }
      return withEstimatedCredits(
        {
          ok: true,
          exportId: result.exportId,
          status: result.status,
          outputVideoUrl: result.outputVideoUrl,
          languageCode: result.languageCode,
          export: result.created ? mapExportRow(result.created) : null,
          exports: result.exports.map(mapExportRow),
        },
        estimatedCredits
      );
    },
  });
}
