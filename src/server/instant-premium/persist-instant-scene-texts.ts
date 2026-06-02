import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { InstantTransitionSeconds } from "@/lib/instant-premium-mode-types";
import {
  emptyNormalizedSceneText,
  isStorySceneDurationAllowed,
  MAX_EXTRA_LINES,
  MAX_FINALE_FOOTER_CHARS,
  MAX_HERO_FINALE_TEXT_CHARS,
  MAX_SEQUENCE_LINES,
  MAX_SCENE_LINE_CHARS,
  normalizeStorySceneDurationSeconds,
  parseInstantSceneTexts,
  sanitizeSceneTextField,
  type NormalizedSceneText,
} from "@/lib/story-overlay-templates";

function sanitizeInstantSceneTexts(
  scenes: NormalizedSceneText[],
  imageCount: number,
  fallbackTransitionSeconds: InstantTransitionSeconds
): NormalizedSceneText[] {
  const out: NormalizedSceneText[] = [];
  for (let index = 0; index < imageCount; index += 1) {
    const scene = scenes[index] ?? emptyNormalizedSceneText();
    const isLast = index === imageCount - 1;
    const transitionDurationSeconds =
      isLast ?
        undefined
      : normalizeStorySceneDurationSeconds(
          scene.transitionDurationSeconds ?? scene.durationSeconds,
          fallbackTransitionSeconds
        );
    out.push({
      ...scene,
      heroText: sanitizeSceneTextField(scene.heroText, MAX_SCENE_LINE_CHARS),
      title: sanitizeSceneTextField(scene.title, MAX_SCENE_LINE_CHARS),
      subtitle: sanitizeSceneTextField(scene.subtitle, MAX_SCENE_LINE_CHARS),
      extraLines: scene.extraLines
        .map((line) => sanitizeSceneTextField(line, MAX_SCENE_LINE_CHARS))
        .filter(Boolean)
        .slice(0, MAX_EXTRA_LINES),
      heroFinaleText: sanitizeSceneTextField(scene.heroFinaleText, MAX_HERO_FINALE_TEXT_CHARS),
      finaleFooter:
        isLast ?
          sanitizeSceneTextField(scene.finaleFooter, MAX_FINALE_FOOTER_CHARS)
        : "",
      lines: scene.lines.slice(0, MAX_SEQUENCE_LINES).map((line) => ({
        ...line,
        text: sanitizeSceneTextField(line.text, MAX_SCENE_LINE_CHARS),
      })),
      transitionDurationSeconds,
      durationSeconds: transitionDurationSeconds,
    });
  }
  return out;
}

export type PersistInstantSceneTextsResult =
  | { ok: true; sceneTexts: NormalizedSceneText[] }
  | { ok: false; error: string; status: number };

/** Validate and persist storyboard texts on the project (text rerender editor). */
export async function persistInstantSceneTextsForProject(
  projectId: string,
  rawSceneTexts: unknown
): Promise<PersistInstantSceneTextsResult> {
  const project = await prisma.animationProject.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      instantTransitionSeconds: true,
      images: { select: { id: true }, orderBy: { order: "asc" } },
    },
  });
  if (!project) {
    return { ok: false, error: "Project not found.", status: 404 };
  }

  const imageCount = project.images.length;
  if (imageCount < 1) {
    return { ok: false, error: "Project has no storyboard frames.", status: 400 };
  }

  const instantSceneTextsRaw = parseInstantSceneTexts(rawSceneTexts);
  if (instantSceneTextsRaw.length > imageCount) {
    return {
      ok: false,
      error: "instantSceneTexts cannot exceed image count.",
      status: 400,
    };
  }

  const fallback = (
    project.instantTransitionSeconds === 3 ||
    project.instantTransitionSeconds === 5 ||
    project.instantTransitionSeconds === 8 ?
      project.instantTransitionSeconds
    : 5) as InstantTransitionSeconds;

  for (let index = 0; index < instantSceneTextsRaw.length; index += 1) {
    const scene = instantSceneTextsRaw[index]!;
    if (scene.lines.length > MAX_SEQUENCE_LINES) {
      return {
        ok: false,
        error: `Scene ${index + 1} exceeds ${MAX_SEQUENCE_LINES} sequence lines.`,
        status: 400,
      };
    }
    const transitionDuration =
      scene.transitionDurationSeconds ?? scene.durationSeconds;
    if (
      transitionDuration !== undefined &&
      !isStorySceneDurationAllowed(transitionDuration)
    ) {
      return {
        ok: false,
        error: `Scene ${index + 1} transition duration must be 3, 5, 7, or 8.`,
        status: 400,
      };
    }
  }

  const sceneTexts = sanitizeInstantSceneTexts(
    instantSceneTextsRaw,
    imageCount,
    fallback
  );

  await prisma.animationProject.update({
    where: { id: projectId },
    data: {
      instantSceneTexts: sceneTexts as unknown as Prisma.InputJsonValue,
    },
  });

  return { ok: true, sceneTexts };
}
