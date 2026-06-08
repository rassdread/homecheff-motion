/** Trace payload for source-based reference generation identity enforcement. */

import type {
  AssetGenerationIntent,
  AssetIdentityLockLevel,
  AssetImageGenerationMode,
} from "@/types/studio-asset-image-generation";

export type AssetIdentityGenerationAudit = {
  hasSourceImage: boolean;
  sourceImageUrl?: string | null;
  brandIdentity: string;
  assetFamily: string;
  characterLineage?: string;
  identityFingerprintHash?: string;
  preserveRules: string;
  changeRules: string;
  forbiddenRules: string;
  strictRegeneration?: boolean;
  generationIntent?: AssetGenerationIntent;
  identityLockLevel?: AssetIdentityLockLevel;
  imageGenerationMode?: AssetImageGenerationMode;
};
