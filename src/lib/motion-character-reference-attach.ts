import {
  buildStyleDnaFromCharacterAppearance,
  buildVisionFromCharacterAppearance,
} from "@/lib/motion-premium-analysis-runner";
import type { LibraryConsistencyRecord } from "@/types/library-consistency";
import type { MotionUploadedReference } from "@/types/motion-preset-engine";
import type { PosterMotionSettings } from "@/lib/poster-motion-preserve";

export type MotionCharacterAttachSource =
  | "library_character"
  | "motion_ready"
  | "saved_character"
  | "character_studio"
  | "marketplace_item";

export type MotionCharacterAttachContext = {
  source: MotionCharacterAttachSource;
  assetId?: string | null;
  assetName?: string | null;
  assetType?: string | null;
  motionReady?: boolean;
  libraryRecord?: LibraryConsistencyRecord | null;
  appearanceMemory?: string | null;
  visualKeywords?: string | null;
  defaultClothing?: string | null;
  isMascot?: boolean;
};

function matchLibraryRecordForReference(
  ref: MotionUploadedReference & { imageUrl?: string | null },
  records: LibraryConsistencyRecord[]
): LibraryConsistencyRecord | null {
  const url = ref.imageUrl?.trim();
  if (!url) {
    return null;
  }
  return (
    records.find((r) => r.assetUrl === url || r.thumbnailUrl === url) ??
    records.find((r) => r.storageKey && ref.fileName && r.assetName === ref.assetName) ??
    null
  );
}

export function resolveMotionCharacterAttachContext(input: {
  posterMotionSettings?: PosterMotionSettings | null;
  libraryRecords?: LibraryConsistencyRecord[];
  preparedCharacterAssetId?: string | null;
}): MotionCharacterAttachContext | null {
  const settings = input.posterMotionSettings;
  const assetId = input.preparedCharacterAssetId ?? settings?.preparedCharacterAssetId ?? null;
  const records = input.libraryRecords ?? [];

  if (assetId) {
    const record =
      records.find((r) => r.registryAssetId === assetId || r.backingId === assetId) ?? null;
    if (record) {
      return {
        source: record.motionReady ? "motion_ready" : "library_character",
        assetId: record.registryAssetId,
        assetName: record.assetName,
        assetType: record.assetType,
        motionReady: record.motionReady ?? false,
        libraryRecord: record,
      };
    }
  }

  if (settings?.preparedByAssistant) {
    return {
      source: "saved_character",
      assetId,
      motionReady: true,
    };
  }

  return null;
}

export function enrichMotionReferencesWithCharacterAttach(input: {
  references: Array<MotionUploadedReference & { imageUrl?: string | null }>;
  attachContext?: MotionCharacterAttachContext | null;
  libraryRecords?: LibraryConsistencyRecord[];
}): MotionUploadedReference[] {
  const records = input.libraryRecords ?? [];
  const ctx = input.attachContext;

  return input.references.map((ref) => {
    const record = matchLibraryRecordForReference(ref, records);
    const motionReady =
      ctx?.motionReady ??
      record?.motionReady ??
      ref.motionReady ??
      false;

    let visionAnalysis = ref.visionAnalysis ?? null;
    let styleDna = ref.styleDna ?? null;

    if (motionReady && ctx?.appearanceMemory && !visionAnalysis) {
      visionAnalysis = buildVisionFromCharacterAppearance({
        name: ctx.assetName ?? ref.fileName ?? "Character",
        appearanceMemory: ctx.appearanceMemory ?? undefined,
        visualKeywords: ctx.visualKeywords ?? undefined,
        defaultClothing: ctx.defaultClothing ?? undefined,
        isMascot: ctx.isMascot ?? record?.category === "mascots",
      });
      styleDna = styleDna ?? buildStyleDnaFromCharacterAppearance({
        appearanceMemory: ctx.appearanceMemory ?? undefined,
        visualKeywords: ctx.visualKeywords ?? undefined,
        defaultClothing: ctx.defaultClothing ?? undefined,
      });
    }

    return {
      ...ref,
      assetName: ctx?.assetName ?? record?.assetName ?? ref.assetName,
      assetType: ctx?.assetType ?? record?.assetType ?? ref.assetType,
      motionReady,
      visionAnalysis,
      styleDna,
    };
  });
}

export function motionReadyFromAttachContext(
  ctx: MotionCharacterAttachContext | null | undefined
): boolean | null {
  if (!ctx) {
    return null;
  }
  return Boolean(ctx.motionReady);
}
