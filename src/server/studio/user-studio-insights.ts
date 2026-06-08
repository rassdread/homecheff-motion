/**
 * User-facing studio usage insights — counts only, no internal margins or COGS.
 */

import { prisma } from "@/lib/prisma";
import { DERIVATION_TIME_SAVED_MINUTES } from "@/lib/studio-asset-style-dna";
import { readAssetLibraryPreferencesManifest } from "@/server/studio/studio-asset-library-preferences-blob";
import { COST_ACTION } from "@/server/provider-cost/cost-event-types";
import type {
  UserStudioActivityItem,
  UserStudioDashboardReport,
  UserStudioInsightsReport,
} from "@/types/studio-profitability";

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

export async function buildUserStudioDashboard(userId: string): Promise<UserStudioDashboardReport> {
  const insights = await buildUserStudioInsights(userId);

  const [
    projects,
    storyboards,
    characters,
    props,
    locations,
    worlds,
    recentProjects,
    recentStoryboards,
    recentCharacters,
    recentProps,
    recentLocations,
    recentWorlds,
    recentCostEvents,
    libraryPrefs,
    continueStoryboards,
    continueCharacters,
    continueProps,
    continueLocations,
    continueWorlds,
  ] = await Promise.all([
    prisma.animationProject.count({ where: { ownerId: userId } }),
    prisma.studioStoryboard.count({ where: { ownerId: userId } }),
    prisma.studioCharacter.count({ where: { ownerId: userId } }),
    prisma.studioProp.count({ where: { ownerId: userId } }),
    prisma.studioLocation.count({ where: { ownerId: userId } }),
    prisma.studioWorldProfile.count({ where: { ownerId: userId } }),
    prisma.animationProject.findMany({
      where: { ownerId: userId },
      select: { id: true, title: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.studioStoryboard.findMany({
      where: { ownerId: userId },
      select: { id: true, title: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.studioCharacter.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.studioProp.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.studioLocation.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.studioWorldProfile.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.providerCostEvent.findMany({
      where: { userId },
      select: { id: true, createdAt: true, actionType: true, metadataJson: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    readAssetLibraryPreferencesManifest(userId),
    prisma.studioStoryboard.findMany({
      where: { ownerId: userId },
      select: { id: true, title: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.studioCharacter.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
    prisma.studioProp.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
    prisma.studioLocation.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
    prisma.studioWorldProfile.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
  ]);

  const activity: UserStudioActivityItem[] = [];

  for (const row of recentProjects) {
    activity.push({
      id: `project-${row.id}`,
      at: row.createdAt.toISOString(),
      kind: "project_created",
      title: row.title?.trim() || "Motion project",
      href: `/videos/${row.id}`,
    });
  }
  for (const row of recentStoryboards) {
    activity.push({
      id: `storyboard-${row.id}`,
      at: row.createdAt.toISOString(),
      kind: "storyboard_created",
      title: row.title?.trim() || "Storyboard",
      href: `/studio?storyboardId=${encodeURIComponent(row.id)}`,
    });
  }
  for (const row of recentCharacters) {
    activity.push({
      id: `character-${row.id}`,
      at: row.createdAt.toISOString(),
      kind: "character_created",
      title: row.name?.trim() || "Character",
      href: `/studio/characters/${row.id}`,
    });
  }
  for (const row of recentProps) {
    activity.push({
      id: `prop-${row.id}`,
      at: row.createdAt.toISOString(),
      kind: "prop_created",
      title: row.name?.trim() || "Prop",
      href: `/studio/props/${row.id}`,
    });
  }
  for (const row of recentLocations) {
    activity.push({
      id: `location-${row.id}`,
      at: row.createdAt.toISOString(),
      kind: "location_created",
      title: row.name?.trim() || "Location",
      href: `/studio/locations/${row.id}`,
    });
  }
  for (const row of recentWorlds) {
    activity.push({
      id: `world-${row.id}`,
      at: row.createdAt.toISOString(),
      kind: "world_created",
      title: row.name?.trim() || "World",
      href: `/studio/worlds/${row.id}`,
    });
  }

  for (const e of recentCostEvents) {
    const feature = metaFeature(e.metadataJson);
    if (e.actionType === COST_ACTION.VIDU_RENDER) {
      activity.push({
        id: `render-${e.id}`,
        at: e.createdAt.toISOString(),
        kind: "motion_render",
        title: "Motion render",
        href: null,
      });
    } else if (feature === "voice_clone" || e.actionType === COST_ACTION.ELEVENLABS_CLONE) {
      activity.push({
        id: `clone-${e.id}`,
        at: e.createdAt.toISOString(),
        kind: "voice_clone_created",
        title: "Voice clone",
        href: null,
      });
    } else if (feature === "asset_reference_generate") {
      activity.push({
        id: `ref-gen-${e.id}`,
        at: e.createdAt.toISOString(),
        kind: "asset_derived",
        title: "Reference image generated",
        href: "/studio/assets?tab=generated",
      });
    } else if (feature === "asset_derivation") {
      activity.push({
        id: `derive-${e.id}`,
        at: e.createdAt.toISOString(),
        kind: "asset_derived",
        title: "Asset derived from reference",
        href: "/studio/assets",
      });
    } else if (
      feature?.startsWith("scene_image") ||
      e.actionType === COST_ACTION.OPENAI_SCENE_IMAGE
    ) {
      activity.push({
        id: `scene-image-${e.id}`,
        at: e.createdAt.toISOString(),
        kind: "scene_image",
        title: "Scene image generated",
        href: null,
      });
    }
  }

  activity.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  const recentStoryboardItems = recentStoryboards.map((row) => ({
    id: row.id,
    kind: "storyboard" as const,
    title: row.title?.trim() || "Storyboard",
    href: `/studio?storyboardId=${encodeURIComponent(row.id)}`,
    at: row.createdAt.toISOString(),
  }));

  const continueItems = [
    ...continueStoryboards.map((row) => ({
      id: row.id,
      kind: "storyboard" as const,
      title: row.title?.trim() || "Storyboard",
      href: `/studio?storyboardId=${encodeURIComponent(row.id)}`,
      updatedAt: row.updatedAt.toISOString(),
    })),
    ...continueCharacters.map((row) => ({
      id: row.id,
      kind: "character" as const,
      title: row.name?.trim() || "Character",
      href: `/studio/characters/${row.id}`,
      updatedAt: row.updatedAt.toISOString(),
    })),
    ...continueProps.map((row) => ({
      id: row.id,
      kind: "prop" as const,
      title: row.name?.trim() || "Prop",
      href: `/studio/props/${row.id}`,
      updatedAt: row.updatedAt.toISOString(),
    })),
    ...continueLocations.map((row) => ({
      id: row.id,
      kind: "location" as const,
      title: row.name?.trim() || "Location",
      href: `/studio/locations/${row.id}`,
      updatedAt: row.updatedAt.toISOString(),
    })),
    ...continueWorlds.map((row) => ({
      id: row.id,
      kind: "world" as const,
      title: row.name?.trim() || "World",
      href: `/studio/worlds/${row.id}`,
      updatedAt: row.updatedAt.toISOString(),
    })),
  ]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 8);

  return {
    ...insights,
    assetCounts: {
      projects,
      storyboards,
      characters,
      props,
      locations,
      worlds,
    },
    librarySummary: {
      favoritesCount: libraryPrefs.favorites.length,
      voiceFavoritesCount: libraryPrefs.voiceFavorites.length,
    },
    recentActivity: activity.slice(0, 12),
    recentStoryboards: recentStoryboardItems,
    continueWorking: continueItems,
  };
}
