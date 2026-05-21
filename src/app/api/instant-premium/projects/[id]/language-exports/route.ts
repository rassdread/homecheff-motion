import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { getAnimationProjectByIdForViewer } from "@/server/animation-projects/queries";
import { isInstantLikeProject } from "@/server/instant-premium/instant-project-utils";
import {
  createAndRenderLanguageExport,
  listVideoLanguageExports,
  prepareLanguageTextLayers,
  LANGUAGE_EXPORT_IN_PROGRESS,
  LANGUAGE_EXPORT_LIMIT,
  LANGUAGE_EXPORT_NO_BASE,
} from "@/server/instant-premium/language-export-service";
import {
  isLanguageExportCode,
  parseLanguageTextLayerJson,
  type LanguageTextLayerRecord,
} from "@/lib/video-language-export";

type RouteContext = { params: Promise<{ id: string }> };

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
  return NextResponse.json({
    exports: exports.map((row) => ({
      id: row.id,
      languageCode: row.languageCode,
      languageLabel: row.languageLabel,
      status: row.status,
      outputVideoUrl: row.outputVideoUrl,
      sourceFinalVideoUrl: row.sourceFinalVideoUrl,
      textLayerJson: row.textLayerJson,
      translationProvider: row.translationProvider,
      isDefault: row.isDefault,
      version: row.version,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
    })),
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
  };

  if (raw.action === "prepare") {
    if (!raw.languageCode || !isLanguageExportCode(raw.languageCode)) {
      return NextResponse.json({ error: "Invalid languageCode." }, { status: 400 });
    }
    try {
      const prepared = await prepareLanguageTextLayers({
        projectId,
        languageCode: raw.languageCode,
        textLayerOverrides: raw.textLayers,
      });
      return NextResponse.json({
        ok: true,
        languageCode: raw.languageCode,
        textLayers: prepared.layers,
        translationProvider: prepared.translationProvider,
        typographyRenderQuality: prepared.typographyRenderQuality,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Prepare failed." },
        { status: 400 }
      );
    }
  }

  if (!raw.languageCode || !isLanguageExportCode(raw.languageCode)) {
    return NextResponse.json({ error: "Invalid languageCode." }, { status: 400 });
  }

  if (raw.languageCode === "original") {
    return NextResponse.json(
      { error: "Use the default final video for the original language." },
      { status: 400 }
    );
  }

  const overrides = Array.isArray(raw.textLayers)
    ? parseLanguageTextLayerJson(raw.textLayers)
    : undefined;

  try {
    const { exportId } = await createAndRenderLanguageExport({
      projectId,
      viewer: user,
      languageCode: raw.languageCode,
      textLayerOverrides: overrides,
    });
    const exports = await listVideoLanguageExports(projectId);
    const created = exports.find((e) => e.id === exportId);
    return NextResponse.json({
      ok: true,
      exportId,
      export: created
        ? {
            id: created.id,
            languageCode: created.languageCode,
            languageLabel: created.languageLabel,
            status: created.status,
            textLayerJson: created.textLayerJson,
          }
        : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Language export failed.";
    const code =
      message === LANGUAGE_EXPORT_LIMIT
        ? LANGUAGE_EXPORT_LIMIT
        : message === LANGUAGE_EXPORT_IN_PROGRESS
          ? LANGUAGE_EXPORT_IN_PROGRESS
          : message === LANGUAGE_EXPORT_NO_BASE
            ? LANGUAGE_EXPORT_NO_BASE
            : "LANGUAGE_EXPORT_FAILED";
    return NextResponse.json({ error: message, code }, { status: 400 });
  }
}
