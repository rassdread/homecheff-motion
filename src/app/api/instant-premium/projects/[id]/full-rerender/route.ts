import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  FULL_RERENDER_ALREADY_RUNNING,
  FULL_RERENDER_FORBIDDEN,
  FULL_RERENDER_NOT_READY,
  FULL_RERENDER_WRONG_TYPE,
  fullRerenderInstantPremiumProjectWithStatus,
} from "@/server/instant-premium/full-rerender-project";
import { buildFullRerenderRenderBodyFromDraft } from "@/lib/full-rerender-draft";
import { persistFullRerenderSettingsForProject } from "@/server/instant-premium/persist-full-rerender-settings";
import { persistFullRerenderImagesForProject } from "@/server/instant-premium/persist-full-rerender-images";
import {
  deleteFullRerenderDraft,
  getFullRerenderDraftForProject,
} from "@/server/instant-premium/full-rerender-draft-service";
import { startDraftInstantPremiumProjectRender } from "@/server/instant-premium/start-draft-project-render";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  type FullRerenderBody = {
    sceneTexts?: unknown;
    instantUserIntent?: string;
    instantTransitionSeconds?: number;
    instantSelectedChips?: unknown;
    versionNote?: string;
    rerenderSource?: "quick" | "editor";
    imageChanges?: {
      sequence?: Array<{
        imageId?: string;
        fileName: string;
        previewUrl: string;
        workingImageUrl: string;
        workingStorageKey?: string;
        thumbnailUrl?: string;
        mimeType?: string;
        sizeBytes?: number;
      }>;
      replacedImageIds?: string[];
    };
  };
  let body: FullRerenderBody | null = null;
  try {
    body = (await request.json().catch(() => null)) as FullRerenderBody | null;
  } catch {
    body = null;
  }

  const projectRow = await prisma.animationProject.findUnique({
    where: { id },
    select: { status: true, ownerId: true },
  });
  if (!projectRow) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  if (user.role !== "admin" && projectRow.ownerId !== user.id) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  if (projectRow.status === "draft") {
    let effectiveBody = body;
    if (body?.rerenderSource === "editor") {
      const draft = await getFullRerenderDraftForProject(id);
      if (draft) {
        const fromDraft = buildFullRerenderRenderBodyFromDraft(draft);
        effectiveBody = {
          ...body,
          sceneTexts: fromDraft.sceneTexts,
          instantUserIntent: fromDraft.instantUserIntent,
          instantTransitionSeconds: fromDraft.instantTransitionSeconds,
          versionNote: fromDraft.versionNote ?? body.versionNote,
          imageChanges: fromDraft.imageChanges,
        };
      }
    }
    if (effectiveBody?.sceneTexts !== undefined || effectiveBody?.imageChanges?.sequence?.length) {
      if (effectiveBody.imageChanges?.sequence?.length) {
        const persistedImages = await persistFullRerenderImagesForProject(id, {
          sequence: effectiveBody.imageChanges.sequence,
          replacedImageIds: effectiveBody.imageChanges.replacedImageIds,
        });
        if (!persistedImages.ok) {
          return NextResponse.json({ error: persistedImages.error }, { status: persistedImages.status });
        }
      }
      const settingsBody = {
        sceneTexts: effectiveBody.sceneTexts,
        instantUserIntent: effectiveBody.instantUserIntent,
        instantTransitionSeconds: effectiveBody.instantTransitionSeconds,
        versionNote: effectiveBody.versionNote,
      };
      const hasSettings =
        settingsBody.sceneTexts !== undefined ||
        typeof settingsBody.instantUserIntent === "string" ||
        typeof settingsBody.instantTransitionSeconds === "number";
      if (hasSettings) {
        const persisted = await persistFullRerenderSettingsForProject(id, settingsBody);
        if (!persisted.ok) {
          return NextResponse.json({ error: persisted.error }, { status: persisted.status });
        }
      }
    }

    const draftRender = await startDraftInstantPremiumProjectRender({
      projectId: id,
      userId: user.id,
      isAdmin: user.role === "admin",
    });
    const httpStatus = draftRender.ok ? 200 : 400;
    return NextResponse.json(
      { fullRerender: draftRender, draftRender },
      { status: httpStatus }
    );
  }

  let effectiveBody = body;
  if (body?.rerenderSource === "editor") {
    const draft = await getFullRerenderDraftForProject(id);
    if (draft) {
      const fromDraft = buildFullRerenderRenderBodyFromDraft(draft);
      effectiveBody = {
        ...body,
        sceneTexts: fromDraft.sceneTexts,
        instantUserIntent: fromDraft.instantUserIntent,
        instantTransitionSeconds: fromDraft.instantTransitionSeconds,
        versionNote: fromDraft.versionNote ?? body.versionNote,
        imageChanges: fromDraft.imageChanges,
      };
    }
  }

  const settingsBody =
    effectiveBody ?
      {
        sceneTexts: effectiveBody.sceneTexts,
        instantUserIntent: effectiveBody.instantUserIntent,
        instantTransitionSeconds: effectiveBody.instantTransitionSeconds,
        instantSelectedChips: effectiveBody.instantSelectedChips,
        versionNote: effectiveBody.versionNote,
      }
    : null;
  const hasSettingsToPersist = Boolean(
    settingsBody &&
      (settingsBody.sceneTexts !== undefined ||
        typeof settingsBody.instantUserIntent === "string" ||
        typeof settingsBody.instantTransitionSeconds === "number" ||
        settingsBody.instantSelectedChips !== undefined ||
        Boolean(settingsBody.versionNote?.trim()))
  );

  let imageChangeAudit = null;
  const imageSequence = effectiveBody?.imageChanges?.sequence;
  if (imageSequence && imageSequence.length > 0) {
    const persistedImages = await persistFullRerenderImagesForProject(id, {
      sequence: imageSequence,
      replacedImageIds: effectiveBody?.imageChanges?.replacedImageIds,
    });
    if (!persistedImages.ok) {
      return NextResponse.json({ error: persistedImages.error }, { status: persistedImages.status });
    }
    imageChangeAudit = persistedImages.imageChangeAudit;
  }

  if (hasSettingsToPersist && settingsBody) {
    const persisted = await persistFullRerenderSettingsForProject(id, settingsBody);
    if (!persisted.ok) {
      return NextResponse.json({ error: persisted.error }, { status: persisted.status });
    }
  }

  try {
    const result = await fullRerenderInstantPremiumProjectWithStatus({
      projectId: id,
      userId: user.id,
      isAdmin: user.role === "admin",
      sceneTexts: effectiveBody?.sceneTexts,
      versionNote: effectiveBody?.versionNote?.trim() || undefined,
      rerenderSource: effectiveBody?.rerenderSource,
      imageChangeAudit,
    });

    if (result.fullRerender.ok && effectiveBody?.rerenderSource === "editor") {
      await deleteFullRerenderDraft(id);
    }
    const httpStatus = result.fullRerender.ok
      ? 200
      : result.fullRerender.code === FULL_RERENDER_ALREADY_RUNNING
        ? 409
        : result.fullRerender.code === FULL_RERENDER_FORBIDDEN
          ? 403
          : result.fullRerender.code === FULL_RERENDER_WRONG_TYPE
            ? 409
            : result.fullRerender.code === FULL_RERENDER_NOT_READY
              ? 400
              : 400;
    return NextResponse.json(
      {
        fullRerender: result.fullRerender,
        status: result.status,
      },
      { status: httpStatus }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Full rerender failed." },
      { status: 500 }
    );
  }
}
