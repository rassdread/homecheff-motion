import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/server/auth/permissions";
import type { PatchAnimationProjectStatusRequest } from "@/types/animation-api";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }
  let payload: PatchAnimationProjectStatusRequest;

  try {
    payload = (await request.json()) as PatchAnimationProjectStatusRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const project = await prisma.animationProject.findFirst({
    where: { id, ownerId: user.id },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (payload.projectStatus) {
        await tx.animationProject.update({
          where: { id },
          data: { status: payload.projectStatus },
        });
      }

      if (payload.transition) {
        if (
          payload.transition.id === undefined &&
          payload.transition.order === undefined
        ) {
          throw new Error("Transition requires id or order.");
        }

        const updateResult = await tx.animationTransition.updateMany({
          where: {
            projectId: id,
            ...(payload.transition.id !== undefined
              ? { id: payload.transition.id }
              : { order: payload.transition.order }),
          },
          data: {
            status: payload.transition.status,
            progress: payload.transition.progress,
          },
        });

        if (updateResult.count === 0) {
          throw new Error("Transition not found.");
        }
      }

      if (payload.exportStatus) {
        const latestExport = await tx.animationExport.findFirst({
          where: { projectId: id },
          orderBy: { createdAt: "desc" },
        });

        if (latestExport) {
          await tx.animationExport.update({
            where: { id: latestExport.id },
            data: {
              status: payload.exportStatus.status,
              progress: payload.exportStatus.progress,
              outputVideoUrl: payload.exportStatus.outputVideoUrl,
              errorMessage: payload.exportStatus.errorMessage,
            },
          });
        } else {
          await tx.animationExport.create({
            data: {
              projectId: id,
              status: payload.exportStatus.status ?? "rendering",
              progress: payload.exportStatus.progress ?? 0,
              outputVideoUrl: payload.exportStatus.outputVideoUrl ?? null,
              errorMessage: payload.exportStatus.errorMessage ?? null,
            },
          });
        }
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Status update failed." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
