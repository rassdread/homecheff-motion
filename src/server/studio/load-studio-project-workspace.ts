/**
 * SERVER_ONLY — read-only project workspace.
 * Does not create rows, link storyboards, reserve HC, or call providers.
 */

import { prisma } from "@/lib/prisma";
import { characterIdsFromLibraryAssets } from "@/lib/studio-film-characters";
import { parseSubtitleEntriesJson } from "@/lib/studio-subtitle-track";
import {
  assembleProjectWorkspace,
  type ProjectWorkspaceView,
} from "@/lib/studio-project-workspace";
import { studioClassicEditorHref, studioWorkspaceHref } from "@/lib/studio-workspace-href";
import { getCreativeProjectForOwner } from "@/server/studio-library/creative-project-service";
import { getOwnerAudioLibrary } from "@/server/studio/studio-user-audio-library-service";

export async function loadStudioProjectWorkspace(
  ownerId: string,
  projectId: string,
): Promise<ProjectWorkspaceView | null> {
  const project = await getCreativeProjectForOwner(projectId, ownerId);
  if (!project) return null;

  const [assets, wallet] = await Promise.all([
    prisma.studioLibraryAsset.findMany({
      where: { projectId: project.id, ownerId, status: { not: "deleted" } },
      orderBy: { title: "asc" },
      take: 120,
      select: {
        id: true,
        family: true,
        title: true,
        status: true,
        previewUrl: true,
        metadataJson: true,
      },
    }),
    prisma.studioWallet.findUnique({
      where: { userId: ownerId },
      select: { balance: true, reservedBalance: true },
    }),
  ]);

  const characterIds = characterIdsFromLibraryAssets(assets);

  const characters = characterIds.length
    ? await prisma.studioCharacter.findMany({
        where: { ownerId, id: { in: characterIds } },
        select: {
          id: true,
          name: true,
          description: true,
          referenceImageUrl: true,
          voiceProfile: true,
          voiceLanguage: true,
          voiceGender: true,
          voiceDescription: true,
        },
      })
    : [];

  const storyboard = project.storyboardId
    ? await prisma.studioStoryboard.findFirst({
        where: { id: project.storyboardId, ownerId },
        select: {
          id: true,
          voiceNarrationScript: true,
          scenes: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              order: true,
              title: true,
              description: true,
              action: true,
              emotion: true,
              dialogueText: true,
              selectedSceneImageId: true,
              characters: {
                select: {
                  character: {
                    select: { id: true, name: true, referenceImageUrl: true, ownerId: true },
                  },
                },
              },
              sceneImages: {
                orderBy: { createdAt: "desc" },
                take: 8,
                select: { id: true, status: true, imageUrl: true, thumbnailUrl: true, generatedPrompt: true },
              },
            },
          },
          voices: {
            select: { id: true, language: true, status: true, audioUrl: true },
          },
          subtitleTracks: {
            where: { language: "nl" },
            take: 1,
            select: { entriesJson: true },
          },
        },
      })
    : null;

  const animation = project.animationProjectId
    ? await prisma.animationProject.findFirst({
        where: { id: project.animationProjectId, ownerId },
        select: {
          id: true,
          title: true,
          exports: {
            orderBy: { createdAt: "desc" },
            take: 8,
            select: { id: true, status: true, outputVideoUrl: true },
          },
          renderVersions: {
            where: { status: "completed" },
            orderBy: { createdAt: "desc" },
            take: 4,
            select: { id: true, status: true, finalVideoUrl: true, renderVersionNumber: true },
          },
        },
      })
    : null;

  const jobs = storyboard
    ? await prisma.studioGenerationJob.findMany({
        where: { ownerId, storyboardId: storyboard.id },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, capability: true, status: true },
      })
    : [];

  let audioLibraryAvailable = true;
  let music: Array<{ id: string; name: string; audioUrl: string }> = [];
  let soundEffects: Array<{ id: string; name: string; audioUrl: string }> = [];
  try {
    const library = await getOwnerAudioLibrary(ownerId);
    music = library
      .filter((item) => item.kind === "music")
      .map((item) => ({ id: item.id, name: item.name, audioUrl: item.audioUrl }));
    soundEffects = library
      .filter((item) => item.kind === "sfx")
      .map((item) => ({ id: item.id, name: item.name, audioUrl: item.audioUrl }));
  } catch {
    audioLibraryAvailable = false;
  }

  const links = [
    { id: "characters", href: "/studio/characters" },
    { id: "mediaLibrary", href: "/studio/assets/library/generated" },
    { id: "newStoryboard", href: "/studio/storyboards/new" },
    { id: "credits", href: "/account/billing?tab=credits" },
  ];
  if (storyboard) {
    links.push(
      { id: "storyboardEditor", href: studioWorkspaceHref(storyboard.id) },
      { id: "classicStoryboard", href: studioClassicEditorHref(storyboard.id) },
    );
  }
  if (animation) {
    links.push({ id: "animation", href: `/videos/${encodeURIComponent(animation.id)}` });
  }
  if (project.title === "MADE WITH PASSION") {
    links.push({
      id: "characterMasters",
      href: `/studio/projects/${encodeURIComponent(project.id)}/character-masters`,
    });
  }

  const mediaProjectIds = [storyboard?.id, animation?.id].filter((id): id is string => Boolean(id));

  return assembleProjectWorkspace({
    project: {
      id: project.id,
      title: project.title,
      description: project.description,
      status: project.status,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      storyboardLinked: Boolean(storyboard),
      animationLinked: Boolean(animation),
      storyboardId: storyboard?.id ?? null,
      animationProjectId: animation?.id ?? null,
      narratorScript: storyboard?.voiceNarrationScript ?? "",
    },
    characters,
    assets: assets.map((asset) => ({
      id: asset.id,
      family: asset.family,
      title: asset.title,
      status: asset.status,
      previewUrl: asset.previewUrl,
    })),
    scenes: storyboard
      ? storyboard.scenes.map((scene) => {
          const subtitleEntries = parseSubtitleEntriesJson(storyboard.subtitleTracks[0]?.entriesJson);
          const subtitleText = subtitleEntries.find((entry) => entry.sceneId === scene.id)?.text ?? "";
          const selected = scene.sceneImages.find((image) => image.id === scene.selectedSceneImageId) ?? scene.sceneImages[0];
          const imageUrl = selected?.thumbnailUrl || selected?.imageUrl || null;
          return {
            id: scene.id,
            order: scene.order,
            title: scene.title,
            description: scene.description,
            action: scene.action,
            emotion: scene.emotion,
            dialogueText: scene.dialogueText,
            subtitleText,
            imageUrl: imageUrl && imageUrl.trim() ? imageUrl : null,
            imageStatus: selected?.status ?? null,
            characters: scene.characters
              .map((link) => link.character)
              .filter((character) => character.ownerId === ownerId)
              .map((character) => ({
                id: character.id,
                name: character.name,
                referenceImageUrl: character.referenceImageUrl,
              })),
            images: scene.sceneImages.map((image) => ({
              id: image.id,
              status: image.status,
              imageUrl: image.thumbnailUrl || image.imageUrl,
              selected: image.id === scene.selectedSceneImageId,
              generatedPrompt: image.generatedPrompt,
            })),
          };
        })
      : [],
    music,
    soundEffects,
    voiceover: storyboard?.voices ?? [],
    exports: [
      ...(animation?.exports ?? []).map((item) => ({
        id: item.id,
        label: animation?.title || project.title,
        status: item.status,
        downloadUrl: item.outputVideoUrl,
      })),
      ...(animation?.renderVersions ?? []).map((item) => ({
        id: item.id,
        label: `${animation?.title || project.title} ${item.renderVersionNumber}`,
        status: item.status,
        downloadUrl: item.finalVideoUrl,
      })),
    ],
    jobs,
    links,
    mediaProjectIds,
    audioLibraryAvailable,
    hcAvailable: wallet ? Math.max(0, wallet.balance - wallet.reservedBalance) : null,
  });
}
