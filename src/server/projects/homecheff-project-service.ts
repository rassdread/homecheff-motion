import { prisma } from "@/lib/prisma";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

export async function upsertHomeCheffProjectRecord(
  ownerId: string,
  project: HomeCheffProjectPackage
) {
  return prisma.homeCheffProject.upsert({
    where: { id: project.id },
    create: {
      id: project.id,
      ownerId,
      title: project.title,
      description: project.description ?? "",
      packageVersion: project.version,
      projectFormat: project.projectFormat ?? "hc",
      projectVersionLabel: String(project.projectVersion ?? project.version),
      manifestJson: project as object,
      servicePayloadJson: project.servicePayload as object,
      currentService: project.projectType,
      sourceService: project.sourceService ?? project.projectType,
      legacySourceJson: project.legacySource ? (project.legacySource as object) : undefined,
      isArchived: project.isArchived ?? false,
      archivedAt: project.archivedAt ? new Date(project.archivedAt) : undefined,
      conversionHistoryJson: (project.conversionHistory ?? []) as object,
      assetRefs: {
        create: project.assetReferences.map((asset) => ({
          assetId: asset.id,
          url: asset.url,
          storageKey: asset.storageKey,
          kind: asset.kind,
          role: asset.role,
          permissionsJson: { accessScope: asset.accessScope },
        })),
      },
    },
    update: {
      title: project.title,
      description: project.description ?? "",
      packageVersion: project.version,
      projectFormat: project.projectFormat ?? "hc",
      projectVersionLabel: String(project.projectVersion ?? project.version),
      manifestJson: project as object,
      servicePayloadJson: project.servicePayload as object,
      currentService: project.projectType,
      legacySourceJson: project.legacySource ? (project.legacySource as object) : undefined,
      isArchived: project.isArchived ?? false,
      archivedAt: project.archivedAt ? new Date(project.archivedAt) : undefined,
      conversionHistoryJson: (project.conversionHistory ?? []) as object,
      updatedAt: new Date(),
      assetRefs: {
        deleteMany: {},
        create: project.assetReferences.map((asset) => ({
          assetId: asset.id,
          url: asset.url,
          storageKey: asset.storageKey,
          kind: asset.kind,
          role: asset.role,
          permissionsJson: { accessScope: asset.accessScope },
        })),
      },
    },
  });
}

export async function getHomeCheffProjectRecord(ownerId: string, projectId: string) {
  return prisma.homeCheffProject.findFirst({
    where: { id: projectId, ownerId },
    include: { assetRefs: true, handoffs: true },
  });
}

export async function validateServerAssetAccess(projectId: string, assetId: string): Promise<boolean> {
  const ref = await prisma.projectAssetReference.findFirst({
    where: { packageId: projectId, assetId },
  });
  return Boolean(ref);
}

export async function recordProjectHandoff(input: {
  sourceProjectId: string;
  sourceType: string;
  targetType: string;
  handoffType: string;
  payload?: Record<string, unknown>;
  targetProjectId?: string;
}) {
  return prisma.projectHandoff.create({
    data: {
      sourceProjectId: input.sourceProjectId,
      sourceType: input.sourceType,
      targetType: input.targetType,
      handoffType: input.handoffType,
      targetProjectId: input.targetProjectId,
      payloadJson: (input.payload ?? {}) as object,
    },
  });
}
