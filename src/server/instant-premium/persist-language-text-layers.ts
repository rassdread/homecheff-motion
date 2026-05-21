/**
 * Persist canonical language text layers on AnimationProject.
 */

import type { Prisma } from "@prisma/client";
import {
  aggregateCanonicalLanguageTextLayers,
  buildLanguageTextLayersSnapshot,
  parseLanguageTextLayersSnapshot,
  type CanonicalLanguageTextLayer,
  type LanguageTextLayerRecoverySource,
  type LanguageTextLayerSourceStats,
} from "@/lib/canonical-language-text-layers";
import { prisma } from "@/lib/prisma";

export type SyncLanguageTextLayersResult = {
  layerCount: number;
  stats: LanguageTextLayerSourceStats;
};

export async function syncProjectLanguageTextLayers(params: {
  projectId: string;
  recoverySource: LanguageTextLayerRecoverySource;
  extraLayers?: CanonicalLanguageTextLayer[];
}): Promise<SyncLanguageTextLayersResult> {
  const project = await prisma.animationProject.findUnique({
    where: { id: params.projectId },
    include: { images: { orderBy: { order: "asc" } } },
  });
  if (!project) {
    throw new Error("Project not found.");
  }

  const { layers, stats } = aggregateCanonicalLanguageTextLayers({
    project: {
      languageTextLayersJson: project.languageTextLayersJson,
      instantLockedTextLayers: project.instantLockedTextLayers,
      instantDetectedTextMetadata: project.instantDetectedTextMetadata,
      instantOutputDurationSeconds: project.instantOutputDurationSeconds,
      stylePreset: project.stylePreset,
      images: project.images,
    },
    extraLayers: params.extraLayers,
    recoverySource: params.recoverySource,
  });

  if (layers.length === 0) {
    return {
      layerCount: 0,
      stats: { ...stats, totalExtracted: 0, recoverySource: params.recoverySource },
    };
  }

  const snapshot = buildLanguageTextLayersSnapshot({
    layers,
    recoverySource: params.recoverySource,
  });

  await prisma.animationProject.update({
    where: { id: params.projectId },
    data: {
      languageTextLayersJson: snapshot as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    layerCount: layers.length,
    stats: {
      ...stats,
      persistedCount: layers.length,
      totalExtracted: layers.length,
      recoverySource: params.recoverySource,
    },
  };
}

export function readPersistedLanguageTextLayerCount(project: {
  languageTextLayersJson?: unknown;
}): number {
  const snapshot = parseLanguageTextLayersSnapshot(project.languageTextLayersJson);
  return snapshot?.layers.length ?? 0;
}
