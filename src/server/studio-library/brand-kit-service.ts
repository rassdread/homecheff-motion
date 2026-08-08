/**
 * SERVER_ONLY — S.5 Brand Kits (reusable brand memory).
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type StudioBrandKitPayload = {
  logoUrl?: string;
  colors?: string[];
  fonts?: string[];
  watermarkUrl?: string;
  introAssetId?: string;
  outroAssetId?: string;
  voiceAssetId?: string;
  musicAssetId?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  businessName?: string;
  businessInfo?: string;
  [key: string]: unknown;
};

export async function createBrandKit(input: {
  ownerId: string;
  name: string;
  description?: string;
  projectId?: string | null;
  kit: StudioBrandKitPayload;
}) {
  const name = input.name.trim();
  if (!name) throw new Error("Brand kit name is required.");
  return prisma.studioBrandKit.create({
    data: {
      ownerId: input.ownerId,
      name,
      description: (input.description ?? "").trim(),
      projectId: input.projectId ?? null,
      kitJson: input.kit as Prisma.InputJsonValue,
    },
  });
}

export async function listBrandKitsForOwner(ownerId: string, limit = 40) {
  return prisma.studioBrandKit.findMany({
    where: { ownerId, status: "active" },
    orderBy: { updatedAt: "desc" },
    take: Math.min(100, Math.max(1, limit)),
  });
}

export async function getBrandKitForOwner(kitId: string, ownerId: string) {
  return prisma.studioBrandKit.findFirst({
    where: { id: kitId, ownerId },
  });
}

export async function updateBrandKit(input: {
  kitId: string;
  ownerId: string;
  name?: string;
  description?: string;
  kit?: StudioBrandKitPayload;
  status?: "active" | "archived";
}) {
  const existing = await getBrandKitForOwner(input.kitId, input.ownerId);
  if (!existing) return null;
  return prisma.studioBrandKit.update({
    where: { id: existing.id },
    data: {
      ...(input.name != null ? { name: input.name.trim() } : {}),
      ...(input.description != null ? { description: input.description.trim() } : {}),
      ...(input.kit != null ? { kitJson: input.kit as Prisma.InputJsonValue } : {}),
      ...(input.status != null
        ? {
            status: input.status,
            archivedAt: input.status === "archived" ? new Date() : null,
          }
        : {}),
    },
  });
}
