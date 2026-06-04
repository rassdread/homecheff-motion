import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { appendBundleAuditEntry, parseBundleAuditJson } from "@/lib/bundle-audit";
import {
  previewBundleMembershipAfterRename,
  resolveBundleDisplayName,
  resolveProjectDisplayTitle,
  sanitizeBundleKeyInput,
  sanitizeBundleNameInput,
  sanitizeProjectTitleInput,
} from "@/lib/project-display-title";

export type UpdateProjectBundleSettingsInput = {
  projectId: string;
  ownerId: string;
  isAdmin: boolean;
  title?: string;
  bundleName?: string;
  bundleKey?: string | null;
  locale?: "en" | "nl";
};

export type UpdateProjectBundleSettingsResult =
  | {
      ok: true;
      id: string;
      title: string | null;
      bundleName: string | null;
      bundleKey: string | null;
      displayTitle: string;
      bundlePreview: ReturnType<typeof previewBundleMembershipAfterRename>;
    }
  | { ok: false; code: string; message: string };

export async function updateProjectBundleSettings(
  params: UpdateProjectBundleSettingsInput
): Promise<UpdateProjectBundleSettingsResult> {
  const existing = await prisma.animationProject.findFirst({
    where: params.isAdmin
      ? { id: params.projectId }
      : { id: params.projectId, ownerId: params.ownerId },
    select: {
      id: true,
      ownerId: true,
      projectType: true,
      title: true,
      bundleName: true,
      bundleKey: true,
      bundleAuditJson: true,
    },
  });

  if (!existing) {
    return { ok: false, code: "NOT_FOUND", message: "Project not found." };
  }

  const locale = params.locale ?? "nl";
  const data: Prisma.AnimationProjectUpdateInput = {};
  let audit = parseBundleAuditJson(existing.bundleAuditJson);

  if (params.title !== undefined) {
    const next = sanitizeProjectTitleInput(params.title);
    if ((existing.title ?? null) !== next) {
      audit = appendBundleAuditEntry(audit, {
        type: "rename",
        userId: params.ownerId,
        before: existing.title,
        after: next,
      });
      data.title = next;
    }
  }

  if (params.bundleName !== undefined) {
    const next = sanitizeBundleNameInput(params.bundleName);
    if ((existing.bundleName ?? null) !== next) {
      audit = appendBundleAuditEntry(audit, {
        type: "bundle_name",
        userId: params.ownerId,
        before: existing.bundleName,
        after: next,
      });
      data.bundleName = next;
    }
  }

  if (params.bundleKey !== undefined) {
    const next = sanitizeBundleKeyInput(params.bundleKey);
    if ((existing.bundleKey ?? null) !== next) {
      audit = appendBundleAuditEntry(audit, {
        type: "bundle_key",
        userId: params.ownerId,
        before: existing.bundleKey,
        after: next,
      });
      data.bundleKey = next;
    }
  }

  if (Object.keys(data).length === 0) {
    return {
      ok: true,
      id: existing.id,
      title: existing.title,
      bundleName: existing.bundleName,
      bundleKey: existing.bundleKey,
      displayTitle: resolveBundleDisplayName(
        [{ title: existing.title, bundleName: existing.bundleName }],
        locale
      ),
      bundlePreview: previewBundleMembershipAfterRename({
        ownerId: existing.ownerId,
        projectType: existing.projectType,
        projectId: existing.id,
        newTitle: existing.title,
        newBundleName: existing.bundleName,
        newBundleKey: existing.bundleKey,
        peers: [],
        locale,
      }),
    };
  }

  data.bundleAuditJson = audit as Prisma.InputJsonValue;

  const updated = await prisma.animationProject.update({
    where: { id: existing.id },
    data,
    select: {
      id: true,
      title: true,
      bundleName: true,
      bundleKey: true,
      projectType: true,
      ownerId: true,
    },
  });

  const peers = await prisma.animationProject.findMany({
    where: {
      ownerId: updated.ownerId,
      projectType: updated.projectType,
      id: { not: updated.id },
    },
    select: { id: true, title: true, bundleName: true, bundleKey: true, projectType: true },
    take: 100,
    orderBy: { updatedAt: "desc" },
  });

  const bundlePreview = previewBundleMembershipAfterRename({
    ownerId: updated.ownerId,
    projectType: updated.projectType,
    projectId: updated.id,
    newTitle: updated.title,
    newBundleName: updated.bundleName,
    newBundleKey: updated.bundleKey,
    peers,
    locale,
  });

  return {
    ok: true,
    id: updated.id,
    title: updated.title,
    bundleName: updated.bundleName,
    bundleKey: updated.bundleKey,
    displayTitle: resolveBundleDisplayName(
      [{ title: updated.title, bundleName: updated.bundleName }],
      locale
    ),
    bundlePreview,
  };
}
