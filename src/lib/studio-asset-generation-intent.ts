import type { AssetGenerationIntent } from "@/types/studio-asset-image-generation";

export type ResolveAssetGenerationIntentInput = {
  sourceImageUrl?: string | null;
  parentAssetId?: string | null;
  derivedFromAssetId?: string | null;
  derivationSourceAssetId?: string | null;
};

/** When a source image or lineage exists, transform — do not create from scratch. */
export function resolveAssetGenerationIntent(
  input: ResolveAssetGenerationIntentInput
): AssetGenerationIntent {
  if (input.sourceImageUrl?.trim()) {
    return "TRANSFORM_EXISTING_ASSET";
  }
  if (input.parentAssetId?.trim() || input.derivedFromAssetId?.trim()) {
    return "TRANSFORM_EXISTING_ASSET";
  }
  if (input.derivationSourceAssetId?.trim()) {
    return "TRANSFORM_EXISTING_ASSET";
  }
  return "CREATE_NEW_ASSET";
}
