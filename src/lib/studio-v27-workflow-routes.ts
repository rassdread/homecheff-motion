/**
 * V27 preset and film-scene routes.
 * These open existing wizards. They do not create a second prompt builder
 * and they do not spend HC.
 */

import type { StudioAiHomeInspirationId } from "@/lib/studio-ai-home-inspiration";
import { safeStudioProjectReturnTo } from "@/lib/studio-return-to";

export type StudioV27WorkflowId =
  | "PHOTO_TO_VIDEO"
  | "PRODUCT_PHOTO"
  | "IMAGE_EDITING"
  | "ADVERTISEMENT_VIDEO"
  | "SOCIAL_VIDEO"
  | "CHARACTER_ANIMATION"
  | "STORYBOARD_CREATION"
  | "PRESENTATION"
  | "FILM_SCENE_IMAGE"
  | "FILM_SCENE_ANIMATION"
  | "FILM_SCENE_AUDIO"
  | "FILM_STORYBOARD";

export type StudioV27WizardTarget = {
  workflowId: StudioV27WorkflowId;
  href: string;
  /** Existing screen that owns validation and generation. */
  wizardPath: string;
  /** Existing builder the wizard already calls. Not a new prompt engine. */
  promptBuilder: string;
  spendsCreditsOnOpen: false;
};

export type StudioV27RecentWorkflow = {
  id: StudioAiHomeInspirationId;
  href: string;
  at: string;
};

const RECENT_KEY = "hc-studio-v27-recent-workflows";
const RECENT_LIMIT = 6;
const EMPTY_RECENT: StudioV27RecentWorkflow[] = [];
let recentSnapshot: StudioV27RecentWorkflow[] = EMPTY_RECENT;
const recentListeners = new Set<() => void>();

function queryHref(path: string, params: Record<string, string | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    search.set(key, key === "idea" ? trimmed.slice(0, 500) : trimmed.slice(0, 2000));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

function httpUrl(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim() ?? "";
  if (!/^https?:\/\//i.test(trimmed)) return undefined;
  return trimmed;
}

/**
 * Keep the existing preset prompt and append the user's idea as direction.
 * Does not replace the preset text.
 */
export function mergePresetPromptWithUserIdea(presetPrompt: string, idea: string | null | undefined): string {
  const preset = presetPrompt.trim();
  const user = idea?.trim().slice(0, 500) ?? "";
  if (!user) return preset;
  if (!preset) return user;
  if (preset.includes(user)) return preset;
  return `${preset}\n\nUser direction: ${user}`;
}

export function inspirationWizardHref(
  id: StudioAiHomeInspirationId,
  options?: {
    idea?: string | null;
    mediaUrl?: string | null;
    characterId?: string | null;
    returnTo?: string | null;
  },
): StudioV27WizardTarget {
  const idea = options?.idea ?? "";
  const sourceImage = httpUrl(options?.mediaUrl);
  const characterId = options?.characterId?.trim() || undefined;
  const returnTo = safeStudioProjectReturnTo(options?.returnTo) ?? undefined;
  const shared = { idea, sourceImage, characterId, returnTo };

  switch (id) {
    case "photo_video":
      return {
        workflowId: "PHOTO_TO_VIDEO",
        href: queryHref("/studio/photo-video", shared),
        wizardPath: "/studio/photo-video",
        promptBuilder: "PhotoVideoComposer local encode; AI motion uses buildInstantVideoPrompt",
        spendsCreditsOnOpen: false,
      };
    case "product_photo":
      return {
        workflowId: "PRODUCT_PHOTO",
        href: queryHref("/editor/start", { ...shared, experience: "BUSINESS_PRODUCT" }),
        wizardPath: "/editor/start",
        promptBuilder: "buildEditorInstructionPromptV3 / buildEditorFusionPrompt",
        spendsCreditsOnOpen: false,
      };
    case "advertisement":
      return {
        workflowId: "ADVERTISEMENT_VIDEO",
        href: queryHref("/studio/quick-ad", shared),
        wizardPath: "/studio/quick-ad",
        promptBuilder: "generateQuickAdProject",
        spendsCreditsOnOpen: false,
      };
    case "social_video":
      return {
        workflowId: "SOCIAL_VIDEO",
        href: queryHref("/animate/instant", {
          ...shared,
          photoIntent: "photo_to_video",
          experience: "SOCIAL_REELS",
        }),
        wizardPath: "/animate/instant",
        promptBuilder: "buildPhotoIntentPrefillPackage + buildInstantVideoPrompt",
        spendsCreditsOnOpen: false,
      };
    case "animation":
      return {
        workflowId: "CHARACTER_ANIMATION",
        href: sourceImage
          ? queryHref("/motion/start", {
              ...shared,
              photoIntent: "photo_to_video",
              experience: "CREATIVE_ANIMATION",
            })
          : queryHref("/animate/instant", {
              idea,
              returnTo,
              photoIntent: "photo_to_video",
              experience: "CREATIVE_ANIMATION",
            }),
        wizardPath: "/animate/instant",
        promptBuilder: "buildPhotoIntentPrefillPackage + buildInstantVideoPrompt",
        spendsCreditsOnOpen: false,
      };
    case "story":
      return {
        workflowId: "STORYBOARD_CREATION",
        href: queryHref("/studio/storyboards/new", {
          idea,
          returnTo,
          experience: "CREATIVE_STORYBOARD",
        }),
        wizardPath: "/studio/storyboards/new",
        promptBuilder: "StudioProductionBriefFlow + buildScenePromptFromInput",
        spendsCreditsOnOpen: false,
      };
    case "logo":
      return {
        workflowId: "IMAGE_EDITING",
        href: queryHref("/editor/start", { ...shared, experience: "BUSINESS_LOGO_PLACEMENT" }),
        wizardPath: "/editor/start",
        promptBuilder: "buildEditorFusionPrompt",
        spendsCreditsOnOpen: false,
      };
    case "presentation":
      return {
        workflowId: "PRESENTATION",
        href: queryHref("/studio/storyboards/new", {
          idea,
          returnTo,
          experience: "CREATIVE_PRESENTATION",
        }),
        wizardPath: "/studio/storyboards/new",
        promptBuilder: "StudioProductionBriefFlow; no separate presentation provider",
        spendsCreditsOnOpen: false,
      };
  }
}

export function filmSceneWizardLinks(input: {
  projectId: string;
  sceneId: string;
  storyboardId?: string | null;
  idea?: string | null;
  imageUrl?: string | null;
}): StudioV27WizardTarget[] {
  const returnTo =
    safeStudioProjectReturnTo(
      `/studio/projects/${input.projectId}?section=scenes&workflow=film&scene=${input.sceneId}`,
    ) ?? undefined;
  const sourceImage = httpUrl(input.imageUrl);
  const idea = input.idea ?? "";
  const links: StudioV27WizardTarget[] = [
    {
      workflowId: "FILM_SCENE_IMAGE",
      href: queryHref("/editor/start", { idea, sourceImage, returnTo }),
      wizardPath: "/editor/start",
      promptBuilder: "buildEditorInstructionPromptV3",
      spendsCreditsOnOpen: false,
    },
    {
      workflowId: "FILM_SCENE_ANIMATION",
      href: queryHref("/motion/start", {
        idea,
        sourceImage,
        returnTo,
        photoIntent: "photo_to_video",
      }),
      wizardPath: "/animate/instant",
      promptBuilder: "buildPhotoIntentPrefillPackage + buildInstantVideoPrompt",
      spendsCreditsOnOpen: false,
    },
    {
      workflowId: "FILM_SCENE_AUDIO",
      href: queryHref(`/studio/projects/${input.projectId}`, {
        section: "audio",
        workflow: "film",
        scene: input.sceneId,
      }),
      wizardPath: `/studio/projects/${input.projectId}`,
      promptBuilder: "existing film audio section; voice script stays dialogueText",
      spendsCreditsOnOpen: false,
    },
  ];
  const storyboardId = input.storyboardId?.trim();
  if (storyboardId && /^[A-Za-z0-9_-]+$/.test(storyboardId)) {
    links.push({
      workflowId: "FILM_STORYBOARD",
      href: queryHref(`/studio/storyboards/${storyboardId}/production`, { returnTo }),
      wizardPath: `/studio/storyboards/${storyboardId}/production`,
      promptBuilder: "StudioProductionCenter + buildProductionInstructions",
      spendsCreditsOnOpen: false,
    });
  }
  return links;
}

export function rememberStudioWorkflow(entry: { id: StudioAiHomeInspirationId; href: string }): void {
  if (typeof window === "undefined") return;
  try {
    const next: StudioV27RecentWorkflow = { id: entry.id, href: entry.href, at: new Date().toISOString() };
    const previous = readRecentStudioWorkflows().filter((item) => item.id !== entry.id);
    const stored = [next, ...previous].slice(0, RECENT_LIMIT);
    window.sessionStorage.setItem(RECENT_KEY, JSON.stringify(stored));
    recentSnapshot = stored;
    recentListeners.forEach((listener) => listener());
  } catch {
    /* quota or private mode */
  }
}

export function subscribeRecentWorkflows(listener: () => void): () => void {
  recentListeners.add(listener);
  if (typeof window !== "undefined" && recentSnapshot === EMPTY_RECENT) {
    const stored = readRecentStudioWorkflows();
    if (stored.length > 0) {
      recentSnapshot = stored;
      queueMicrotask(() => listener());
    }
  }
  return () => {
    recentListeners.delete(listener);
  };
}

export function getRecentWorkflowSnapshot(): StudioV27RecentWorkflow[] {
  return recentSnapshot;
}

export function readRecentStudioWorkflows(): StudioV27RecentWorkflow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StudioV27RecentWorkflow[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.id === "string" && typeof item.href === "string").slice(0, RECENT_LIMIT);
  } catch {
    return [];
  }
}
