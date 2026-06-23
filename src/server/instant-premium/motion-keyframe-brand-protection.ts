/**
 * Sprint F — server-side motion keyframe brand protection (warp + sharp composite).
 */

import { fetchSourceImageBuffer } from "@/lib/openai-image-generation";
import { applyBrandAssetPostComposite } from "@/lib/brand-asset-post-composite";
import { buildPostCompositeOverlayPlansFromBrandLockedAssets } from "@/lib/brand-asset-post-composite-plan";
import {
  buildMotionProjectKeyframeBrandLog,
  describeViduKeyframeBrandProtection,
  logMotionKeyframeBaking,
  resolveKeyframeBrandAssetsForFrame,
  resolveMotionKeyframeBrandAssets,
} from "@/lib/motion-keyframe-brand-baking";
import { uploadPublicBlob } from "@/lib/vercel-blob-config";
import type {
  BrandLockedAsset,
  MotionKeyframeBrandAsset,
  MotionKeyframeBrandProtectionLog,
} from "@/types/brand-asset-protection";

async function readImageDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
  const sharp = (await import("sharp")).default;
  const meta = await sharp(buffer).metadata();
  return {
    width: Math.max(1, meta.width ?? 720),
    height: Math.max(1, meta.height ?? 1280),
  };
}

export async function applyMotionKeyframeBrandProtection(input: {
  keyframeUrl: string;
  assets: MotionKeyframeBrandAsset[];
  uploadPathPrefix: string;
  projectId?: string;
  generationSettings?: Record<string, unknown>;
}): Promise<
  MotionKeyframeBrandProtectionLog & {
    applied: boolean;
    keyframeUrl: string;
    storageKey?: string;
  }
> {
  const empty: MotionKeyframeBrandProtectionLog & {
    applied: boolean;
    keyframeUrl: string;
    storageKey?: string;
  } = {
    assetsLocked: 0,
    keyframesProcessed: 0,
    perspectiveWarpApplied: false,
    postCompositeApplied: false,
    appliedAssetIds: [],
    skippedAssetIds: [],
    warnings: [],
    applied: false,
    keyframeUrl: input.keyframeUrl,
  };

  if (!input.assets.length || !input.keyframeUrl.trim()) {
    return empty;
  }

  try {
    const source = await fetchSourceImageBuffer(input.keyframeUrl.trim());
    const { width, height } = await readImageDimensions(source.buffer);
    const plans = buildPostCompositeOverlayPlansFromBrandLockedAssets({
      assets: input.assets,
      sourceImageWidth: width,
      sourceImageHeight: height,
      generationSettings: input.generationSettings,
    });

    if (!plans.length) {
      return {
        ...empty,
        warnings: ["No overlay plans could be built for keyframe brand assets."],
        skippedAssetIds: input.assets.map((a) => a.assetId),
      };
    }

    const composite = await applyBrandAssetPostComposite({
      renderBuffer: source.buffer,
      plans,
      sourceImageWidth: width,
      sourceImageHeight: height,
    });

    if (!composite.applied) {
      return {
        assetsLocked: input.assets.length,
        keyframesProcessed: 0,
        perspectiveWarpApplied: composite.perspectiveWarpApplied ?? false,
        postCompositeApplied: false,
        appliedAssetIds: composite.appliedAssetIds,
        skippedAssetIds: composite.skippedAssetIds,
        warnings: composite.warnings,
        applied: false,
        keyframeUrl: input.keyframeUrl,
      };
    }

    const storageKey = `${input.uploadPathPrefix.replace(/\/$/, "")}/${Date.now()}-brand-keyframe.png`;
    const uploaded = await uploadPublicBlob({
      pathname: storageKey,
      body: composite.buffer,
      contentType: "image/png",
      addRandomSuffix: true,
      context: {
        uploadTarget: storageKey,
        provider: "motion-keyframe-brand-bake",
        projectId: input.projectId,
      },
    });

    const log: MotionKeyframeBrandProtectionLog = {
      assetsLocked: input.assets.length,
      keyframesProcessed: 1,
      perspectiveWarpApplied: Boolean(composite.perspectiveWarpApplied),
      postCompositeApplied: composite.applied,
      appliedAssetIds: composite.appliedAssetIds,
      skippedAssetIds: composite.skippedAssetIds,
      warnings: composite.warnings,
    };

    return {
      ...log,
      applied: true,
      keyframeUrl: uploaded.url,
      storageKey: uploaded.pathname,
    };
  } catch (error) {
    return {
      ...empty,
      assetsLocked: input.assets.length,
      warnings: [
        error instanceof Error ? error.message : "Motion keyframe brand protection failed.",
      ],
      skippedAssetIds: input.assets.map((a) => a.assetId),
    };
  }
}

export async function resolveProtectedViduKeyframeUrl(input: {
  sourceUrl: string;
  brandLockedAssets: BrandLockedAsset[];
  segmentIndex: number;
  keyframeRole: "start" | "middle" | "end";
  sceneId?: string | null;
  projectId: string;
  ownerId: string;
  generationSettings?: Record<string, unknown>;
}): Promise<{
  url: string;
  baked: boolean;
  log?: MotionKeyframeBrandProtectionLog;
}> {
  const baseUrl = input.sourceUrl.trim();
  const bakeable = resolveMotionKeyframeBrandAssets(input.brandLockedAssets);
  const frameAssets = resolveKeyframeBrandAssetsForFrame(bakeable, {
    sceneId: input.sceneId,
    segmentIndex: input.segmentIndex,
    keyframeRole: input.keyframeRole,
  });

  if (!frameAssets.length) {
    return { url: baseUrl, baked: false };
  }

  const result = await applyMotionKeyframeBrandProtection({
    keyframeUrl: baseUrl,
    assets: frameAssets,
    uploadPathPrefix: `motion/brand-keyframes/${input.ownerId}/${input.projectId}`,
    projectId: input.projectId,
    generationSettings: input.generationSettings,
  });

  if (result.applied) {
    logMotionKeyframeBaking(
      {
        phase: "keyframe_bake",
        projectId: input.projectId,
        segmentIndex: input.segmentIndex,
        keyframeRole: input.keyframeRole,
      },
      result
    );
  }

  return {
    url: result.keyframeUrl,
    baked: result.applied,
    log: result.applied ? result : undefined,
  };
}

export async function resolveProtectedViduKeyframeUrlsForProject(input: {
  frames: Array<{
    sourceUrl: string;
    segmentIndex: number;
    keyframeRole: "start" | "middle" | "end";
    sceneId?: string | null;
  }>;
  brandLockedAssets: BrandLockedAsset[];
  projectId: string;
  ownerId: string;
  generationSettings?: Record<string, unknown>;
}): Promise<{
  urls: string[];
  summary: MotionKeyframeBrandProtectionLog;
  viduAudit: ReturnType<
    typeof import("@/lib/motion-keyframe-brand-baking").describeViduKeyframeBrandProtection
  >;
}> {
  const urls: string[] = [];
  const appliedAssetIds = new Set<string>();
  const skippedAssetIds = new Set<string>();
  const warnings: string[] = [];
  let keyframesProcessed = 0;
  let perspectiveWarpApplied = false;
  let postCompositeApplied = false;
  const originalAssetUrls = new Set<string>();

  for (const frame of input.frames) {
    const resolved = await resolveProtectedViduKeyframeUrl({
      sourceUrl: frame.sourceUrl,
      brandLockedAssets: input.brandLockedAssets,
      segmentIndex: frame.segmentIndex,
      keyframeRole: frame.keyframeRole,
      sceneId: frame.sceneId,
      projectId: input.projectId,
      ownerId: input.ownerId,
      generationSettings: input.generationSettings,
    });
    urls.push(resolved.url);
    if (resolved.baked && resolved.log) {
      keyframesProcessed += 1;
      perspectiveWarpApplied ||= resolved.log.perspectiveWarpApplied;
      postCompositeApplied ||= resolved.log.postCompositeApplied;
      for (const id of resolved.log.appliedAssetIds) {
        appliedAssetIds.add(id);
      }
      for (const id of resolved.log.skippedAssetIds) {
        skippedAssetIds.add(id);
      }
      warnings.push(...resolved.log.warnings);
      for (const asset of resolveKeyframeBrandAssetsForFrame(
        resolveMotionKeyframeBrandAssets(input.brandLockedAssets),
        frame
      )) {
        originalAssetUrls.add(asset.assetUrl);
      }
    }
  }

  const summary: MotionKeyframeBrandProtectionLog = {
    assetsLocked: resolveMotionKeyframeBrandAssets(input.brandLockedAssets).length,
    keyframesProcessed,
    perspectiveWarpApplied,
    postCompositeApplied,
    appliedAssetIds: [...appliedAssetIds],
    skippedAssetIds: [...skippedAssetIds],
    warnings,
  };

  const protectedFlags = input.frames.map((_, index) => urls[index] !== input.frames[index]!.sourceUrl);

  return {
    urls,
    summary,
    viduAudit: describeViduKeyframeBrandProtection({
      startFrameProtected: protectedFlags[0] ?? false,
      middleFramesProtected: protectedFlags.slice(1, -1).filter(Boolean).length,
      endFrameProtected: protectedFlags.length > 1 ? (protectedFlags.at(-1) ?? false) : false,
      perspectiveWarpApplied,
      postCompositeApplied,
      originalAssetUrlsUsed: [...originalAssetUrls],
    }),
  };
}
