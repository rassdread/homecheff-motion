import { resolvePublicBlobUrlByPathname } from "@/lib/vercel-blob-config";
import { prisma } from "@/lib/prisma";
import { listUserGeneratedReferenceManifest } from "@/server/studio/studio-user-generated-reference-manifest-blob";
import type { GeneratedReferenceHistoryItem } from "@/types/studio-asset-library-preferences";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

const KIND_FOLDERS: Record<string, string> = {
  character: "characters",
  prop: "props",
  location: "locations",
  world: "worlds",
};

function metaField(metadataJson: unknown, key: string): string | null {
  if (!metadataJson || typeof metadataJson !== "object" || Array.isArray(metadataJson)) {
    return null;
  }
  const v = (metadataJson as Record<string, unknown>)[key];
  return typeof v === "string" ? v : null;
}

function metaFeature(metadataJson: unknown): string | null {
  return metaField(metadataJson, "feature");
}

async function resolveGeneratedReferenceUrls(params: {
  ownerId: string;
  generationId: string;
  kind: string;
}): Promise<{ referenceImageUrl: string | null; referenceStorageKey: string | null; thumbnailUrl: string | null }> {
  const folder = KIND_FOLDERS[params.kind] ?? KIND_FOLDERS.character;
  const base = `studio/${params.ownerId}/wizard-references/${folder}/${params.generationId}`;
  for (const ext of ["jpg", "png"]) {
    const mainPath = `${base}/main.${ext}`;
    const mainUrl = await resolvePublicBlobUrlByPathname(mainPath);
    if (mainUrl) {
      const thumbPath = `${base}/thumb.jpg`;
      const thumbUrl = await resolvePublicBlobUrlByPathname(thumbPath);
      return {
        referenceImageUrl: mainUrl,
        referenceStorageKey: mainPath,
        thumbnailUrl: thumbUrl ?? mainUrl,
      };
    }
  }
  if (!KIND_FOLDERS[params.kind]) {
    for (const tryKind of Object.keys(KIND_FOLDERS)) {
      const resolved = await resolveGeneratedReferenceUrls({
        ownerId: params.ownerId,
        generationId: params.generationId,
        kind: tryKind,
      });
      if (resolved.referenceImageUrl) {
        return resolved;
      }
    }
  }
  return { referenceImageUrl: null, referenceStorageKey: null, thumbnailUrl: null };
}

function toHistoryItem(params: {
  generationId: string;
  kind: string;
  createdAt: string;
  promptSummary: string;
  referenceImageUrl: string;
  referenceStorageKey: string | null;
  thumbnailUrl: string | null;
  sourceAssetName: string | null;
  sourceAssetId: string | null;
  origin: "generated" | "derived";
  costEventId?: string;
  provider?: string | null;
}): GeneratedReferenceHistoryItem {
  return {
    generationId: params.generationId,
    kind: params.kind,
    createdAt: params.createdAt,
    promptSummary: params.promptSummary,
    referenceImageUrl: params.referenceImageUrl,
    referenceStorageKey: params.referenceStorageKey,
    thumbnailUrl: params.thumbnailUrl,
    sourceAssetName: params.sourceAssetName,
    sourceAssetId: params.sourceAssetId,
    origin: params.origin,
    costEventId: params.costEventId ?? params.generationId,
    provider: params.provider ?? null,
  };
}

function mergeHistoryItems(items: GeneratedReferenceHistoryItem[]): GeneratedReferenceHistoryItem[] {
  const byId = new Map<string, GeneratedReferenceHistoryItem>();
  for (const item of items) {
    if (!item.referenceImageUrl?.trim()) {
      continue;
    }
    const existing = byId.get(item.generationId);
    if (!existing) {
      byId.set(item.generationId, item);
      continue;
    }
    byId.set(item.generationId, {
      ...existing,
      ...item,
      referenceImageUrl: item.referenceImageUrl || existing.referenceImageUrl,
      referenceStorageKey: item.referenceStorageKey ?? existing.referenceStorageKey,
      thumbnailUrl: item.thumbnailUrl ?? existing.thumbnailUrl,
      promptSummary: item.promptSummary || existing.promptSummary,
      sourceAssetName: item.sourceAssetName ?? existing.sourceAssetName,
      sourceAssetId: item.sourceAssetId ?? existing.sourceAssetId,
    });
  }
  return [...byId.values()].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
  );
}

async function listGeneratedReferencesFromCostEvents(params: {
  userId: string;
  limit: number;
}): Promise<GeneratedReferenceHistoryItem[]> {
  const events = await prisma.providerCostEvent.findMany({
    where: {
      userId: params.userId,
      status: "completed",
    },
    select: {
      id: true,
      createdAt: true,
      relatedJobId: true,
      metadataJson: true,
      provider: true,
    },
    orderBy: { createdAt: "desc" },
    take: params.limit * 3,
  });

  const items: GeneratedReferenceHistoryItem[] = [];
  const seen = new Set<string>();

  for (const e of events) {
    const feature = metaFeature(e.metadataJson);
    const isGenerate =
      feature === "asset_reference_generate" ||
      (feature === "asset_derivation" && metaField(e.metadataJson, "derivationPhase") === "generate");
    if (!isGenerate) {
      continue;
    }
    const generationId = e.relatedJobId?.trim();
    if (!generationId || seen.has(generationId)) {
      continue;
    }
    seen.add(generationId);

    const kind =
      metaField(e.metadataJson, "assetKind") ??
      metaField(e.metadataJson, "targetKind") ??
      "character";

    const metaUrl = metaField(e.metadataJson, "referenceImageUrl");
    const metaKey = metaField(e.metadataJson, "referenceStorageKey");
    const metaThumb = metaField(e.metadataJson, "thumbnailUrl");

    const urls =
      metaUrl
        ? {
            referenceImageUrl: metaUrl,
            referenceStorageKey: metaKey,
            thumbnailUrl: metaThumb ?? metaUrl,
          }
        : await resolveGeneratedReferenceUrls({
            ownerId: params.userId,
            generationId,
            kind,
          });

    if (!urls.referenceImageUrl) {
      continue;
    }

    items.push(
      toHistoryItem({
        generationId,
        kind,
        createdAt: e.createdAt.toISOString(),
        promptSummary:
          metaField(e.metadataJson, "promptSummary") ??
          metaField(e.metadataJson, "sourceAssetName") ??
          "Generated reference",
        referenceImageUrl: urls.referenceImageUrl,
        referenceStorageKey: urls.referenceStorageKey,
        thumbnailUrl: urls.thumbnailUrl,
        sourceAssetName: metaField(e.metadataJson, "sourceAssetName"),
        sourceAssetId: metaField(e.metadataJson, "sourceAssetId"),
        origin: feature === "asset_derivation" ? "derived" : "generated",
        costEventId: e.id,
        provider: e.provider,
      })
    );

    if (items.length >= params.limit) {
      break;
    }
  }

  return items;
}

export async function listUserGeneratedReferences(params: {
  userId: string;
  limit?: number;
}): Promise<GeneratedReferenceHistoryItem[]> {
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);

  const manifestRows = await listUserGeneratedReferenceManifest(params.userId);
  const fromManifest = manifestRows.map((row) =>
    toHistoryItem({
      generationId: row.generationId,
      kind: row.kind,
      createdAt: row.createdAt,
      promptSummary: row.promptSummary,
      referenceImageUrl: row.referenceImageUrl,
      referenceStorageKey: row.referenceStorageKey,
      thumbnailUrl: row.thumbnailUrl,
      sourceAssetName: row.sourceAssetName,
      sourceAssetId: row.sourceAssetId,
      origin: row.origin,
    })
  );

  const fromEvents = await listGeneratedReferencesFromCostEvents({
    userId: params.userId,
    limit,
  });

  return mergeHistoryItems([...fromManifest, ...fromEvents]).slice(0, limit);
}

export function generatedReferenceToRegistryId(generationId: string): string {
  return `reference_image:gen_${generationId}`;
}

export function assetKindFromHistoryKind(kind: string): StudioAssetKind {
  if (kind === "prop" || kind === "location" || kind === "world") {
    return kind;
  }
  return "character";
}
