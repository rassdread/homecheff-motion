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
  type LanguageTextLayerRecord,
} from "@/lib/video-language-export";
import type { InstantSceneText } from "@/lib/story-overlay-templates";
import { parseSceneTextsJson } from "@/lib/translate-scene-texts";
import { parseInstantMode } from "@/lib/instant-premium-mode-types";
import { projectUsesStoryOverlay } from "@/lib/story-language-export";

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
  };

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
    try {
      const { exportId } = await rerenderLanguageExport({
        exportId: raw.exportId.trim(),
        viewer: user,
      });
      const exports = await listVideoLanguageExports(projectId);
      const created = exports.find((e) => e.id === exportId);
      return NextResponse.json({
        ok: true,
        exportId,
        status: created?.status ?? "queued",
        export: created ? mapExportRow(created) : null,
        exports: exports.map(mapExportRow),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Rerender failed.";
      const code =
        message === LANGUAGE_EXPORT_IN_PROGRESS ? LANGUAGE_EXPORT_IN_PROGRESS : "RERENDER_FAILED";
      return NextResponse.json({ ok: false, code, message }, { status: 400 });
    }
  }

  if (raw.action === "prepare") {
    if (!raw.languageCode || !isLanguageExportCode(raw.languageCode)) {
      return NextResponse.json(
        { ok: false, code: "INVALID_LANGUAGE", message: "Invalid languageCode." },
        { status: 400 }
      );
    }
    try {
      const prepared = await prepareLanguageExport({
        projectId,
        languageCode: raw.languageCode,
        textLayerOverrides: raw.textLayers,
        sceneTextOverrides: Array.isArray(raw.sceneTexts)
          ? parseSceneTextsJson(raw.sceneTexts)
          : undefined,
        viewer: user,
      });
      if (prepared.mode === "story_overlay") {
        return NextResponse.json({
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
        });
      }
      return NextResponse.json({
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
      });
    } catch (error) {
      if (error instanceof LanguageExportPrepareError) {
        return NextResponse.json(
          { ok: false, code: error.code, message: error.message },
          { status: 200 }
        );
      }
      const message = error instanceof Error ? error.message : "Prepare failed.";
      return NextResponse.json(
        { ok: false, code: "PREPARE_FAILED", message },
        { status: 400 }
      );
    }
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

  try {
    const { exportId } = await createAndRenderLanguageExport({
      projectId,
      viewer: user,
      languageCode: raw.languageCode,
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
      return NextResponse.json({
        ok: false,
        code: "LANGUAGE_EXPORT_OUTPUT_MISSING",
        message: "Language export completed without an output video URL.",
        exportId,
        status,
        languageCode: raw.languageCode,
      });
    }

    return NextResponse.json({
      ok: true,
      exportId,
      status,
      outputVideoUrl,
      languageCode: raw.languageCode,
      export: created ? mapExportRow(created) : null,
      exports: exports.map(mapExportRow),
    });
  } catch (error) {
    if (error instanceof VideoToolsMissingError) {
      return NextResponse.json(
        {
          ok: false,
          code: error.code,
          message: error.message,
          exportId: raw.exportId ?? null,
          status: "failed",
          languageCode: raw.languageCode,
        },
        { status: 400 }
      );
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
    return NextResponse.json(
      {
        ok: false,
        code,
        message,
        exportId: raw.exportId ?? null,
        status: "failed",
        languageCode: raw.languageCode,
      },
      { status: 400 }
    );
  }
}
