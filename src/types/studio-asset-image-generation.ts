/** Internal generation intent for asset reference / derivation flows. */

export type AssetGenerationIntent = "CREATE_NEW_ASSET" | "TRANSFORM_EXISTING_ASSET";

/** Identity lock level — higher levels preserve more fingerprint tiers. */
export type AssetIdentityLockLevel = 1 | 2;

export type AssetImageGenerationMode = "text_to_image" | "image_edit";
