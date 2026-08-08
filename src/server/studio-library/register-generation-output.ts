/**
 * SERVER_ONLY — Attach S.4 generation successes into the S.5 library index.
 * Never fails the generation path; library index is best-effort.
 */

import { familyForGenerationCapability } from "@/lib/studio-library-types";
import { upsertLibraryAsset } from "@/server/studio-library/library-asset-service";
import { addLibraryAssetVersion } from "@/server/studio-library/library-asset-service";

export async function registerLibraryAssetFromGeneration(input: {
  ownerId: string;
  generationJobId: string;
  capability: string;
  outputAssetId: string;
  title?: string;
  previewUrl?: string;
  downloadUrl?: string;
  promptSummary?: string;
  aiModel?: string;
  generator?: string;
  creditsSpent?: number;
  projectId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<string | null> {
  try {
    const family = familyForGenerationCapability(input.capability);
    const sourceId = input.outputAssetId.trim() || input.generationJobId;
    const asset = await upsertLibraryAsset({
      ownerId: input.ownerId,
      projectId: input.projectId ?? null,
      family,
      category: input.capability.toLowerCase(),
      title: input.title?.trim() || `${input.capability} output`,
      tags: [input.capability.toLowerCase(), "generated"],
      origin: "generated",
      previewUrl: input.previewUrl ?? input.downloadUrl ?? "",
      downloadUrl: input.downloadUrl ?? input.previewUrl ?? "",
      backingStore: "generation_job",
      sourceKind: "generation_job_output",
      sourceId,
      generationJobId: input.generationJobId,
      promptSummary: input.promptSummary ?? "",
      aiModel: input.aiModel ?? "",
      generator: input.generator ?? "",
      creditsSpent: input.creditsSpent ?? 0,
      metadata: {
        capability: input.capability,
        ...(input.metadata ?? {}),
      },
    });

    // First successful register creates v1; later same sourceId updates head + new version.
    await addLibraryAssetVersion({
      assetId: asset.id,
      ownerId: input.ownerId,
      previewUrl: asset.previewUrl,
      downloadUrl: asset.downloadUrl,
      promptSummary: asset.promptSummary,
      metadata: { generationJobId: input.generationJobId },
      promoteToHead: true,
    });

    return asset.id;
  } catch (err) {
    console.warn("[studio-library] register generation output failed", {
      generationJobId: input.generationJobId,
      message: err instanceof Error ? err.message : "unknown",
    });
    return null;
  }
}
