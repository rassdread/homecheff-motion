/**
 * V23 creative intent and workspace routing.
 * Classifies a request so image, voice, and animation stay on their
 * existing editors. Only an explicit film request opens a film project.
 */

import { safeStudioProjectReturnTo } from "@/lib/studio-return-to";
import type { WorkspaceSection } from "@/lib/studio-project-workspace";

export const STUDIO_CREATIVE_INTENTS = [
  "IMAGE",
  "IMAGE_EDIT",
  "VIDEO",
  "ANIMATION",
  "CHARACTER",
  "VOICE",
  "AUDIO",
  "FILM",
  "OPEN_EXISTING_PROJECT",
] as const;

export type StudioCreativeIntent = (typeof STUDIO_CREATIVE_INTENTS)[number];

export const STUDIO_WORKFLOWS = [
  "film",
  "image",
  "video",
  "animation",
  "character",
  "voice",
  "audio",
] as const;

export type StudioWorkflow = (typeof STUDIO_WORKFLOWS)[number];

export type CreativeProjectKind = "film" | "animation" | "image" | "project";

const WORKFLOW_SECTION: Record<StudioWorkflow, WorkspaceSection> = {
  film: "overview",
  image: "media",
  video: "scenes",
  animation: "timeline",
  character: "characters",
  voice: "audio",
  audio: "audio",
};

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function has(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

/** Explicit film nouns. "filmpje" stays a short video, not a storyboard. */
export function isExplicitFilmRequest(text: string): boolean {
  if (/\bfilmpje\b/.test(text) && !/\b(promotiefilm|korte film|filmproject|storyboard)\b/.test(text)) {
    return false;
  }
  return (
    /\bpromotiefilm\b/.test(text) ||
    /\bpromotional film\b/.test(text) ||
    /\bkorte film\b/.test(text) ||
    /\bshort film\b/.test(text) ||
    /\bfilmproject\b/.test(text) ||
    /\bstoryboard\b/.test(text) ||
    /\bcomplete film\b/.test(text) ||
    /\bvolledige film\b/.test(text) ||
    /\bmaak een film\b/.test(text) ||
    /\bmake a film\b/.test(text) ||
    /\bfilm van\b/.test(text) ||
    /\ba film\b/.test(text)
  );
}

export function classifyStudioCreativeIntent(prompt: string): StudioCreativeIntent | null {
  const text = normalize(prompt);
  if (!text) return null;

  if (
    has(text, [
      "laatste project",
      "last project",
      "open mijn project",
      "open my project",
      "continue my project",
      "verder met mijn project",
    ])
  ) {
    return "OPEN_EXISTING_PROJECT";
  }

  if (
    has(text, ["voice-over", "voice over", "voiceover", "stem inspreken", "maak een stem", "make a voice"]) &&
    !isExplicitFilmRequest(text)
  ) {
    return "VOICE";
  }

  if (
    has(text, ["muziek", "music", "geluidseffect", "sound effect", "achtergrondmuziek"]) &&
    !isExplicitFilmRequest(text) &&
    !has(text, ["voice-over", "voiceover"])
  ) {
    return "AUDIO";
  }

  if (
    has(text, ["personage", "character", "ontwerp een karakter"]) &&
    !isExplicitFilmRequest(text) &&
    !has(text, ["video", "film", "animatie", "animation"])
  ) {
    return "CHARACTER";
  }

  if (
    has(text, [
      "achtergrond",
      "background",
      "verander alleen",
      "change only",
      "bewerk deze",
      "edit this",
      "pas deze afbeelding",
      "edit this image",
    ]) &&
    !has(text, ["video", "animatie", "animation", "reel"])
  ) {
    return "IMAGE_EDIT";
  }

  if (has(text, ["animatie", "animation", "animate", "tot leven", "bring this photo to life"])) {
    return "ANIMATION";
  }

  if (isExplicitFilmRequest(text)) return "FILM";

  if (
    has(text, [
      "afbeelding",
      "image",
      "foto maken",
      "maak een foto",
      "make a photo",
      "make an image",
      "productfoto",
      "logo",
    ]) &&
    !has(text, ["video", "reel", "animatie", "animation"])
  ) {
    return "IMAGE";
  }

  if (
    has(text, [
      "video van deze foto",
      "video from this photo",
      "photo to video",
      "foto naar video",
      "snelle video",
      "quick video",
      "slideshow",
      "filmpje",
      "maak een video",
      "make a video",
    ])
  ) {
    return "VIDEO";
  }

  return null;
}

export function filmTitleFromPrompt(prompt: string): string {
  const clean = prompt.trim().replace(/\s+/g, " ");
  const sentence = clean.split(/[.!?]/)[0]?.trim() || clean;
  return sentence.slice(0, 160);
}

export function filmDescriptionFromPrompt(prompt: string): string {
  return prompt.trim().slice(0, 4000);
}

/** Stable key for a repeated film create. Matches the existing film request-key rule. */
export function filmRequestKey(prompt: string): string {
  const normalized = prompt.trim().toLowerCase().replace(/\s+/g, " ");
  let hash = 5381;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = ((hash << 5) + hash + normalized.charCodeAt(index)) >>> 0;
  }
  const length = normalized.length.toString(36);
  return `v23film${length}${hash.toString(16).padStart(8, "0")}`.slice(0, 80);
}

export function creativeProjectKind(project: {
  storyboardId?: string | null;
  animationProjectId?: string | null;
  editorCanvasProjectId?: string | null;
}): CreativeProjectKind {
  if (project.storyboardId) return "film";
  if (project.animationProjectId) return "animation";
  if (project.editorCanvasProjectId) return "image";
  return "project";
}

export function parseStudioWorkflow(value: string | null | undefined): StudioWorkflow | null {
  if (!value) return null;
  return STUDIO_WORKFLOWS.includes(value as StudioWorkflow) ? (value as StudioWorkflow) : null;
}

export function workflowDefaultSection(workflow: StudioWorkflow): WorkspaceSection {
  return WORKFLOW_SECTION[workflow];
}

export function workflowPrimarySections(workflow: StudioWorkflow): WorkspaceSection[] {
  switch (workflow) {
    case "image":
      return ["media", "overview", "export"];
    case "video":
      return ["scenes", "media", "timeline", "export"];
    case "animation":
      return ["timeline", "scenes", "media", "export"];
    case "character":
      return ["characters", "media", "overview"];
    case "voice":
    case "audio":
      return ["audio", "scenes", "export"];
    case "film":
      return ["overview", "scenes", "characters", "media", "audio", "timeline", "export"];
  }
}

export function workflowLegacyHref(workflow: StudioWorkflow, projectId: string): string | null {
  const section = workflowDefaultSection(workflow);
  const returnTo = safeStudioProjectReturnTo(
    `/studio/projects/${projectId}?section=${section}&workflow=${workflow}`,
  );
  if (!returnTo) return null;
  const encoded = encodeURIComponent(returnTo);
  switch (workflow) {
    case "image":
      return `/editor/start?returnTo=${encoded}`;
    case "video":
      return `/studio/photo-video?returnTo=${encoded}`;
    case "animation":
      return `/motion/start?returnTo=${encoded}`;
    case "character":
      return `/studio/characters?returnTo=${encoded}`;
    case "film":
    case "voice":
    case "audio":
      return null;
  }
}

export function workspaceSelectionSearch(
  current: string,
  patch: {
    section?: string | null;
    scene?: string | null;
    character?: string | null;
    workflow?: string | null;
  },
): string {
  const params = new URLSearchParams(current.startsWith("?") ? current.slice(1) : current);
  for (const key of ["section", "scene", "character", "workflow"] as const) {
    if (!(key in patch)) continue;
    const value = patch[key];
    if (!value) params.delete(key);
    else params.set(key, value);
  }
  const next = params.toString();
  return next ? `?${next}` : "";
}
