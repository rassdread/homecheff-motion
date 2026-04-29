import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { discardExportChainForProject } from "@/server/animation-export/service";
import { requireActiveUser } from "@/server/auth/permissions";
import { getAnimationProjectByIdForViewer } from "@/server/animation-projects/queries";
import type { AnimationProjectDetailResponse } from "@/types/animation-api";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function mapToDetailResponse(
  project: NonNullable<Awaited<ReturnType<typeof getAnimationProjectByIdForViewer>>>,
  viewerRole: string
): AnimationProjectDetailResponse {
  const ownerRecord =
    "owner" in project && project.owner && typeof project.owner === "object" && "email" in project.owner
      ? (project.owner as { email: string })
      : null;
  const ownerEmail = viewerRole === "admin" && ownerRecord ? ownerRecord.email : undefined;

  return {
    id: project.id,
    status: project.status,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    advancedSettingsEnabled: project.advancedSettingsEnabled,
    images: project.images.map((img) => ({
      id: img.id,
      order: img.order,
      fileName: img.fileName,
      previewUrl: img.previewUrl,
    })),
    transitions: project.transitions.map((t) => ({
      id: t.id,
      order: t.order,
      startImageId: t.startImageId,
      endImageId: t.endImageId,
      status: t.status,
      progress: t.progress,
      outputVideoUrl: t.outputVideoUrl,
      errorMessage: t.errorMessage,
    })),
    exports: project.exports.map((e) => ({
      status: e.status,
      progress: e.progress,
      provider: e.provider,
      providerJobId: e.providerJobId,
      outputVideoUrl: e.outputVideoUrl,
      errorMessage: e.errorMessage,
    })),
    intent: project.intent,
    presetId: project.presetId,
    viduModel: project.viduModel,
    viduResolution: project.viduResolution,
    viduDurationSeconds: project.viduDurationSeconds,
    estimatedCredits: project.estimatedCredits,
    userPrompt: project.userPrompt,
    projectType: project.projectType,
    stylePreset: project.stylePreset,
    instantOutputDurationSeconds: project.instantOutputDurationSeconds,
    instantSelectedChips: project.instantSelectedChips,
    instantUserIntent: project.instantUserIntent,
    ownerEmail,
  };
}

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const project = await getAnimationProjectByIdForViewer(id, user);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const body = mapToDetailResponse(project, user.role);
  return NextResponse.json(body, { status: 200 });
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const existing = await getAnimationProjectByIdForViewer(id, user);
  if (!existing) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  try {
    discardExportChainForProject(id);
    await prisma.animationProject.delete({ where: { id } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
