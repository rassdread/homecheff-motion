/**
 * User-facing studio usage insights — counts only, no internal margins or COGS.
 */

import { prisma } from "@/lib/prisma";
import { DERIVATION_TIME_SAVED_MINUTES } from "@/lib/studio-asset-style-dna";
import { COST_ACTION } from "@/server/provider-cost/cost-event-types";
import type { UserStudioInsightsReport } from "@/types/studio-profitability";

function metaFeature(metadataJson: unknown): string | null {
  if (!metadataJson || typeof metadataJson !== "object" || Array.isArray(metadataJson)) {
    return null;
  }
  const f = (metadataJson as Record<string, unknown>).feature;
  return typeof f === "string" ? f : null;
}

function startOfMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function buildUserStudioInsights(userId: string): Promise<UserStudioInsightsReport> {
  const now = new Date();
  const monthStart = startOfMonth(now);

  const [costEvents, billingEvents, projectsCreated] = await Promise.all([
    prisma.providerCostEvent.findMany({
      where: { userId, createdAt: { gte: monthStart } },
      select: { actionType: true, metadataJson: true },
    }),
    prisma.customerBillingEvent.findMany({
      where: { userId, createdAt: { gte: monthStart } },
      select: { actionType: true, renderType: true },
    }),
    prisma.animationProject.count({
      where: { ownerId: userId, createdAt: { gte: monthStart } },
    }),
  ]);

  let sceneImagesGenerated = 0;
  let assetReferencesGenerated = 0;
  let voicePreviews = 0;
  let voiceClones = 0;
  let motionRenders = 0;
  let translations = 0;
  let assetsDerived = 0;

  for (const e of costEvents) {
    const feature = metaFeature(e.metadataJson);
    if (feature === "asset_derivation") {
      const phase =
        e.metadataJson &&
        typeof e.metadataJson === "object" &&
        !Array.isArray(e.metadataJson) &&
        (e.metadataJson as Record<string, unknown>).derivationPhase;
      if (phase === "accept") {
        assetsDerived += 1;
      }
    }
    if (feature === "asset_reference_generate") {
      assetReferencesGenerated += 1;
    } else if (
      feature?.startsWith("scene_image") ||
      e.actionType === COST_ACTION.OPENAI_SCENE_IMAGE
    ) {
      sceneImagesGenerated += 1;
    } else if (feature?.startsWith("voice_preview")) {
      voicePreviews += 1;
    } else if (feature === "voice_clone" || e.actionType === COST_ACTION.ELEVENLABS_CLONE) {
      voiceClones += 1;
    } else if (e.actionType === COST_ACTION.VIDU_RENDER) {
      motionRenders += 1;
    } else if (
      feature === "language_translation" ||
      e.actionType === COST_ACTION.OPENAI_TRANSLATION
    ) {
      translations += 1;
    }
  }

  let languageExports = 0;
  let textRerenders = 0;
  for (const b of billingEvents) {
    if (b.actionType === "language_export" || b.renderType === "language_export") {
      languageExports += 1;
    } else if (b.actionType === "text_rerender" || b.renderType === "text_rerender") {
      textRerenders += 1;
    } else if (
      b.actionType === "vidu_render" ||
      b.renderType === "story_mode" ||
      b.renderType === "transition_mode" ||
      b.renderType === "full_rerender"
    ) {
      motionRenders += 1;
    }
  }

  const estimatedProviderActions = costEvents.length + billingEvents.length;

  return {
    generatedAt: now.toISOString(),
    periodLabel: "this_month",
    projectsCreated,
    sceneImagesGenerated,
    assetReferencesGenerated,
    voicePreviews,
    voiceClones,
    motionRenders,
    languageExports,
    textRerenders,
    translations,
    assetsDerived,
    estimatedTimeSavedMinutes: assetsDerived * DERIVATION_TIME_SAVED_MINUTES,
    estimatedProviderActions,
    withinLimits: true,
    limitHintKey: null,
  };
}
