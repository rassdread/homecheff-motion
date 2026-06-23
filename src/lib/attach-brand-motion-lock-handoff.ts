import {
  attachBrandMotionLockToHandoffPayload,
  buildBrandLockedAssetsFromProtection,
} from "@/lib/brand-asset-motion-lock";
import type { BrandLockedAsset } from "@/types/brand-asset-protection";
import type { FusionRenderPayload } from "@/types/editor-fusion-intelligence";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";

export function attachBrandMotionLockFromFusionToHandoffPayload(
  payload: MotionHandoffPayload,
  fusionRenderPayload: FusionRenderPayload | null | undefined
): MotionHandoffPayload {
  const assets = buildBrandLockedAssetsFromProtection(fusionRenderPayload?.brandProtection);
  return attachBrandMotionLockToHandoffPayload(payload, assets);
}

export function attachBrandMotionLockFromAssetsToHandoffPayload(
  payload: MotionHandoffPayload,
  assets: BrandLockedAsset[]
): MotionHandoffPayload {
  return attachBrandMotionLockToHandoffPayload(payload, assets);
}
