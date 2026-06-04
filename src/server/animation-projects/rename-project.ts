import { prisma } from "@/lib/prisma";
import {
  previewBundleMembershipAfterRename,
  resolveProjectDisplayTitle,
  sanitizeProjectTitleInput,
} from "@/lib/project-display-title";

export type RenameProjectResult =
  | {
      ok: true;
      id: string;
      title: string | null;
      displayTitle: string;
      bundlePreview: ReturnType<typeof previewBundleMembershipAfterRename>;
    }
  | { ok: false; code: string; message: string };

export async function renameAnimationProject(params: {
  projectId: string;
  ownerId: string;
  isAdmin: boolean;
  title: string;
  locale?: "en" | "nl";
}): Promise<RenameProjectResult> {
  const existing = await prisma.animationProject.findFirst({
    where: params.isAdmin ? { id: params.projectId } : { id: params.projectId, ownerId: params.ownerId },
    select: {
      id: true,
      ownerId: true,
      projectType: true,
      title: true,
    },
  });

  if (!existing) {
    return { ok: false, code: "NOT_FOUND", message: "Project not found." };
  }

  const sanitized = sanitizeProjectTitleInput(params.title);
  const locale = params.locale ?? "nl";

  await prisma.animationProject.update({
    where: { id: existing.id },
    data: { title: sanitized },
  });

  const peers = await prisma.animationProject.findMany({
    where: {
      ownerId: existing.ownerId,
      projectType: existing.projectType,
      id: { not: existing.id },
    },
    select: { id: true, title: true, projectType: true },
    take: 100,
    orderBy: { updatedAt: "desc" },
  });

  const bundlePreview = previewBundleMembershipAfterRename({
    ownerId: existing.ownerId,
    projectType: existing.projectType,
    projectId: existing.id,
    newTitle: sanitized,
    peers,
    locale,
  });

  return {
    ok: true,
    id: existing.id,
    title: sanitized,
    displayTitle: resolveProjectDisplayTitle(sanitized, locale),
    bundlePreview,
  };
}
